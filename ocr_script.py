import json
import sys
import os
from pdf2image import convert_from_path
from paddleocr import PaddleOCR

# Ensure a PDF file is provided
if len(sys.argv) < 2:
    print("Error: No PDF file provided.")
    sys.exit(1)

pdf_path = sys.argv[1]

# Check if the PDF file exists
if not os.path.exists(pdf_path):
    print(f"Error: File '{pdf_path}' not found.")
    sys.exit(1)

# Convert PDF to images
try:
    images = convert_from_path(pdf_path, dpi=200)
except Exception as e:
    print(f"Error during PDF conversion: {e}")
    sys.exit(1)

# Initialize OCR
ocr = PaddleOCR(lang="en")

# Extract text and bounding boxes
extracted_data = []
for i, img in enumerate(images):
    image_path = f"page_{i+1}.png"
    img.save(image_path, "PNG")

    result = ocr.ocr(image_path)
    
    if result[0]:  # Ensure OCR detected text
        for line in result[0]:
            bbox, (text, confidence) = line
            extracted_data.append({
                "page": i+1,
                "text": text,
                "confidence": confidence,
                "bbox": bbox
            })

# Save extracted text to JSON
output_file = "extracted_data.json"
with open(output_file, "w", encoding="utf-8") as file:
    json.dump(extracted_data, file, indent=4, ensure_ascii=False)

print(f"OCR completed. Extracted data saved to {output_file}.")
