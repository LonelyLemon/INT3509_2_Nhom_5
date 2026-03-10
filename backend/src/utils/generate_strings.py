import random
import string


def generate_random_string(length=6):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for _ in range(length))


def generate_unique_id(prefix: str, length: int=12):
    random_part = ''.join(random.choices(
        string.ascii_letters + string.digits, 
        k=length
    ))
    return f"{prefix}_{random_part}"