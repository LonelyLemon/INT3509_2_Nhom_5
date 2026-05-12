from datetime import datetime, timezone
from uuid import UUID

from fastapi.security import OAuth2PasswordRequestForm
from loguru import logger

from sqlalchemy import select, or_, func

from fastapi import (APIRouter, BackgroundTasks,
                     Depends, HTTPException, Request)
from fastapi_mail import MessageSchema, MessageType

from src.auth.schemas import (UserCreate, UserResponse, UserUpdate,
                              UserPublicProfile,
                              ForgetPasswordRequest,
                              ResendVerificationRequest,
                              ResetPasswordRequest,
                              RefreshRequest,
                              UserAdminResponse,
                              UserRoleUpdate)
from src.auth.models import User
from src.auth.exceptions import (UserEmailExist, UserNotFound, UserNotVerified,
                                 InvalidToken, InvalidPassword,
                                 UserBanned)
from src.auth.security import hash_password, verify_pw, generate_reset_otp
from src.auth.utils import create_access_token, create_refresh_token, create_verify_token, decode_token
from src.auth.email_service import email_service_basic
from src.auth.dependencies import get_current_user, get_admin_user

from src.core.database import SessionDep
from src.core.redis import get_redis
from src.core.config import settings

OTP_TTL_SECONDS = 900  # 15 minutes

auth_route = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

#----------------------
#      REGISTER
#----------------------
@auth_route.post('/register', response_model=UserResponse)
async def register(user: UserCreate,
                   db: SessionDep,
                   background_tasks: BackgroundTasks):
    email_norm = user.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email_norm))
    existed_user = result.scalar_one_or_none()
    if existed_user:
        raise UserEmailExist()

    hashed_pw = hash_password(user.password)

    new_user = User(
        username=user.username,
        email=email_norm,
        password_hash=hashed_pw,
        is_verified=False
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    verify_token = create_verify_token(email_norm)
    verify_link = f"{settings.FRONTEND_URL}/verify-email?token={verify_token}"

    logger.info(f"--- DEV MODE VERIFICATION LINK ---")
    logger.info(f"Click here to verify: {verify_link}")
    logger.info(f"----------------------------------")

    html_content = f"""
    <h1>Welcome {new_user.username} to MarketMind !</h1>
    <p>Please click on the link below to verify your account:</p>
    <a href="{verify_link}">Verify Here</a>
    <p>This link will be expired in 24 hours.</p>
    """

    message = MessageSchema(
        subject="MarketMind - Account Verification",
        recipients=[new_user.email],
        body=html_content,
        subtype=MessageType.html,
    )

    background_tasks.add_task(email_service_basic.send_mail, message)

    return new_user


#----------------------
#     VERIFY EMAIL
#----------------------
@auth_route.get('/verify-email')
async def verify_email(token: str, db: SessionDep):
    payload = decode_token(token)
    if payload.get("type") != "verification":
        raise InvalidToken()

    email = payload.get("sub")
    if not email:
        raise InvalidToken()

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().one_or_none()

    if not user:
        raise UserNotFound()
    if user.is_verified:
        return {"message": "This email has already been verified"}

    user.is_verified = True
    await db.commit()

    return {"message": "Email Verified Successfully"}


#----------------------
#  RESEND VERIFICATION
#----------------------
@auth_route.post('/resend-verification')
async def resend_verification(payload: ResendVerificationRequest,
                              db: SessionDep,
                              background_tasks: BackgroundTasks):
    email_norm = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email_norm))
    user = result.scalar_one_or_none()

    if not user:
        raise UserNotFound()

    if user.is_verified:
        return {"message": "This account have been verified."}

    verify_token = create_verify_token(email_norm)
    verify_link = f"{settings.FRONTEND_URL}/verify-email?token={verify_token}"

    logger.info(f"--- DEV MODE RESEND VERIFICATION LINK ---")
    logger.info(f"Link: {verify_link}")
    logger.info(f"---------------------------------------")

    html_content = f"""
    <h1>Hello {user.username},</h1>
    <p>You require a resend verification request on MarketMind.</p>
    <p>Click on the link below to re-verify your account:</p>
    <a href="{verify_link}">Verify now</a>
    <p>This link will be expired in 24 hours.</p>
    """

    message = MessageSchema(
        subject="MarketMind - Account Verification Resend",
        recipients=[user.email],
        body=html_content,
        subtype=MessageType.html,
    )

    background_tasks.add_task(email_service_basic.send_mail, message)

    return {"message": "Verification Email have been sent. Check your mail box."}


#----------------------
#       SIGN IN
#----------------------
@auth_route.post('/login')
async def login(db: SessionDep,
                login_request: OAuth2PasswordRequestForm = Depends()):
    email = login_request.username.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise UserNotFound()
    if not verify_pw(login_request.password, user.password_hash):
        raise InvalidPassword()
    if not user.is_verified:
        raise UserNotVerified()
    if user.is_banned:
        raise UserBanned()

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }


#----------------------
#     REFRESH TOKEN
#----------------------
@auth_route.post('/refresh')
async def refresh_token(payload: RefreshRequest, db: SessionDep):
    token_payload = decode_token(payload.refresh_token)
    if not token_payload or token_payload.get("type") != "refresh":
        raise InvalidToken()

    email = token_payload.get("sub")
    if not email:
        raise InvalidToken()

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise UserNotFound()
    if user.is_banned:
        raise UserBanned()

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token}


#----------------------
#        LOGOUT
#----------------------
@auth_route.post('/logout')
async def logout(request: Request, current_user: User = Depends(get_current_user)):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip()
    if token:
        payload = decode_token(token)
        exp = payload.get("exp")
        if exp:
            remaining_ttl = int(exp - datetime.now(timezone.utc).timestamp())
            if remaining_ttl > 0:
                redis_client = get_redis()
                if redis_client:
                    await redis_client.setex(f"token_blacklist:{token}", remaining_ttl, "1")
    return {"message": "Logged out successfully"}


#----------------------
#    GET USER INFO
#----------------------
@auth_route.get('/me', response_model=UserResponse)
async def get_user_info(current_user: User = Depends(get_current_user)):
    return current_user


#----------------------
#     UPDATE USER
#----------------------
@auth_route.patch('/me')
async def update_user_info(payload: UserUpdate,
                           db: SessionDep,
                           current_user: User = Depends(get_current_user)):
    update_data = payload.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(current_user, key, value)

    await db.commit()
    await db.refresh(current_user)

    return current_user


#----------------------
#   FORGET PASSWORD
#----------------------
@auth_route.post('/forget-password')
async def forget_password(db: SessionDep,
                          payload: ForgetPasswordRequest,
                          background_tasks: BackgroundTasks):
    email_norm = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email_norm))
    user = result.scalar_one_or_none()

    # Always return the same response to prevent email enumeration
    if not user:
        return {"message": "If this email is registered, you will receive a reset code shortly."}

    otp = generate_reset_otp()

    redis_client = get_redis()
    if redis_client:
        await redis_client.setex(f"reset_otp:{email_norm}", OTP_TTL_SECONDS, otp)

    logger.info(f"--- DEV MODE RESET OTP ---")
    logger.info(f"Email: {email_norm} | OTP: {otp}")
    logger.info(f"--------------------------")

    html_content = f"""
    <h1>Hello {user.username},</h1>
    <p>Your password reset OTP code is:</p>
    <h2 style="letter-spacing: 4px;">{otp}</h2>
    <p>This code will expire in 15 minutes. Do not share it with anyone.</p>
    """

    message = MessageSchema(
        subject="MarketMind - Password Reset OTP",
        recipients=[user.email],
        body=html_content,
        subtype=MessageType.html,
    )

    background_tasks.add_task(email_service_basic.send_mail, message)

    return {"message": "If this email is registered, you will receive a reset code shortly."}


#----------------------
#    RESET PASSWORD
#----------------------
@auth_route.post('/reset-password')
async def reset_password(payload: ResetPasswordRequest, db: SessionDep):
    email_norm = payload.email.strip().lower()

    redis_client = get_redis()
    if not redis_client:
        raise HTTPException(status_code=503, detail="Service temporarily unavailable.")

    stored_otp = await redis_client.get(f"reset_otp:{email_norm}")
    if not stored_otp or stored_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    result = await db.execute(select(User).where(User.email == email_norm))
    user = result.scalar_one_or_none()
    if not user:
        raise UserNotFound()

    user.password_hash = hash_password(payload.new_password)
    await db.commit()

    await redis_client.delete(f"reset_otp:{email_norm}")

    return {"message": "Password reset successfully."}


#----------------------
#  GET PUBLIC PROFILE
#----------------------
@auth_route.get('/users/{user_id}', response_model=UserPublicProfile)
async def get_public_profile(user_id: UUID, db: SessionDep):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UserNotFound()

    return user


#----------------------
#    BAN / UNBAN USER
#----------------------
@auth_route.patch('/users/{user_id}/ban')
async def ban_user(user_id: UUID,
                   db: SessionDep,
                   current_user: User = Depends(get_admin_user)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot ban themselves.")

    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise UserNotFound()

    target_user.is_banned = not target_user.is_banned
    await db.commit()
    await db.refresh(target_user)

    status = "banned" if target_user.is_banned else "unbanned"
    return {
        "message": f"User {target_user.username} has been {status}.",
        "is_banned": target_user.is_banned
    }


#----------------------
#   LIST ALL USERS
#----------------------
@auth_route.get('/admin/users', response_model=dict)
async def list_users(
    db: SessionDep,
    page: int = 1,
    limit: int = 20,
    search: str = "",
    role: str = "",
    is_banned: str = "",
    current_user: User = Depends(get_admin_user),
):
    offset = (page - 1) * limit
    query = select(User)

    if search:
        pattern = f"%{search}%"
        query = query.where(or_(User.username.ilike(pattern), User.email.ilike(pattern)))
    if role in ("admin", "user"):
        query = query.where(User.role == role)
    if is_banned == "true":
        query = query.where(User.is_banned == True)
    elif is_banned == "false":
        query = query.where(User.is_banned == False)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.order_by(User.created_at.desc()).offset(offset).limit(limit))
    users = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": [UserAdminResponse.model_validate(u) for u in users],
    }


#----------------------
#   CHANGE USER ROLE
#----------------------
@auth_route.patch('/users/{user_id}/role')
async def change_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    db: SessionDep,
    current_user: User = Depends(get_admin_user),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot change their own role.")

    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise UserNotFound()

    target_user.role = payload.role
    await db.commit()
    await db.refresh(target_user)

    return {"message": f"User {target_user.username} is now {payload.role}.", "role": target_user.role}
