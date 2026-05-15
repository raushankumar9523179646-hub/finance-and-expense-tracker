"""Signed bearer tokens + password helpers for API auth."""

import os

from typing import Optional

from flask import current_app, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from .models import User, db

TOKEN_MAX_AGE_SECONDS = int(os.environ.get("AUTH_TOKEN_MAX_AGE", 60 * 60 * 24 * 14))


def hash_password(password: str) -> str:
    """pbkdf2:sha256 is widely compatible; scrypt can fail on some Windows/Python setups."""
    return generate_password_hash(password, method="pbkdf2:sha256")


def verify_password(pw_hash: Optional[str], password: str) -> bool:
    if not pw_hash:
        return False
    return check_password_hash(pw_hash, password)


def create_token(app, user_id: int) -> str:
    s = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="api-auth-user")
    return s.dumps({"sub": int(user_id)})


def verify_token(app, token: str) -> Optional[int]:
    if not token:
        return None
    try:
        s = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="api-auth-user")
        data = s.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
        uid = data.get("sub")
        return int(uid) if uid is not None else None
    except (BadSignature, SignatureExpired, ValueError, TypeError):
        return None


def _extract_bearer_token() -> Optional[str]:
    h = request.headers.get("Authorization", "")
    if h.lower().startswith("bearer "):
        return h[7:].strip() or None
    return None


def get_current_user_optional():
    """Returns User if valid Bearer token present, else None."""
    token = _extract_bearer_token()
    if not token:
        return None
    uid = verify_token(current_app._get_current_object(), token)
    if not uid:
        return None
    return User.query.get(uid)


def is_public_auth_path(req_path: str) -> bool:
    p = (req_path or "").rstrip("/")
    public_suffixes = (
        "/auth/register",
        "/auth/login",
        "/auth/google/start",
        "/auth/google/callback",
        "/auth/google/enabled",
    )
    return any(p.endswith(s) for s in public_suffixes)


def attach_user_or_error():
    """
    Runs before API routes (except OPTIONS and public auth paths).
    Sets g.current_user or returns a Flask response tuple.
    """
    if request.method == "OPTIONS":
        return None
    if is_public_auth_path(request.path):
        return None
    user = get_current_user_optional()
    if not user:
        return jsonify({"error": "Unauthorized: missing or invalid token"}), 401
    g.current_user = user
    return None


def seed_new_user_defaults(user_id: int):
    """Default categories + one account for a newly registered user."""
    from .models import Account, Category

    samples = [
        ("Salary", "income", "#22c55e"),
        ("Freelance", "income", "#4ade80"),
        ("Rent", "expense", "#ef4444"),
        ("Groceries", "expense", "#f97316"),
        ("Transport", "expense", "#eab308"),
        ("Utilities", "expense", "#3b82f6"),
        ("Entertainment", "expense", "#a855f7"),
        ("Healthcare", "expense", "#ec4899"),
        ("Misc", "expense", "#64748b"),
    ]
    for name, flow, color in samples:
        db.session.add(Category(name=name, flow=flow, color=color, user_id=user_id))
    db.session.add(Account(name="Main checking", account_type="checking", user_id=user_id))
