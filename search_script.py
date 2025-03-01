import sqlite3
import sys
import json
import os

# ✅ Force UTF-8 output for Windows Consoles
if os.name == "nt":
    sys.stdout.reconfigure(encoding="utf-8")

DB_FILE = "database.db"

def search_in_db(query):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT file_name, file_path, page, text, bbox FROM pdf_data WHERE text LIKE ?", 
            (f"%{query}%",)
        )
        results = cursor.fetchall()

        formatted_results = []
        for row in results:
            file_name, file_path, page, text, bbox = row
            
            # ✅ Ensure bbox is parsed correctly
            try:
                bbox = json.loads(bbox) if bbox else []
            except json.JSONDecodeError:
                bbox = []

            formatted_results.append({
                "file_name": file_name,
                "file_path": file_path,
                "page": page,
                "text": text,
                "bbox": bbox  # ✅ Include bounding box for highlighting
            })

        return formatted_results
    except Exception as e:
        print(json.dumps({"error": f"Database error: {str(e)}"}))
        return []
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No search query provided"}))
        sys.exit(1)

    query = sys.argv[1].strip()

    search_results = search_in_db(query)

    # Ensure JSON response is always valid
    response = {"search_results": search_results if search_results else []}
    print(json.dumps(response, indent=4, ensure_ascii=False))
