from fastapi import HTTPException, status


class InvalidToken(HTTPException):
    def __init__(self):
        super().__init__(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail = "Invalid Token",
            headers={"WWW-Authenticate": "Bearer"}
        )


class InvalidPassword(HTTPException):
    def __init__(self):
        super().__init__(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = "Invalid Password"
        )


class UserNotVerified(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unverified Email. Please check your email again.",
        )


class UserEmailExist(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="User email already exist.",
        )


class UserNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )


class UserNotAuthenticated(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated."
        )