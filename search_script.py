import json
import sys
import os
import nltk
from nltk.corpus import wordnet
from rapidfuzz import process, fuzz

nltk.download("wordnet")

if len(sys.argv) < 2:
    print(json.dumps({"error": "No search query provided"}))
    sys.exit(1)

query = sys.argv[1].lower()
json_file = "extracted_data.json"

if not os.path.exists(json_file) or os.stat(json_file).st_size == 0:
    print(json.dumps({"error": "OCR data file not found or empty"}))
    sys.exit(1)

with open(json_file, "r", encoding="utf-8") as file:
    data = json.load(file)

synonyms = set()
for syn in wordnet.synsets(query.replace(" ", "_")):
    for lemma in syn.lemmas():
        synonyms.add(lemma.name().replace("_", " "))

matches = []
for entry in data:
    entry_text = entry["text"].lower()
    if query in entry_text or any(syn in entry_text for syn in synonyms):
        matches.append(entry)

print(json.dumps(matches if matches else {"message": "No matches found"}, indent=4))
