import bcrypt
import secrets

def hash_password(password: str):
    bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(password=bytes, salt=salt)
    return hashed_pw.decode('utf-8')

def verify_pw(password: str, hashed_password: str) -> bool:
    # Handle old format where hash was stored as string representation (b'...')
    if hashed_password.startswith("b'") and hashed_password.endswith("'"):
        hashed_password = hashed_password[2:-1]
    
    result = bcrypt.checkpw(
        password=password.encode('utf-8'), 
        hashed_password=hashed_password.encode('utf-8')
    )
    return result

def generate_reset_otp() -> str:
    
    return f"{secrets.randbelow(1000000):06d}"