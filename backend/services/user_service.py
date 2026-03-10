from services.supabase_service import supabase
from services.local_db import (
    local_get_user_by_email, local_get_user_by_id,
    local_create_user,
    local_get_credits, local_add_credits, local_deduct_credit,
    local_save_payment,
)


def get_user_by_email(email: str) -> dict | None:
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", email).execute()
            data = res.data
            return data[0] if data else None
        except Exception as e:
            print(f"Supabase get_user_by_email error (falling back to local): {e}")
    return local_get_user_by_email(email)


def get_user_by_id(user_id: str) -> dict | None:
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("id", user_id).execute()
            data = res.data
            return data[0] if data else None
        except Exception as e:
            print(f"Supabase get_user_by_id error (falling back to local): {e}")
    return local_get_user_by_id(user_id)


def create_user(email: str, name: str, password_hash: str | None, provider: str = "email") -> dict | None:
    if supabase:
        try:
            data = {"email": email, "name": name, "password_hash": password_hash, "provider": provider, "credits": 3}
            res = supabase.table("users").insert(data).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"Supabase create_user error (falling back to local): {e}")
    return local_create_user(email, name, password_hash, provider)


# ── Credits ───────────────────────────────────────────────────────────────────
def get_credits(user_id: str) -> int:
    if supabase:
        try:
            res = supabase.table("users").select("credits").eq("id", user_id).execute()
            if res.data:
                return res.data[0].get("credits") or 0
        except Exception as e:
            print(f"Supabase get_credits error (falling back to local): {e}")
    return local_get_credits(user_id)


def add_credits(user_id: str, amount: int) -> int:
    """Add credits; returns new balance."""
    if supabase:
        try:
            current = get_credits(user_id)
            new_balance = current + amount
            supabase.table("users").update({"credits": new_balance}).eq("id", user_id).execute()
            return new_balance
        except Exception as e:
            print(f"Supabase add_credits error (falling back to local): {e}")
    return local_add_credits(user_id, amount)


def deduct_credit(user_id: str) -> bool:
    """Deduct 1 credit; returns True if successful."""
    if supabase:
        try:
            current = get_credits(user_id)
            if current < 1:
                return False
            supabase.table("users").update({"credits": current - 1}).eq("id", user_id).execute()
            return True
        except Exception as e:
            print(f"Supabase deduct_credit error (falling back to local): {e}")
    return local_deduct_credit(user_id)


def save_payment_record(user_id: str, payment_id: str, product_id: str, credits_added: int) -> bool:
    """Record payment; returns False if already processed (idempotent)."""
    if supabase:
        try:
            existing = supabase.table("payments").select("id").eq("payment_id", payment_id).execute()
            if existing.data:
                return False
            supabase.table("payments").insert({
                "user_id": user_id,
                "payment_id": payment_id,
                "product_id": product_id,
                "credits_added": credits_added,
                "status": "succeeded",
            }).execute()
            return True
        except Exception as e:
            print(f"Supabase save_payment_record error (falling back to local): {e}")
    return local_save_payment(user_id, payment_id, product_id, credits_added)
