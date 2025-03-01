import os
import sqlite3
import fitz  # PyMuPDF for PDF processing

# Directories & Database
PDF_DIR = "pdf_storage"
DATABASE_FILE = "database.db"

# Ensure storage directory exists
os.makedirs(PDF_DIR, exist_ok=True)

# 📌 Function to Insert Data into SQLite Database
def insert_into_database(file_name, pdf_path, page_num, text):
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO pdf_data (file_name, file_path, page, text) 
        VALUES (?, ?, ?, ?)
        """,
        (file_name, pdf_path, page_num, text)
    )

    conn.commit()
    conn.close()

# 📌 Extract Text from PDF and Insert into Database
def extract_text_from_pdf(pdf_path, file_name):
    doc = fitz.open(pdf_path)

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()  # Extract text
        if text:  # Only insert if there's text
            insert_into_database(file_name, pdf_path, page_num + 1, text)

# 📌 Process All PDFs and Store in Database
def process_all_pdfs():
    if not os.path.exists(PDF_DIR):
        print(f"Directory {PDF_DIR} not found.")
        return

    pdf_files = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]
    if not pdf_files:
        print("No PDFs found in storage.")
        return

    # Create Database and Table if not exists
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pdf_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT,
            file_path TEXT,
            page INTEGER,
            text TEXT
        )
    """)

    conn.commit()
    conn.close()

    for pdf_file in pdf_files:
        pdf_path = os.path.join(PDF_DIR, pdf_file)
        print(f"Processing: {pdf_file}")
        extract_text_from_pdf(pdf_path, pdf_file)

    print("All PDFs processed and stored in SQLite.")

# Run the script
if __name__ == "__main__":
    process_all_pdfs()
