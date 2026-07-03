from functools import lru_cache

from supabase import create_client, Client

from app.config import get_settings


@lru_cache
def get_service_client() -> Client:
    """
    Server-side Supabase client authenticated with the service role key.
    This bypasses Row Level Security, so it must never be exposed to the
    frontend — it's only used from within the backend (scheduler worker,
    history logging, reading another user's... no: this backend controls a
    single physical AC, so in practice there is one household of users, but
    RLS still scopes each user's rows to themselves for safety).
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
