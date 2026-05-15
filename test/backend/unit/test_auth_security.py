"""
Unit tests for src.auth.security — password hashing and OTP generation.
No DB or network required.
"""
import re

from src.auth.security import hash_password, verify_pw, generate_reset_otp


def test_hash_password_returns_bcrypt_hash():
    hashed = hash_password("MyPassword123")
    assert hashed.startswith("$2b$")


def test_verify_pw_correct_password():
    pw = "TestPassword!42"
    assert verify_pw(pw, hash_password(pw)) is True


def test_verify_pw_wrong_password():
    hashed = hash_password("CorrectPassword")
    assert verify_pw("WrongPassword", hashed) is False


def test_verify_pw_handles_legacy_format():
    """Hashes stored as b'...' string representation must still verify."""
    import bcrypt
    pw = "LegacyPass99"
    raw_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt())
    legacy_format = f"b'{raw_hash.decode()}'"
    assert verify_pw(pw, legacy_format) is True


def test_generate_reset_otp_is_6_digits():
    pattern = re.compile(r"^\d{6}$")
    for _ in range(10):
        otp = generate_reset_otp()
        assert pattern.match(otp), f"OTP {otp!r} does not match 6-digit pattern"
