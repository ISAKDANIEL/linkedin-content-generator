from flask import Blueprint, request, jsonify
from services.openai_service import generate_linkedin_post
from services.supabase_service import save_generated_content
from services.history_service import save_history
from services.user_service import get_credits, deduct_credit
from utils.auth_middleware import token_required, optional_token
import traceback as tb

content_bp = Blueprint("content", __name__, url_prefix="/api")

ALLOWED_TONES = {
    "Professional", "Casual", "Inspirational", "Educational",
    "Humorous", "Formal", "Conversational", "Storytelling",
    "Data-Driven", "Motivational",
}
ALLOWED_STYLES = {
    "Whiteboard", "Corporate Modern", "Executive Guide", "Handwritten Notes",
}


@content_bp.route("/generate", methods=["POST"])
@token_required
def generate_content(current_user):
    data = request.get_json(silent=True) or {}

    # ── Input validation ──────────────────────────────────────────────────────
    title    = str(data.get("title", "")).strip()[:300]
    tone_raw = str(data.get("tone", "Professional")).strip()
    aud_raw  = str(data.get("audience", "General Professional")).strip()[:200]
    sty_raw  = str(data.get("style", "Whiteboard")).strip()

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if len(title) < 3:
        return jsonify({"error": "Title too short (minimum 3 characters)"}), 400

    tone     = tone_raw if tone_raw in ALLOWED_TONES else "Professional"
    audience = aud_raw or "General Professional"
    style    = sty_raw if sty_raw in ALLOWED_STYLES else "Whiteboard"

    user_id = current_user.get("sub") or current_user.get("user_id") or current_user.get("id", "")
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    # Check credits
    balance = get_credits(user_id)
    if balance < 1:
        return jsonify({
            "error": "You have no credits left. Please purchase more to continue.",
            "code": "NO_CREDITS",
            "credits": 0,
        }), 402

    try:
        content_data = generate_linkedin_post(title, tone, audience, style)
        if not content_data:
            return jsonify({"error": "Failed to generate content from AI provider"}), 500

        deduct_credit(user_id)
        save_history(user_id, title, tone, audience, content_data)
        save_result = save_generated_content(title, content_data, "")
        new_balance = get_credits(user_id)

        return jsonify({
            "status": "success",
            "data": {
                "content": content_data,
                "credits_remaining": new_balance,
                "db_record": save_result.data if hasattr(save_result, "data") else save_result,
            }
        }), 200

    except Exception as e:
        print(f"[Generate] Error: {e}")
        tb.print_exc()
        return jsonify({"error": "Content generation failed. Please try again."}), 500
