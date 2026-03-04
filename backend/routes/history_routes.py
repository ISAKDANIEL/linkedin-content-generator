from flask import Blueprint, jsonify
from services.history_service import get_history, get_history_item, delete_history
from utils.auth_middleware import token_required

history_bp = Blueprint("history", __name__, url_prefix="/api/history")


@history_bp.route("", methods=["GET"])
@token_required
def list_history(current_user):
    user_id = current_user["sub"]
    items = get_history(user_id)
    return jsonify({"history": items}), 200


@history_bp.route("/<history_id>", methods=["GET"])
@token_required
def get_item(current_user, history_id):
    user_id = current_user["sub"]
    item = get_history_item(history_id, user_id)
    if not item:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"item": item}), 200


@history_bp.route("/<history_id>", methods=["DELETE"])
@token_required
def remove_item(current_user, history_id):
    user_id = current_user["sub"]
    success = delete_history(history_id, user_id)
    if not success:
        return jsonify({"error": "Failed to delete"}), 400
    return jsonify({"status": "deleted"}), 200
