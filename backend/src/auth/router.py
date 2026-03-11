from fastapi.security import OAuth2PasswordRequestForm
from loguru import logger

from sqlalchemy import select

from fastapi import (APIRouter, BackgroundTasks,
                     Depends)
from fastapi_mail import MessageSchema, MessageType

from src.auth.schemas import (UserCreate, UserResponse, UserUpdate, 
                              ForgetPasswordRequest,
                              ResendVerificationRequest)
from src.auth.models import User
from src.auth.exceptions import (UserEmailExist, UserNotFound, UserNotVerified,
                                 InvalidToken, InvalidPassword)
from src.auth.security import hash_password, verify_pw, generate_reset_otp
from src.auth.utils import create_access_token, create_refresh_token, create_verify_token, decode_token
from src.auth.email_service import email_service_basic
from src.auth.dependencies import get_current_user

from src.core.database import SessionDep
from src.core.config import settings


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
        username = user.username,
        email = email_norm,
        password_hash = hashed_pw,
        is_verified = False
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
async def verify_email(token: str,
                       db: SessionDep):
    try:
        payload = decode_token(token)
        if payload.get("type") != "verification":
            raise InvalidToken()

        email = payload.get("sub")
        if not email:
            raise UserNotFound()
        
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().one_or_none()

        if not user:
            raise UserNotFound()
        if user.is_verified:
            return {
                "message": "This email has already been verified"
            }
        
        user.is_verified = True
        db.add(user)
        await db.commit()

        return {
            "message": "Email Verified Successfully"
        }
    
    except Exception as e:
        logger.error(f"Email Verification error: {e}")
        raise InvalidToken()

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
    
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }

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
                           current_user: User = Depends(get_current_user)
                           ):
    result = await db.execute(select(User).where(User.email == current_user.email))
    user = result.scalars().one_or_none()
    update_data = payload.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))
    
    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)

    return user

#----------------------
#   FORGET PASSWORD
#----------------------
@auth_route.post('/forget-password')
async def forget_password(db: SessionDep,
                          payload: ForgetPasswordRequest,
                          background_tasks: BackgroundTasks):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        raise UserNotFound()
    
    reset_token = generate_reset_otp()
    reset_link = f"{settings.FRONTEND_URL}/forget-password?token={reset_token}"

    logger.info(f"--- DEV MODE RESET PASSWORD LINK ---")
    logger.info(f"Link: {reset_link}")
    logger.info(f"------------------------------------")

    html_content = f"""
    <h1>Welcome {user.username} to MarketMind!</h1>
    <p>Click on the link below to reset your password:</p>
    <a href="{reset_link}">Reset Password</a>
    <p>This link will be expired in 24 hours.</p>
    """

    message = MessageSchema(
        subject="MarketMind - Password Reset",
        recipients=[user.email],
        body=html_content,
        subtype=MessageType.html,
    )
    
    background_tasks.add_task(email_service_basic.send_mail, message)

    return {
        "message": "Check your email for password reset link"
    }