from services.supabase_service import supabase
from services.local_db import (
    local_get_user_by_email, local_get_user_by_id,
    local_create_user
)


def get_user_by_email(email: str) -> dict | None:
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", email).execute()
            data = res.data
            return data[0] if data else None
        except Exception as e:
            print(f"Supabase get_user_by_email error: {e}")
            return None
    return local_get_user_by_email(email)


def get_user_by_id(user_id: str) -> dict | None:
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("id", user_id).execute()
            data = res.data
            return data[0] if data else None
        except Exception as e:
            print(f"Supabase get_user_by_id error: {e}")
            return None
    return local_get_user_by_id(user_id)


def create_user(email: str, name: str, password_hash: str | None, provider: str = "email") -> dict | None:
    if supabase:
        try:
            data = {"email": email, "name": name, "password_hash": password_hash, "provider": provider}
            res = supabase.table("users").insert(data).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"Supabase create_user error: {e}")
            return None
    return local_create_user(email, name, password_hash, provider)
