import json
import sys
import os
import fitz  # PyMuPDF for PDF processing
import nltk
from nltk.corpus import wordnet
from rapidfuzz import process, fuzz

# ✅ Ensure required NLTK data is downloaded
nltk.download("wordnet")

PDF_PATH = "temp.pdf"
JSON_FILE = "extracted_data.json"


# 📌 Extract matching text from the PDF
def extract_text_from_pdf(pdf_path, query):
    text_data = []
    doc = fitz.open(pdf_path)

    for page_num in range(len(doc)):
        page = doc[page_num]
        text_instances = page.search_for(query)  # 🔍 Search for exact match

        for inst in text_instances:
            x0, y0, x1, y1 = inst
            text_data.append({
                "page": page_num + 1,
                "text": page.get_text("text"),
                "bbox": [x0, y0, x1, y1]
            })

    return text_data


# 📌 Find AI-powered matches using fuzzy search
def search_text(query, data):
    results = []
    texts = [entry["text"] for entry in data]

    matches = process.extract(query, texts, scorer=fuzz.partial_ratio, limit=20)

    for match in matches:
        text, score, index = match
        if score > 50:  # Adjust match confidence threshold
            results.append(data[index])

    return results if results else [{"message": "No AI-powered matches"}]


# 📌 Search OCR extracted JSON data
def search_in_json(query):
    if not os.path.exists(JSON_FILE) or os.stat(JSON_FILE).st_size == 0:
        return [{"message": "OCR data file not found or empty"}]

    with open(JSON_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    # Generate synonyms for AI-based search
    synonyms = set()
    for syn in wordnet.synsets(query.replace(" ", "_")):
        for lemma in syn.lemmas():
            synonyms.add(lemma.name().replace("_", " "))

    # Perform fuzzy matching & exact search
    matches = []
    for entry in data:
        entry_text = entry["text"].lower()
        if query in entry_text or any(syn in entry_text for syn in synonyms):
            matches.append(entry)

    return matches if matches else [{"message": "No OCR matches"}]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No search query provided"}))
        sys.exit(1)

    query = sys.argv[1].lower()

    # Search PDF
    pdf_results = extract_text_from_pdf(PDF_PATH, query)

    # Search AI-based fuzzy text from PDF
    ai_results = search_text(query, pdf_results)

    # Search OCR JSON
    ocr_results = search_in_json(query)

    # Merge results
    final_results = {
        "pdf_results": pdf_results if pdf_results else [{"message": "No direct PDF matches"}],
        "ai_results": ai_results if ai_results else [{"message": "No AI-based matches"}],
        "ocr_results": ocr_results if ocr_results else [{"message": "No OCR matches"}]
    }

    print(json.dumps(final_results, indent=4, ensure_ascii=False))
