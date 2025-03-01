import os
import fitz  # PyMuPDF
import sqlite3
import base64

# Directories
PDF_DIR = "pdf_storage"
DB_FILE = "database.sqlite"

# Ensure PDF directory exists
os.makedirs(PDF_DIR, exist_ok=True)


# 📌 Create SQLite Database
def initialize_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create tables for PDFs, text, and images
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pdfs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT,
            path TEXT UNIQUE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS extracted_text (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pdf_id INTEGER,
            page INTEGER,
            text TEXT,
            FOREIGN KEY (pdf_id) REFERENCES pdfs(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pdf_id INTEGER,
            page INTEGER,
            image BLOB,
            FOREIGN KEY (pdf_id) REFERENCES pdfs(id)
        )
    """)
    
    conn.commit()
    conn.close()


# 📌 Extract structured text from PDF and store in SQLite
def extract_text_from_pdf(pdf_id, pdf_path):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    doc = fitz.open(pdf_path)

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")

        cursor.execute("INSERT INTO extracted_text (pdf_id, page, text) VALUES (?, ?, ?)",
                       (pdf_id, page_num + 1, text))

    conn.commit()
    conn.close()


# 📌 Extract images and store in SQLite
def extract_images_from_pdf(pdf_id, pdf_path):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    doc = fitz.open(pdf_path)

    for page_num in range(len(doc)):
        for img_index, img in enumerate(doc[page_num].get_images(full=True)):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]

            # Store image as BLOB
            cursor.execute("INSERT INTO images (pdf_id, page, image) VALUES (?, ?, ?)",
                           (pdf_id, page_num + 1, sqlite3.Binary(image_bytes)))

    conn.commit()
    conn.close()


# 📌 Process all PDFs
def process_all_pdfs():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    pdf_files = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]

    if not pdf_files:
        print("No PDFs found in storage.")
        return

    for pdf_file in pdf_files:
        pdf_path = os.path.join(PDF_DIR, pdf_file)

        print(f"Processing: {pdf_file}")

        # Insert into `pdfs` table
        cursor.execute("INSERT OR IGNORE INTO pdfs (file_name, path) VALUES (?, ?)", (pdf_file, pdf_path))
        conn.commit()

        # Get PDF ID
        cursor.execute("SELECT id FROM pdfs WHERE path = ?", (pdf_path,))
        pdf_id = cursor.fetchone()[0]

        # Process text & images
        extract_text_from_pdf(pdf_id, pdf_path)
        extract_images_from_pdf(pdf_id, pdf_path)

    conn.close()
    print("All PDFs processed and stored in SQLite.")


if __name__ == "__main__":
    initialize_database()
    process_all_pdfs()
