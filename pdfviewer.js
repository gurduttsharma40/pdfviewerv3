document.addEventListener("DOMContentLoaded", () => {
    console.log("📄 PDF Viewer Loaded.");


document.getElementById("prevPage").addEventListener("click", () => {
    if (window.api && pageNum > 1) window.api.send("prev-page");
});

document.getElementById("nextPage").addEventListener("click", () => {
    if (window.api) window.api.send("next-page");
});
    let pdfViewer = document.getElementById("pdfContainer");

    if (!pdfViewer) {
        console.error("❌ PDF container missing!");
        return;
    }

    // ✅ Ensure event listeners work correctly
    const prevPageBtn = document.getElementById("prevPage"),
          nextPageBtn = document.getElementById("nextPage");

    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (pageNum > 1) renderPage(--pageNum);
        });

        nextPageBtn.addEventListener("click", () => {
            if (pageNum < pdfDoc.numPages) renderPage(++pageNum);
        });
    } else {
        console.error("❌ Pagination buttons not found!");
    }
});
