"""
API Routes - เชื่อมต่อ Gemini AI สำหรับวิเคราะห์โค้ด
"""

from flask import Blueprint, request, jsonify, session
from database import get_connection
from google import genai
import os
import json
import re

api_bp = Blueprint("api", __name__)

# ตั้งค่า Gemini API
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
client = genai.Client(api_key=GEMINI_API_KEY)


def require_login(f):
    """Decorator ตรวจสอบว่า login แล้ว"""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "message": "กรุณา Login ก่อน"}), 401
        return f(*args, **kwargs)
    return decorated


@api_bp.route("/analyze", methods=["POST"])
@require_login
def analyze():
    """
    วิเคราะห์โค้ดด้วย Gemini AI
    Input: { code, language }
    Output: { success, original_code, fixed_code, explanation, errors, suggestions }
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "ไม่พบข้อมูล"}), 400

    code = data.get("code", "").strip()
    language = data.get("language", "Python")

    if not code:
        return jsonify({"success": False, "message": "กรุณาใส่โค้ดก่อน"}), 400

    if len(code) > 50000:
        return jsonify({"success": False, "message": "โค้ดยาวเกินไป (สูงสุด 50,000 ตัวอักษร)"}), 400

    # สร้าง Prompt สำหรับ Gemini
    prompt = f"""คุณคือผู้เชี่ยวชาญด้านการตรวจสอบโค้ด วิเคราะห์โค้ดต่อไปนี้อย่างละเอียด

ภาษา: {language}

โค้ด:
```{language.lower()}
{code}
```

ตอบกลับเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น รูปแบบดังนี้:
{{
  "has_errors": true/false,
  "error_summary": "สรุปปัญหาในภาษาไทย",
  "errors": [
    {{
      "type": "Syntax Error / Logic Error / Best Practice",
      "line": "บรรทัดที่มีปัญหา (ถ้าระบุได้)",
      "description": "อธิบายปัญหาเป็นภาษาไทย",
      "severity": "high/medium/low"
    }}
  ],
  "fixed_code": "โค้ดที่แก้ไขแล้ว (ใส่โค้ดทั้งหมดที่แก้ไข)",
  "explanation": "อธิบายการแก้ไขทั้งหมดเป็นภาษาไทยแบบละเอียด",
  "improvements": [
    "คำแนะนำการปรับปรุง 1",
    "คำแนะนำการปรับปรุง 2"
  ]
}}

ถ้าโค้ดถูกต้องสมบูรณ์แล้ว ให้ has_errors เป็น false และ fixed_code ส่งโค้ดเดิมกลับไป"""

    try:
         # เปลี่ยนชื่อโมเดลให้ถูกต้องตามนี้เลยครับ
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        raw_text = response.text.strip()
        # ลบ markdown code block ถ้ามี
        raw_text = re.sub(r"```json\s*", "", raw_text)
        raw_text = re.sub(r"```\s*", "", raw_text)
        raw_text = raw_text.strip()

        # Parse JSON
        result = json.loads(raw_text)

        # บันทึกลง Database
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO code_history 
               (user_id, language, original_code, fixed_code, explanation, has_errors) 
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                session["user_id"],
                language,
                code,
                result.get("fixed_code", code),
                result.get("explanation", ""),
                result.get("has_errors", False),
            ),
        )
        conn.commit()
        history_id = cursor.lastrowid
        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "history_id": history_id,
            "original_code": code,
            **result,
        })

    except json.JSONDecodeError:
        # ถ้า Gemini ไม่ส่ง JSON มา แปลงเป็น text ธรรมดา
        return jsonify({
            "success": True,
            "has_errors": True,
            "error_summary": "ตรวจพบปัญหาในโค้ด",
            "errors": [],
            "fixed_code": code,
            "explanation": raw_text,
            "improvements": [],
        })
    except Exception as e:
        error_msg = str(e)
        if "API_KEY" in error_msg or "api key" in error_msg.lower():
            msg = "ไม่พบ Gemini API Key กรุณาตั้งค่า GEMINI_API_KEY"
        elif "quota" in error_msg.lower():
            msg = "API quota หมด กรุณาลองใหม่ภายหลัง"
        else:
            msg = f"เกิดข้อผิดพลาดจาก AI: {error_msg[:200]}"
        return jsonify({"success": False, "message": msg}), 500
