import sqlite3
import json
import sys
from nltk.corpus import wordnet

# ✅ Ensure UTF-8 is used for standard output
sys.stdout.reconfigure(encoding='utf-8')


DB_FILE = "database.db"

def get_synonyms(query):
    synonyms = {query}
    for syn in wordnet.synsets(query):
        for lemma in syn.lemmas():
            synonyms.add(lemma.name().replace("_", " "))
    return synonyms

def search_in_db(query):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        synonyms = get_synonyms(query)
        results = []
        
        for word in synonyms:
            cursor.execute("SELECT file_name, page, text FROM pdf_data WHERE text LIKE ?", (f"%{word}%",))
            results.extend(cursor.fetchall())

        return [{"file": row[0], "page": row[1], "text": row[2]} for row in results]
    finally:
        conn.close()

if __name__ == "__main__":
    query = sys.argv[1].strip()
    print(json.dumps(search_in_db(query), indent=4, ensure_ascii=False))
