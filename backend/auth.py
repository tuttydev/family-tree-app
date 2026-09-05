import os
from datetime import datetime, timedelta, timezone
from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from database import get_db
from models import Permission, User, Role, user_roles, role_permissions


# ============================================================
# AUTHENTICATION CONFIGURATION
# ============================================================

JWT_ALGORITHM = "HS256"

JWT_SECRET_KEY = os.getenv("FAMILYTREE_SECRET_KEY")

if not JWT_SECRET_KEY:
    JWT_SECRET_KEY = "adebunGOKE4040miniyami"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

password_hasher = PasswordHash.recommended()

bearer_scheme = HTTPBearer(auto_error=False)


# ============================================================
# PASSWORD FUNCTIONS
# ============================================================

def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(
    password: str,
    password_hash: str,
) -> bool:
    return password_hasher.verify(
        password,
        password_hash,
    )


# ============================================================
# JWT FUNCTIONS
# ============================================================

def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)

    expires = now + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user.id),
        "username": user.username,
        "is_super_admin": bool(user.is_super_admin),
        "iat": now,
        "exp": expires,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again.",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )


# ============================================================
# CURRENT USER
# ============================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(
        credentials.credentials
    )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account is inactive.",
        )

    return user


# ============================================================
# PERMISSION CHECKING
# ============================================================

def user_has_permission(
    db: Session,
    user: User,
    permission_code: str,
) -> bool:

    # Super Administrator always has full access.
    if user.is_super_admin:
        return True

    result = (
        db.query(Permission.id)
        .join(
            role_permissions,
            role_permissions.c.permission_id
            == Permission.id,
        )
        .join(
            user_roles,
            user_roles.c.role_id
            == role_permissions.c.role_id,
        )
        .filter(
            user_roles.c.user_id == user.id,
            Permission.code == permission_code,
        )
        .first()
    )

    return result is not None


def require_permission(
    permission_code: str,
) -> Callable:

    def permission_dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:

        if not user_has_permission(
            db,
            current_user,
            permission_code,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permission required: "
                    f"{permission_code}"
                ),
            )

        return current_user

    return permission_dependency


# ============================================================
# SUPER ADMINISTRATOR CHECK
# ============================================================

def require_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:

    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Administrator access required.",
        )

    return current_user