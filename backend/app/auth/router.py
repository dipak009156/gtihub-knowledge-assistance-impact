import json
import logging
import secrets
import urllib.error
import urllib.parse
import urllib.request
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)


class GitHubCallbackRequest(BaseModel):
    code: str


class GitHubTokenRequest(BaseModel):
    token: str


class GitHubUsernameRequest(BaseModel):
    username: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str | None = None


def _format_user(user: User) -> dict:
    return {
        "id": user.id,
        "github_id": user.github_id,
        "username": user.username,
        "name": user.name or user.username,
        "email": user.email,
        "avatar_url": user.avatar_url or f"https://github.com/{user.username}.png",
        "has_token": bool(user.access_token),
    }


def _call_github_api(
    url: str,
    headers: dict[str, str] | None = None,
    data: dict | None = None,
    method: str = "GET",
) -> dict:
    default_headers = {
        "User-Agent": "GitHub-Knowledge-Assistance-App",
        "Accept": "application/vnd.github.v3+json",
    }
    if headers:
        default_headers.update(headers)

    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data).encode("utf-8")
        default_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        url, data=body_bytes, headers=default_headers, method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except Exception:  # noqa: BLE001, S110
            pass
        logger.warning(
            "GitHub API error at %s: status %s body: %s", url, e.code, error_body
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GitHub API error ({e.code}): Could not verify GitHub account or token.",
        ) from None
    except Exception as e:  # noqa: BLE001
        logger.warning("GitHub connection error at %s: %s", url, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to communicate with GitHub API: {e}",
        ) from None


@router.get("/github/url")
def get_github_auth_url():
    """Return the GitHub OAuth authorization URL if configured."""
    client_id = settings.github_client_id.strip()
    if not client_id:
        return {
            "configured": False,
            "url": None,
            "client_id": None,
        }

    redirect_uri = settings.github_redirect_uri
    scope = "read:user,user:email,repo"
    state = secrets.token_hex(16)
    auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={urllib.parse.quote(client_id)}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"scope={urllib.parse.quote(scope)}&"
        f"state={urllib.parse.quote(state)}"
    )
    return {
        "configured": True,
        "url": auth_url,
        "client_id": client_id,
    }


@router.post("/github/callback")
def github_callback(
    payload: GitHubCallbackRequest, db: Annotated[Session, Depends(get_db)]
):
    """Exchange OAuth authorization code for GitHub access token and authenticate user."""
    client_id = settings.github_client_id.strip()
    client_secret = settings.github_client_secret.strip()

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub OAuth is not configured on the server. Please connect with your GitHub Token or Username.",
        )

    # 1. Exchange code for access token
    token_url = "https://github.com/login/oauth/access_token"
    token_payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": payload.code,
    }
    token_headers = {"Accept": "application/json"}
    token_data = _call_github_api(
        token_url, headers=token_headers, data=token_payload, method="POST"
    )

    access_token = token_data.get("access_token")
    if not access_token:
        error_desc = token_data.get(
            "error_description", "Failed to obtain GitHub access token."
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_desc)

    # 2. Fetch GitHub User profile
    gh_user = _call_github_api(
        "https://api.github.com/user",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    return _sync_github_user(db, gh_user, access_token)


@router.post("/github/token")
def github_token_login(
    payload: GitHubTokenRequest, db: Annotated[Session, Depends(get_db)]
):
    """Authenticate using a GitHub Personal Access Token (classic or fine-grained)."""
    token = payload.token.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid GitHub Personal Access Token.",
        )

    # Verify token with GitHub API
    gh_user = _call_github_api(
        "https://api.github.com/user",
        headers={"Authorization": f"Bearer {token}"},
    )

    return _sync_github_user(db, gh_user, token)


@router.post("/github/user")
def github_username_login(
    payload: GitHubUsernameRequest, db: Annotated[Session, Depends(get_db)]
):
    """Instant login using public GitHub profile verification."""
    username = payload.username.strip().lstrip("@")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid GitHub username.",
        )

    # Verify username with GitHub API
    gh_user = _call_github_api(f"https://api.github.com/users/{username}")

    return _sync_github_user(db, gh_user, None)


def _sync_github_user(db: Session, gh_user: dict, access_token: str | None) -> dict:
    username = gh_user.get("login")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve GitHub username.",
        )

    github_id = str(gh_user.get("id"))
    email = gh_user.get("email")
    name = gh_user.get("name") or username
    avatar_url = gh_user.get("avatar_url") or f"https://github.com/{username}.png"

    user = (
        db.query(User)
        .filter((User.github_id == github_id) | (User.username == username))
        .first()
    )

    if not user:
        user = User(
            github_id=github_id,
            username=username,
            name=name,
            email=email,
            avatar_url=avatar_url,
            access_token=access_token,
        )
        db.add(user)
    else:
        user.github_id = github_id
        user.username = username
        if name:
            user.name = name
        if email:
            user.email = email
        if avatar_url:
            user.avatar_url = avatar_url
        if access_token:
            user.access_token = access_token

    db.commit()
    db.refresh(user)

    # Issue developer session token
    session_token = f"gka_gh_{user.id}_{secrets.token_hex(20)}"

    return {
        "user": _format_user(user),
        "token": session_token,
    }


@router.post("/register")
def register(payload: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    """Register a new developer account with email."""
    if not payload.name.strip() or not payload.email.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name and email are required.",
        )

    username = payload.email.split("@")[0].replace(".", "_")
    existing = (
        db.query(User)
        .filter((User.email == payload.email) | (User.username == username))
        .first()
    )
    if existing:
        return {
            "user": _format_user(existing),
            "token": f"gka_sess_{existing.id}_{secrets.token_hex(20)}",
        }

    user = User(
        username=username,
        name=payload.name,
        email=payload.email,
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={username}",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "user": _format_user(user),
        "token": f"gka_sess_{user.id}_{secrets.token_hex(20)}",
    }


@router.post("/login")
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    """Log in with email or username."""
    user = (
        db.query(User)
        .filter((User.email == payload.email) | (User.username == payload.email))
        .first()
    )
    if not user:
        # Create user smoothly if first time logging in
        username = payload.email.split("@")[0]
        user = User(
            username=username,
            email=payload.email,
            name=username,
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={username}",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "user": _format_user(user),
        "token": f"gka_sess_{user.id}_{secrets.token_hex(20)}",
    }


@router.get("/me")
def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
):
    """Return the profile of the current authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        # Return default developer user if available
        user = db.query(User).order_by(User.updated_at.desc()).first()
        if user:
            return _format_user(user)
        return {
            "id": 0,
            "username": "guest",
            "name": "Guest Developer",
            "email": None,
            "avatar_url": None,
            "has_token": False,
        }

    token = authorization.replace("Bearer ", "").strip()
    # Token format: gka_gh_{id}_{hex} or gka_sess_{id}_{hex}
    parts = token.split("_")
    if len(parts) >= 3 and parts[2].isdigit():
        user_id = int(parts[2])
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return _format_user(user)

    user = db.query(User).order_by(User.updated_at.desc()).first()
    if user:
        return _format_user(user)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
    )


@router.get("/github/repos")
def list_user_github_repos(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
):
    """List GitHub repositories belonging to the logged-in GitHub user."""
    user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        parts = token.split("_")
        if len(parts) >= 3 and parts[2].isdigit():
            user = db.query(User).filter(User.id == int(parts[2])).first()

    if not user:
        user = (
            db.query(User)
            .filter(User.github_id.isnot(None))
            .order_by(User.updated_at.desc())
            .first()
        )

    if not user or not user.username:
        return []

    headers = {}
    if user.access_token:
        headers["Authorization"] = f"Bearer {user.access_token}"
        url = "https://api.github.com/user/repos?sort=updated&per_page=30"
    else:
        url = f"https://api.github.com/users/{user.username}/repos?sort=updated&per_page=30"

    try:
        repos = _call_github_api(url, headers=headers)
        return [
            {
                "name": r.get("name"),
                "full_name": r.get("full_name"),
                "url": r.get("html_url"),
                "description": r.get("description"),
                "is_private": r.get("private", False),
                "stars": r.get("stargazers_count", 0),
                "language": r.get("language"),
            }
            for r in repos
            if isinstance(r, dict) and "name" in r
        ]
    except Exception as e:  # noqa: BLE001
        logger.warning("Could not fetch GitHub repos for %s: %s", user.username, e)
        return []
