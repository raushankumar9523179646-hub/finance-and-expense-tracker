"""Google OAuth 2.0 helpers (authorization code flow)."""

import urllib.parse

import requests


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def google_oauth_ready(cfg: dict) -> bool:
    return bool(
        cfg.get("GOOGLE_CLIENT_ID")
        and cfg.get("GOOGLE_CLIENT_SECRET")
        and cfg.get("GOOGLE_OAUTH_REDIRECT_URI")
    )


def google_authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
    q = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
    )
    return f"{GOOGLE_AUTH_URL}?{q}"


def google_exchange_code(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
    r = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        headers={"Accept": "application/json"},
        timeout=30,
    )
    try:
        return r.json()
    except Exception:
        return {"error": "invalid_response", "error_description": r.text[:500]}


def google_fetch_profile(access_token: str) -> dict:
    r = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    try:
        return r.json()
    except Exception:
        return {}
