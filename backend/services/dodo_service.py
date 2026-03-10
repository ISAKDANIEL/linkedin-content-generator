"""
Dodo Payments integration service.
Products:
  pdt_0Na7FjdXD1pQPf21Coma5 → ₹59 → 30 credits
  pdt_0Na7IIoUe4whzt1vb7sbT → ₹149 → 90 credits
"""
import os
import hmac
import hashlib
import base64
import requests

DODO_BASE_URL = "https://live.dodopayments.com"

PRODUCTS = {
    "pdt_0Na7FjdXD1pQPf21Coma5": {"price": 59,  "credits": 30, "name": "Starter Pack",  "label": "30 Credits"},
    "pdt_0Na7IIoUe4whzt1vb7sbT": {"price": 149, "credits": 90, "name": "Pro Pack",      "label": "90 Credits"},
}


def create_payment_link(product_id: str, user_email: str, user_name: str, user_id: str) -> dict:
    """
    Call Dodo Payments API to create a hosted payment link.
    Returns the full API response dict (includes payment_link URL).
    """
    api_key = os.getenv("DODO_API_KEY", "")
    if not api_key:
        raise RuntimeError("DODO_API_KEY is not configured on the server")

    if product_id not in PRODUCTS:
        raise ValueError(f"Unknown product_id: {product_id}")

    frontend_url = os.getenv("FRONTEND_URL", "https://makepost.pro")
    return_url = f"{frontend_url}/payment/success"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Minimal payload — billing details entered by customer on Dodo's hosted page
    payload = {
        "billing": {
            "city": "Mumbai",
            "country": "IN",
            "state": "MH",
            "street": "NA",
            "zipcode": "400001",
        },
        "customer": {
            "email": user_email or "customer@makepost.pro",
            "name": user_name or user_email or "Customer",
        },
        "product_cart": [
            {"product_id": product_id, "quantity": 1}
        ],
        "payment_link": True,
        "return_url": return_url,
        "metadata": {
            "user_id": str(user_id),
            "product_id": product_id,
        },
    }

    try:
        resp = requests.post(
            f"{DODO_BASE_URL}/payments",
            json=payload,
            headers=headers,
            timeout=20,
        )
    except requests.exceptions.ConnectionError as e:
        raise RuntimeError(f"Cannot connect to Dodo API: {e}") from e
    except requests.exceptions.Timeout:
        raise RuntimeError("Dodo API request timed out (>20s)") from None
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Dodo API request failed: {e}") from e

    print(f"[Dodo] Status: {resp.status_code} | Body: {resp.text[:800]}")

    if not resp.ok:
        # Try to extract Dodo's error message for a helpful response
        try:
            err_body = resp.json()
            err_msg = err_body.get("message") or err_body.get("error") or resp.text[:300]
        except Exception:
            err_msg = resp.text[:300]
        raise RuntimeError(f"Dodo API {resp.status_code}: {err_msg}")

    try:
        data = resp.json()
    except Exception as e:
        raise RuntimeError(f"Dodo API returned non-JSON: {resp.text[:200]}") from e

    return data


def verify_webhook_signature(
    payload_body: bytes,
    webhook_id: str,
    webhook_timestamp: str,
    webhook_signature: str,
) -> bool:
    """
    Verify a Dodo Payments webhook using Standard Webhooks spec (Svix-compatible).
    Header names: webhook-id, webhook-timestamp, webhook-signature
    Secret format: whsec_<base64>
    """
    secret = os.getenv("DODO_WEBHOOK_SECRET", "")
    if not secret:
        print("WARNING: DODO_WEBHOOK_SECRET not set — skipping webhook verification")
        return True

    try:
        if secret.startswith("whsec_"):
            secret = secret[len("whsec_"):]
        secret_bytes = base64.b64decode(secret)

        to_sign = f"{webhook_id}.{webhook_timestamp}.{payload_body.decode('utf-8')}".encode("utf-8")
        computed = base64.b64encode(
            hmac.new(secret_bytes, to_sign, hashlib.sha256).digest()
        ).decode("utf-8")

        # Signature header may be "v1,<sig1> v1,<sig2>" for rotation support
        provided = [s.split(",", 1)[-1] for s in webhook_signature.split(" ") if s]
        return any(hmac.compare_digest(computed, sig) for sig in provided)

    except Exception as e:
        print(f"Webhook signature error: {e}")
        return False


def credits_for_product(product_id: str) -> int:
    """Return how many credits the product grants."""
    return PRODUCTS.get(product_id, {}).get("credits", 0)
