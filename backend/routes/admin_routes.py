"""
Admin routes — accessible only to the configured admin email.
Endpoints:
  GET  /api/admin/stats                        → summary stats
  GET  /api/admin/users                        → all users
  GET  /api/admin/payments                     → all payments
  GET  /api/admin/history                      → all generations (last 200)
  POST /api/admin/users/<user_id>/credits      → add or set user credits
  DELETE /api/admin/users/<user_id>            → delete user + their data
"""
from flask import Blueprint, request, jsonify
from utils.admin_middleware import admin_required
from services.local_db import (
    local_get_all_users,
    local_get_all_payments,
    local_get_all_history,
    local_get_admin_stats,
    local_add_credits,
    local_set_user_credits,
    local_delete_user,
)

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats(current_user):
    stats = local_get_admin_stats()
    return jsonify(stats), 200


@admin_bp.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_users(current_user):
    users = local_get_all_users()
    return jsonify({"users": users}), 200


@admin_bp.route("/api/admin/payments", methods=["GET"])
@admin_required
def admin_payments(current_user):
    payments = local_get_all_payments()
    return jsonify({"payments": payments}), 200


@admin_bp.route("/api/admin/history", methods=["GET"])
@admin_required
def admin_history(current_user):
    history = local_get_all_history()
    return jsonify({"history": history}), 200


@admin_bp.route("/api/admin/users/<user_id>/credits", methods=["POST"])
@admin_required
def admin_update_credits(current_user, user_id):
    data = request.get_json() or {}
    action = data.get("action", "add")   # "add" or "set"
    amount = data.get("amount", 0)
    try:
        amount = int(amount)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400

    if action == "set":
        new_balance = local_set_user_credits(user_id, amount)
    else:
        new_balance = local_add_credits(user_id, amount)

    return jsonify({"success": True, "new_balance": new_balance}), 200


@admin_bp.route("/api/admin/users/<user_id>", methods=["DELETE"])
@admin_required
def admin_delete_user(current_user, user_id):
    ok = local_delete_user(user_id)
    if ok:
        return jsonify({"success": True}), 200
    return jsonify({"error": "User not found"}), 404
