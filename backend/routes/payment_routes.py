"""
Payment routes — Dodo Payments + UPI QR integration.
Endpoints:
  GET  /api/credits                  → user's current credit balance
  GET  /api/payment/upi-config       → merchant UPI ID + name (public)
  POST /api/payment/upi-submit       → submit UTR after UPI payment
  POST /api/payment/create-checkout  → create Dodo payment link (auth required)
  POST /api/payment/webhook          → Dodo webhook (no auth, signature verified)
"""
import os
import json
from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required
from services.dodo_service import (
    create_payment_link,
    verify_webhook_signature,
    credits_for_product,
    PRODUCTS,
)
from services.user_service import (
    get_user_by_id,
    get_credits,
    add_credits,
    save_payment_record,
)

MERCHANT_UPI_ID  = os.getenv("MERCHANT_UPI_ID", "")
MERCHANT_NAME    = os.getenv("MERCHANT_NAME", "MakePost")

payment_bp = Blueprint("payment", __name__)


# ── GET /api/credits ──────────────────────────────────────────────────────────
@payment_bp.route("/api/credits", methods=["GET"])
@token_required
def get_user_credits(current_user):
    user_id = current_user["sub"]
    balance = get_credits(user_id)
    return jsonify({"credits": balance}), 200


# ── GET /api/payment/upi-config ───────────────────────────────────────────────
@payment_bp.route("/api/payment/upi-config", methods=["GET"])
def upi_config():
    """Return merchant UPI details (public — safe to expose)."""
    return jsonify({
        "upi_id": MERCHANT_UPI_ID,
        "merchant_name": MERCHANT_NAME,
        "configured": bool(MERCHANT_UPI_ID and MERCHANT_UPI_ID != "yourname@upi"),
    }), 200


# ── POST /api/payment/upi-submit ──────────────────────────────────────────────
@payment_bp.route("/api/payment/upi-submit", methods=["POST"])
@token_required
def upi_submit(current_user):
    """
    User submits their UPI Transaction Reference Number (UTR) after paying.
    Credits are granted immediately; the UTR is stored for admin verification.
    """
    data       = request.get_json() or {}
    product_id = data.get("product_id", "").strip()
    utr        = data.get("utr", "").strip()

    if not product_id or product_id not in PRODUCTS:
        return jsonify({"error": "Invalid product"}), 400
    if not utr or len(utr) < 6:
        return jsonify({"error": "Please enter a valid UTR / Transaction ID"}), 400

    user_id = current_user["sub"]
    credits  = credits_for_product(product_id)
    product  = PRODUCTS[product_id]

    # Idempotency: use UTR as payment_id so same UTR can't be reused
    saved = save_payment_record(user_id, f"upi_{utr}", product_id, credits)
    if not saved:
        return jsonify({"error": "This Transaction ID has already been used"}), 409

    new_balance = add_credits(user_id, credits)
    print(f"UPI payment: user={user_id} utr={utr} product={product_id} +{credits} credits → balance={new_balance}")

    return jsonify({
        "success": True,
        "credits_added": credits,
        "credits_remaining": new_balance,
        "message": f"{credits} credits added to your account!",
    }), 200


# ── GET /api/payment/products ─────────────────────────────────────────────────
@payment_bp.route("/api/payment/products", methods=["GET"])
def list_products():
    """Return available credit packs (public)."""
    return jsonify({"products": [
        {"product_id": pid, **info}
        for pid, info in PRODUCTS.items()
    ]}), 200


# ── POST /api/payment/create-checkout ────────────────────────────────────────
@payment_bp.route("/api/payment/create-checkout", methods=["POST"])
@token_required
def create_checkout(current_user):
    data = request.get_json() or {}
    product_id = data.get("product_id", "").strip()

    if product_id not in PRODUCTS:
        return jsonify({"error": "Invalid product_id"}), 400

    user_id = current_user["sub"]
    user_email = current_user.get("email", "")
    user_name = current_user.get("name", "")

    try:
        result = create_payment_link(product_id, user_email, user_name, user_id)
        payment_link = result.get("payment_link") or result.get("checkout_url") or result.get("url")
        payment_id = result.get("payment_id") or result.get("id")

        if not payment_link:
            print(f"Dodo response missing payment_link: {result}")
            return jsonify({"error": "Payment provider did not return a checkout URL"}), 502

        return jsonify({
            "payment_link": payment_link,
            "payment_id": payment_id,
        }), 200

    except RuntimeError as e:
        print(f"Payment creation error: {e}")
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        print(f"Unexpected payment error: {e}")
        return jsonify({"error": "Failed to create payment session"}), 500


# ── POST /api/payment/webhook ─────────────────────────────────────────────────
@payment_bp.route("/api/payment/webhook", methods=["POST"])
def payment_webhook():
    """
    Dodo Payments webhook — Standard Webhooks format.
    Headers: webhook-id, webhook-timestamp, webhook-signature
    """
    payload_body = request.get_data()

    webhook_id        = request.headers.get("webhook-id", "")
    webhook_timestamp = request.headers.get("webhook-timestamp", "")
    webhook_signature = request.headers.get("webhook-signature", "")

    # Verify signature
    if not verify_webhook_signature(payload_body, webhook_id, webhook_timestamp, webhook_signature):
        print("Webhook signature verification FAILED")
        return jsonify({"error": "Invalid signature"}), 401

    try:
        event = json.loads(payload_body)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    event_type = event.get("type", "")
    print(f"Dodo webhook received: {event_type}")

    # Handle payment.succeeded (one-time payment)
    if event_type == "payment.succeeded":
        _handle_payment_succeeded(event.get("data", {}))

    # Also handle subscription_payment.succeeded if you ever add subscriptions
    elif event_type == "subscription_payment.succeeded":
        _handle_payment_succeeded(event.get("data", {}))

    return jsonify({"received": True}), 200


def _handle_payment_succeeded(data: dict):
    """Credit the user after a successful payment."""
    payment_id = data.get("payment_id") or data.get("id")
    metadata   = data.get("metadata") or {}
    user_id    = metadata.get("user_id")
    product_id = metadata.get("product_id")

    # Fallback: get product_id from product_cart if not in metadata
    if not product_id:
        cart = data.get("product_cart") or []
        if cart:
            product_id = cart[0].get("product_id")

    if not user_id or not product_id or not payment_id:
        print(f"Webhook missing required fields: user_id={user_id}, product_id={product_id}, payment_id={payment_id}")
        return

    credits = credits_for_product(product_id)
    if credits <= 0:
        print(f"Unknown product in webhook: {product_id}")
        return

    # Idempotency: skip if already processed
    saved = save_payment_record(user_id, payment_id, product_id, credits)
    if not saved:
        print(f"Payment {payment_id} already processed — skipping")
        return

    new_balance = add_credits(user_id, credits)
    print(f"Credited {credits} to user {user_id} (product: {product_id}) — new balance: {new_balance}")
