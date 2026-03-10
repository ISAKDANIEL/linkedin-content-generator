from flask import Blueprint, request, jsonify, redirect
import os
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
import requests as http_requests
from services.auth_service import generate_jwt, hash_password, check_password
from services.user_service import get_user_by_email, create_user, get_user_by_id
from services.local_db import (
    local_create_password_reset,
    local_get_password_reset,
    local_use_password_reset,
    local_update_user_password,
)
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


# ── Forgot Password ───────────────────────────────────────────────────────────
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = get_user_by_email(email)
    # Always return success to avoid email enumeration
    if not user:
        return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

    # Only allow reset for email/password accounts
    if user.get("provider", "email") != "email":
        return jsonify({"error": "This account uses Google login. No password to reset."}), 400

    token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

    local_create_password_reset(email, token, expires_at)

    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"

    # Try to send email — fall back to console log if not configured
    email_sent = _send_reset_email(email, reset_url, user.get("name", ""))
    if not email_sent:
        print(f"\n{'='*60}")
        print(f"PASSWORD RESET LINK (email not configured — use this link):")
        print(f"{reset_url}")
        print(f"{'='*60}\n")

    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200


# ── Reset Password ────────────────────────────────────────────────────────────
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    token = data.get("token", "").strip()
    new_password = data.get("password", "")

    if not token:
        return jsonify({"error": "Reset token is required"}), 400
    if not new_password or len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    record = local_get_password_reset(token)
    if not record:
        return jsonify({"error": "Invalid or expired reset link. Please request a new one."}), 400

    # Check expiry
    try:
        expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            return jsonify({"error": "Reset link has expired. Please request a new one."}), 400
    except Exception:
        return jsonify({"error": "Invalid reset token."}), 400

    # Update password
    password_hash = hash_password(new_password)
    updated = local_update_user_password(record["email"], password_hash)
    if not updated:
        return jsonify({"error": "Could not update password. Try again."}), 500

    local_use_password_reset(token)

    return jsonify({"message": "Password updated successfully. You can now sign in."}), 200


def _send_reset_email(to_email: str, reset_url: str, name: str) -> bool:
    """Send password reset email via SMTP. Returns True if sent, False if not configured."""
    email_user = os.getenv("EMAIL_USER", "")
    email_pass = os.getenv("EMAIL_PASS", "")
    email_host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    email_port = int(os.getenv("EMAIL_PORT", "587"))

    if not email_user or not email_pass:
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your MakePost password"
        msg["From"] = f"MakePost <{email_user}>"
        msg["To"] = to_email

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
            <h2 style="color:#0f172a;margin-bottom:8px;">Reset your password</h2>
            <p style="color:#475569;margin-bottom:24px;">Hi {name or 'there'},<br>We received a request to reset your MakePost password. Click the button below to set a new password.</p>
            <a href="{reset_url}" style="display:inline-block;padding:14px 28px;background:#c54444;color:white;font-weight:700;border-radius:12px;text-decoration:none;font-size:15px;">Reset Password</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
            <p style="color:#cbd5e1;font-size:11px;">Or copy this link: {reset_url}</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(email_host, email_port) as server:
            server.starttls()
            server.login(email_user, email_pass)
            server.sendmail(email_user, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False


# ── Me (current user) ────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@token_required
def me(current_user):
    return jsonify({
        "id": current_user["sub"],
        "email": current_user["email"],
        "name": current_user.get("name", ""),
    }), 200
