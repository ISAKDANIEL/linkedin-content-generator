from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from services.local_db import init_local_db
import os

load_dotenv()

# Initialize local SQLite DB (used when Supabase is not configured)
init_local_db()

app = Flask(__name__)

# Allow both localhost ports for development
allowed_origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://makepost.pro",
    "https://makepost.pro",
    "http://www.makepost.pro",
    "https://www.makepost.pro"
]

CORS(app, resources={r"/*": {"origins": allowed_origins}},
     supports_credentials=True)

# ── Register Blueprints ────────────────────────────────────────────────────────
from routes.auth_routes import auth_bp
from routes.content_routes import content_bp
from routes.history_routes import history_bp

app.register_blueprint(auth_bp)
app.register_blueprint(content_bp)
app.register_blueprint(history_bp)

# ── Legacy route (backward compat with old frontend) ──────────────────────────
from services.openai_service import generate_linkedin_post
from services.supabase_service import save_generated_content

@app.route("/generate-content", methods=["POST"])
def generate_content_legacy():
    data = request.get_json() or {}
    title = data.get("title", "")
    tone = data.get("tone", "Professional")
    audience = data.get("audience", "General Professional")
    if not title:
        return jsonify({"error": "Title is required"}), 400
    try:
        content_data = generate_linkedin_post(title, tone, audience)
        if not content_data:
            return jsonify({"error": "Failed to generate content"}), 500
        save_result = save_generated_content(title, content_data, "")
        return jsonify({
            "status": "success",
            "data": {
                "content": content_data,
                "db_record": save_result.data if hasattr(save_result, "data") else save_result,
            }
        }), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

# ── Health & Root ──────────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "LinkedIn Content Generator API — running"}), 200

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "version": "2.0"}), 200

# ── Image Download Proxy ────────────────────────────────────────────────────────
# DALL-E URLs are on OpenAI CDN with CORS restrictions — proxy through backend
import requests as req_lib
from flask import send_file, Response, send_from_directory
import io

# Path to saved PNG images (saved by openai_service)
STATIC_IMAGES_DIR = os.path.join(os.path.dirname(__file__), 'static', 'images')
os.makedirs(STATIC_IMAGES_DIR, exist_ok=True)

@app.route("/api/images/<path:filename>", methods=["GET"])
def serve_image(filename):
    """Serve a locally-saved infographic PNG image."""
    return send_from_directory(STATIC_IMAGES_DIR, filename)

@app.route("/api/download-image", methods=["GET"])
def download_image_proxy():
    """Proxy a DALL-E image URL so the browser can download it without CORS errors."""
    image_url = request.args.get("url", "")
    filename  = request.args.get("filename", "infographic.png")
    if not image_url:
        return jsonify({"error": "No URL provided"}), 400
    try:
        resp = req_lib.get(image_url, timeout=30, stream=True)
        resp.raise_for_status()
        img_bytes = io.BytesIO(resp.content)
        img_bytes.seek(0)
        return send_file(
            img_bytes,
            mimetype="image/png",
            as_attachment=True,
            download_name=filename,
        )
    except Exception as e:
        print(f"Image proxy error: {e}")
        return jsonify({"error": str(e)}), 500


# ── Global Error Handlers ──────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    print(f"500 Error: {e}")
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405

if __name__ == "__main__":
    print("🚀 Starting LinkedIn Content Generator API on http://localhost:5000")
    app.run(debug=True, port=5000)