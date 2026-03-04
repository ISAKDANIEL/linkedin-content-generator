from services.supabase_service import supabase
from services.local_db import (
    local_save_history, local_get_history,
    local_get_history_item, local_delete_history
)


def save_history(user_id: str, title: str, tone: str, audience: str, result: dict) -> dict | None:
    if supabase:
        try:
            data = {"user_id": user_id, "title": title, "tone": tone, "audience": audience, "result": result}
            res = supabase.table("search_history").insert(data).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"Supabase save_history error: {e}, falling back to local")
    return local_save_history(user_id, title, tone, audience, result)


def get_history(user_id: str) -> list:
    if supabase:
        try:
            res = (
                supabase.table("search_history")
                .select("id, title, tone, audience, created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(50)
                .execute()
            )
            return res.data or []
        except Exception as e:
            print(f"Supabase get_history error: {e}, falling back to local")
    return local_get_history(user_id)


def get_history_item(history_id: str, user_id: str) -> dict | None:
    if supabase:
        try:
            res = (
                supabase.table("search_history")
                .select("*")
                .eq("id", history_id)
                .eq("user_id", user_id)
                .execute()
            )
            data = res.data
            return data[0] if data else None
        except Exception as e:
            print(f"Supabase get_history_item error: {e}, falling back to local")
    return local_get_history_item(history_id, user_id)


def delete_history(history_id: str, user_id: str) -> bool:
    if supabase:
        try:
            supabase.table("search_history").delete().eq("id", history_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            print(f"Supabase delete_history error: {e}, falling back to local")
    return local_delete_history(history_id, user_id)
