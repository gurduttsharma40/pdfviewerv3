import sqlite3
import sys
import json
import nltk
from nltk.corpus import wordnet
from rapidfuzz import process, fuzz
import locale
import codecs

# Force UTF-8 encoding for Git Bash
sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer)

# Ensure Python reads environment variables correctly
locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
import codecs



nltk.download("wordnet")
DB_FILE = "database.sqlite"


#  AI-powered fuzzy search
def search_text(query):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("SELECT pdfs.file_name, pdfs.path, extracted_text.page, extracted_text.text "
                   "FROM extracted_text JOIN pdfs ON extracted_text.pdf_id = pdfs.id")
    results = cursor.fetchall()
    conn.close()

    texts = [entry[3] for entry in results]
    matches = process.extract(query, texts, scorer=fuzz.partial_ratio, limit=20)

    search_results = []
    for match in matches:
        text, score, index = match
        if score > 50:
            search_results.append({
                "file_name": results[index][0],
                "pdf_path": results[index][1],
                "page": results[index][2],
                "text": text
            })

    return search_results if search_results else [{"message": "No matches found"}]


# Search OCR text with synonym support
def search_with_synonyms(query):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("SELECT pdfs.file_name, pdfs.path, extracted_text.page, extracted_text.text "
                   "FROM extracted_text JOIN pdfs ON extracted_text.pdf_id = pdfs.id")
    results = cursor.fetchall()
    conn.close()

    synonyms = set()
    for syn in wordnet.synsets(query.replace(" ", "_")):
        for lemma in syn.lemmas():
            synonyms.add(lemma.name().replace("_", " "))

    matches = []
    for result in results:
        file_name, pdf_path, page, text = result
        text_lower = text.lower()
        if query in text_lower or any(syn in text_lower for syn in synonyms):
            matches.append({
                "file_name": file_name,
                "pdf_path": pdf_path,
                "page": page,
                "text": text
            })

    return matches if matches else [{"message": "No OCR matches"}]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No search query provided"}))
        sys.exit(1)

    query = sys.argv[1].lower()

    ocr_results = search_with_synonyms(query)
    ai_results = search_text(query)

    print(json.dumps({"ocr_results": ocr_results, "ai_results": ai_results}, indent=4, ensure_ascii=False))
