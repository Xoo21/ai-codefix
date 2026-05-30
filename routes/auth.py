"""
Authentication Routes - Login / Register / Logout
"""

from flask import Blueprint, render_template, request, session, redirect, url_for, jsonify
from database import get_connection, hash_password

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        if "user_id" in session:
            return redirect(url_for("dashboard"))
        return render_template("login.html")

    # POST - รับ JSON หรือ Form
    data = request.get_json() if request.is_json else request.form
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "message": "กรุณากรอกข้อมูลให้ครบ"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, username, email FROM users WHERE username=%s AND password=%s",
        (username, hash_password(password)),
    )
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user:
        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["email"] = user["email"]
        return jsonify({"success": True, "redirect": "/dashboard"})
    else:
        return jsonify({"success": False, "message": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}), 401


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("login.html", mode="register")

    data = request.get_json() if request.is_json else request.form
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"success": False, "message": "กรุณากรอกข้อมูลให้ครบ"}), 400

    if len(password) < 6:
        return jsonify({"success": False, "message": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (username, email, hash_password(password)),
        )
        conn.commit()
        user_id = cursor.lastrowid
        # Auto-login หลังสมัคร
        session["user_id"] = user_id
        session["username"] = username
        session["email"] = email
        return jsonify({"success": True, "redirect": "/dashboard"})
    except Exception as e:
        conn.rollback()
        if "Duplicate entry" in str(e):
            if "username" in str(e):
                msg = "ชื่อผู้ใช้นี้ถูกใช้แล้ว"
            else:
                msg = "อีเมลนี้ถูกใช้แล้ว"
        else:
            msg = "เกิดข้อผิดพลาด กรุณาลองใหม่"
        return jsonify({"success": False, "message": msg}), 400
    finally:
        cursor.close()
        conn.close()


@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))
