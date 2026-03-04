from flask import Blueprint, request, jsonify, redirect
import os
import requests as http_requests
from services.auth_service import generate_jwt, hash_password, check_password
from services.user_service import get_user_by_email, create_user, get_user_by_id
from utils.auth_middleware import token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

# Check if Google OAuth is actually configured (not just placeholder)
_GOOGLE_CONFIGURED = bool(
    GOOGLE_CLIENT_ID
    and GOOGLE_CLIENT_SECRET
    and "your-google" not in GOOGLE_CLIENT_ID
    and "your-google" not in GOOGLE_CLIENT_SECRET
)

# ── Register ──────────────────────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip() or email.split("@")[0]

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    existing = get_user_by_email(email)
    if existing:
        return jsonify({"error": "An account with this email already exists"}), 409

    password_hash = hash_password(password)
    user = create_user(email=email, name=name, password_hash=password_hash, provider="email")
    if not user:
        return jsonify({"error": "Failed to create account. Check Supabase setup."}), 500

    token = generate_jwt(user["id"], user["email"], user.get("name", ""))
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", ""), "provider": "email"}
    }), 201


# ── Login ─────────────────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = get_user_by_email(email)
    if not user or not user.get("password_hash"):
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_jwt(user["id"], user["email"], user.get("name", ""))
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", ""), "provider": user.get("provider", "email")}
    }), 200


# ── Google OAuth — Check status ───────────────────────────────────────────────
@auth_bp.route("/google/check", methods=["GET"])
def google_check():
    return jsonify({"configured": _GOOGLE_CONFIGURED}), 200


# ── Google OAuth — Step 1: Redirect ───────────────────────────────────────────
@auth_bp.route("/google", methods=["GET"])
def google_login():
    if not _GOOGLE_CONFIGURED:
        return jsonify({"error": "Google OAuth is not configured. Please use email/password login, or configure Google Client ID and Secret in backend .env"}), 501
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
    )
    return redirect(google_auth_url)


# ── Google OAuth — Step 2: Callback ───────────────────────────────────────────
@auth_bp.route("/google/callback", methods=["GET"])
def google_callback():
    code = request.args.get("code")
    if not code:
        error = request.args.get("error", "access_denied")
        return redirect(f"{FRONTEND_URL}/login?error={error}")

    # Exchange code for tokens
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    token_res = http_requests.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    })
    if not token_res.ok:
        return redirect(f"{FRONTEND_URL}/login?error=token_exchange_failed")

    access_token = token_res.json().get("access_token")

    # Get user info
    user_info_res = http_requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    if not user_info_res.ok:
        return redirect(f"{FRONTEND_URL}/login?error=user_info_failed")

    info = user_info_res.json()
    email = info.get("email", "").lower()
    name = info.get("name", "")
    avatar = info.get("picture", "")

    if not email:
        return redirect(f"{FRONTEND_URL}/login?error=no_email")

    user = get_user_by_email(email)
    if not user:
        user = create_user(email=email, name=name, password_hash=None, provider="google")

    if not user:
        return redirect(f"{FRONTEND_URL}/login?error=create_user_failed")

    token = generate_jwt(user["id"], user["email"], user.get("name", ""))
    return redirect(f"{FRONTEND_URL}/login?token={token}&name={name}&email={email}")


# ── Me (current user) ────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@token_required
def me(current_user):
    return jsonify({
        "id": current_user["sub"],
        "email": current_user["email"],
        "name": current_user.get("name", ""),
    }), 200
