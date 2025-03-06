import pytesseract
import fitz  # PyMuPDF
import sys
import json

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    extracted_text = {}

    for page_num in range(len(doc)):
        text = pytesseract.image_to_string(doc[page_num].get_pixmap(), lang="eng")
        extracted_text[page_num + 1] = text.strip()

    return extracted_text

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    text_data = extract_text_from_pdf(pdf_path)
    print(json.dumps(text_data, indent=4, ensure_ascii=False))
