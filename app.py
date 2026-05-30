"""
AI CodeFix - Main Flask Application
"""

from flask import Flask, render_template, session, redirect, url_for
from routes.auth import auth_bp
from routes.api import api_bp
from routes.history import history_bp
from database import init_db  # ดึงคำสั่งสร้างตารางมาไว้ตรงนี้
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

# สั่งให้สร้างตารางฐานข้อมูลทำงานทันทีที่เปิดแอป (Render จะได้มองเห็น)
init_db()

# ลงทะเบียน Blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(api_bp, url_prefix="/api")
app.register_blueprint(history_bp, url_prefix="/history")


@app.route("/")
def index():
    """หน้าหลัก - ถ้า login แล้วไป dashboard, ถ้ายังไปหน้า login"""
    if "user_id" in session:
        return render_template("dashboard.html", user=session.get("username"))
    return redirect(url_for("auth.login"))


@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("auth.login"))
    return render_template("dashboard.html", user=session.get("username"))


if __name__ == "__main__":
    app.run(debug=True, port=5000)