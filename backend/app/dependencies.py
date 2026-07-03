from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import get_settings

_bearer_scheme = HTTPBearer(auto_error=False)

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
