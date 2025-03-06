import os
import shutil

def process_uploaded_pdfs(source_dir, dest_dir):
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)

    for filename in os.listdir(source_dir):
        if filename.endswith(".pdf"):
            source_path = os.path.join(source_dir, filename)
            dest_path = os.path.join(dest_dir, filename)
            shutil.copy(source_path, dest_path)
            print(f"✅ Processed {filename}")

if __name__ == "__main__":
    process_uploaded_pdfs("uploads", "pdf_storage")
