from flask import Blueprint, request, jsonify
from services.openai_service import generate_linkedin_post
from services.supabase_service import save_generated_content
from services.history_service import save_history
from utils.auth_middleware import token_required, optional_token

content_bp = Blueprint("content", __name__, url_prefix="/api")


@content_bp.route("/generate", methods=["POST"])
@optional_token
def generate_content(current_user):
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    tone = data.get("tone", "Professional")
    audience = data.get("audience", "General Professional")
    style = data.get("style", "Whiteboard")

    if not title:
        return jsonify({"error": "Title is required"}), 400

    try:
        content_data = generate_linkedin_post(title, tone, audience, style)
        if not content_data:
            return jsonify({"error": "Failed to generate content from AI provider"}), 500

        user_id = current_user.get("sub") if current_user else None

        # Save to history if authenticated
        # The image is now a server URL (/api/images/xxx.png), not base64, so it's safe to store.
        if user_id:
            save_history(user_id, title, tone, audience, content_data)

        # Save to generated_content (existing)
        save_result = save_generated_content(title, content_data, "")

        return jsonify({
            "status": "success",
            "data": {
                "content": content_data,
                "db_record": save_result.data if hasattr(save_result, "data") else save_result,
            }
        }), 200

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"error": str(e)}), 500
