"""
Database Configuration & Initialization
ใช้ MySQL ผ่าน mysql-connector-python
"""

import mysql.connector
import os
import hashlib

# ตั้งค่า Database - แก้ไขให้รับค่าจาก Render ได้สมบูรณ์
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", "AVNS_agzkxXpN3tRLVDnVtVX"),
    "database": os.environ.get("DB_NAME", "defaultdb"), # เปลี่ยนเป็น defaultdb แล้ว
    "port": int(os.environ.get("DB_PORT", 16926)),      # ล็อคพอร์ต 16926 ของ Aiven ไว้เลย
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}

def get_connection():
    """สร้าง Connection ใหม่ทุกครั้ง"""
    return mysql.connector.connect(**DB_CONFIG)

def init_db():
    """สร้าง Tables ถ้ายังไม่มี (ตัดการ Create Database ออกเพราะ Aiven สร้างให้แล้ว)"""
    try:
        # เชื่อมต่อตรงเข้า Database เลย
        conn = get_connection()
        cursor = conn.cursor()

        # สร้าง Table: users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(64) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # สร้าง Table: code_history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS code_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                language VARCHAR(20) NOT NULL,
                original_code LONGTEXT NOT NULL,
                fixed_code LONGTEXT,
                explanation LONGTEXT,
                has_errors BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")

def hash_password(password: str) -> str:
    """Hash password ด้วย SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()