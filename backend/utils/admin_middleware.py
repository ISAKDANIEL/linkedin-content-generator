from functools import wraps
from flask import request, jsonify
from services.auth_service import verify_jwt

ADMIN_EMAIL = "admin@gmail.com"


def admin_required(f):
    """Decorator: requires a valid JWT AND the email must be the admin email."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization required"}), 401
        token = auth_header.split(" ", 1)[1]
        payload = verify_jwt(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        if payload.get("email") != ADMIN_EMAIL:
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, current_user=payload, **kwargs)
    return decorated
