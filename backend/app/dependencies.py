import secrets
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import get_settings

_bearer_scheme = HTTPBearer(auto_error=False)
# auto_error=False here too: a missing X-API-Key must fall through to the
# "no credentials at all" 401 in get_shortcut_or_current_user below, not
# raise its own separate error before we've had a chance to check for a
# Supabase Bearer token instead.
_api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)

# Supabase Auth signs access tokens with one of two systems:
#  - JWT signing keys (current default): an asymmetric key (ES256 or RS256)
#    whose public half is published at the project's JWKS endpoint. Verified
#    locally with no shared secret involved -- this is what a project shows
#    once it's migrated to (or was created under) the new signing-keys system.
#  - Legacy JWT secret: a single shared HS256 secret, kept only for projects
#    that haven't migrated. See https://supabase.com/docs/guides/auth/signing-keys
#
# Rather than assuming one algorithm, we read the token's own `alg` header
# and verify against whichever mechanism actually issued it.
_ASYMMETRIC_ALGORITHMS = {"ES256", "RS256", "EdDSA"}


@lru_cache
def _jwks_client() -> PyJWKClient:
    settings = get_settings()
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    # PyJWKClient caches fetched keys in memory and transparently refetches
    # the JWKS when it sees an unrecognized `kid`, which is what makes
    # Supabase's zero-downtime key rotation work without a redeploy here.
    return PyJWKClient(jwks_url, cache_keys=True)


class CurrentUser:
    def __init__(self, user_id: str, email: str | None):
        self.user_id = user_id
        self.email = email


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> CurrentUser:
    """
    Verifies the Supabase-issued JWT sent by the frontend as
    `Authorization: Bearer <access_token>`.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    token = credentials.credentials
    settings = get_settings()

    try:
        alg = jwt.get_unverified_header(token).get("alg")

        if alg in _ASYMMETRIC_ALGORITHMS:
            signing_key = _jwks_client().get_signing_key_from_jwt(token).key
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=[alg],
                audience="authenticated",
            )
        elif alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise jwt.InvalidAlgorithmError(
                    "Token uses the legacy HS256 secret, but SUPABASE_JWT_SECRET "
                    "is not configured on this backend"
                )
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            raise jwt.InvalidAlgorithmError(f"Unsupported token algorithm: {alg}")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    return CurrentUser(user_id=user_id, email=payload.get("email"))


def get_shortcut_or_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    api_key: str | None = Depends(_api_key_scheme),
) -> CurrentUser:
    """
    Auth dependency for /api/shortcuts only -- every other router keeps using
    `get_current_user` directly and is completely unaffected by this.

    Accepts either:
      - `Authorization: Bearer <Supabase JWT>` -- verified exactly the same
        way as every other endpoint (delegates straight to
        `get_current_user`, no separate/looser code path). If this header
        is present but the token is invalid or expired, that failure is
        never demoted to a soft-fallback onto the API key.
      - `X-API-Key: <SHORTCUT_API_KEY>` -- only ever consulted when
        `Authorization` is absent entirely. Compared with
        `secrets.compare_digest` to avoid a timing side-channel, and only
        matches if SHORTCUT_API_KEY is actually configured (an unset env
        var must never act as an "any key works" wildcard).

    This does not weaken existing auth: the JWT path is byte-for-byte the
    same function used everywhere else, and the API key path is additive,
    gated on the JWT header being absent rather than merely invalid.
    """
    if credentials is not None:
        return get_current_user(credentials)

    settings = get_settings()
    if (
        api_key
        and settings.shortcut_api_key
        and secrets.compare_digest(api_key, settings.shortcut_api_key)
    ):
        if not settings.shortcut_user_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SHORTCUT_API_KEY is set but SHORTCUT_USER_ID is not -- "
                "set it to your Supabase auth.users id before using /api/shortcuts.",
            )
        return CurrentUser(user_id=settings.shortcut_user_id, email=None)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid credentials -- provide a Supabase Bearer token "
        "or a valid X-API-Key",
    )
