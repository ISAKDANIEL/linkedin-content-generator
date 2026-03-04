from functools import wraps
from flask import request, jsonify
from services.auth_service import verify_jwt


def token_required(f):
    """Decorator: requires a valid JWT in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization token required"}), 401
        token = auth_header.split(" ", 1)[1]
        payload = verify_jwt(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, current_user=payload, **kwargs)
    return decorated


def optional_token(f):
    """Decorator: attaches user if JWT provided, otherwise current_user=None."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        current_user = None
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            current_user = verify_jwt(token)
        return f(*args, current_user=current_user, **kwargs)
    return decorated
