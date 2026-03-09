from flask import Blueprint, request, jsonify
from services.openai_service import generate_linkedin_post
from services.supabase_service import save_generated_content
from services.history_service import save_history
from services.user_service import get_credits, deduct_credit
from utils.auth_middleware import token_required, optional_token

content_bp = Blueprint("content", __name__, url_prefix="/api")


@content_bp.route("/generate", methods=["POST"])
@token_required
def generate_content(current_user):
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    tone = data.get("tone", "Professional")
    audience = data.get("audience", "General Professional")
    style = data.get("style", "Whiteboard")

    if not title:
        return jsonify({"error": "Title is required"}), 400

    user_id = current_user.get("sub")

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

        # Deduct 1 credit after successful generation
        deduct_credit(user_id)

        # Save to history
        save_history(user_id, title, tone, audience, content_data)

        # Save to generated_content (existing)
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
        print(f"Server Error: {e}")
        return jsonify({"error": str(e)}), 500
