"""
Database Configuration & Initialization
ใช้ MySQL ผ่าน mysql-connector-python
"""

import mysql.connector
import os
import hashlib

# ตั้งค่า Database - แก้ไขตามเครื่องของคุณ
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "root"),
    "password": "MySQL@2026",
    "database": os.environ.get("DB_NAME", "ai_codefix"),
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}


def get_connection():
    """สร้าง Connection ใหม่ทุกครั้ง"""
    return mysql.connector.connect(**DB_CONFIG)


def init_db():
    """สร้าง Database และ Tables ถ้ายังไม่มี"""
    # เชื่อมต่อโดยไม่ระบุ database เพื่อสร้างมันก่อน
    config = DB_CONFIG.copy()
    db_name = config.pop("database")

    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()

    # สร้าง Database
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    cursor.execute(f"USE `{db_name}`")

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


def hash_password(password: str) -> str:
    """Hash password ด้วย SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()
