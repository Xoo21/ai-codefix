"""
History Routes - ดูประวัติการตรวจโค้ด
"""

from flask import Blueprint, render_template, jsonify, session, redirect, url_for
from database import get_connection

history_bp = Blueprint("history", __name__)


def require_login(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)
    return decorated


@history_bp.route("/")
@require_login
def history_page():
    return render_template("history.html", user=session.get("username"))


@history_bp.route("/api/list")
def history_list():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """SELECT id, language, 
                  LEFT(original_code, 100) as code_preview,
                  has_errors, created_at
           FROM code_history 
           WHERE user_id = %s 
           ORDER BY created_at DESC 
           LIMIT 50""",
        (session["user_id"],),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # แปลง datetime เป็น string
    for row in rows:
        row["created_at"] = row["created_at"].strftime("%d/%m/%Y %H:%M")

    return jsonify({"success": True, "history": rows})


@history_bp.route("/api/detail/<int:history_id>")
def history_detail(history_id):
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """SELECT * FROM code_history 
           WHERE id = %s AND user_id = %s""",
        (history_id, session["user_id"]),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row:
        return jsonify({"success": False, "message": "ไม่พบข้อมูล"}), 404

    row["created_at"] = row["created_at"].strftime("%d/%m/%Y %H:%M:%S")
    return jsonify({"success": True, "data": row})


@history_bp.route("/api/delete/<int:history_id>", methods=["DELETE"])
def history_delete(history_id):
    if "user_id" not in session:
        return jsonify({"success": False}), 401

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM code_history WHERE id = %s AND user_id = %s",
        (history_id, session["user_id"]),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"success": True})
