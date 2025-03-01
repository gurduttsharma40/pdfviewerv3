document.addEventListener("DOMContentLoaded", () => {
    let pdfDoc = null,
        pageNum = 1,
        scale = 1.5,
        highlights = [];

    const fileInput = document.getElementById("pdfUpload"),
        searchBox = document.getElementById("searchBox"),
        searchBtn = document.getElementById("searchBtn"),
        pdfSelect = document.getElementById("pdfSelect"),
        resultsList = document.getElementById("resultsList"),
        resultsContainer = document.getElementById("results"),
        pdfContainer = document.getElementById("pdfContainer"),
        prevPageBtn = document.getElementById("prevPage"),
        nextPageBtn = document.getElementById("nextPage"),
        pageInfo = document.getElementById("pageInfo");

    if (!fileInput || !pdfSelect) {
        console.error("⚠️ Missing essential HTML elements!");
        return;
    }

    // 📌 Load & Display List of PDFs
    function loadPDFList() {
        fetch("http://localhost:5000/list_pdfs")
            .then(res => res.json())
            .then(pdfs => {
                pdfSelect.innerHTML = "";
                if (pdfs.length === 0) {
                    pdfSelect.innerHTML = "<option>No PDFs available</option>";
                    return;
                }

                pdfs.forEach(pdf => {
                    let option = document.createElement("option");
                    option.value = pdf.path;
                    option.textContent = pdf.fileName;
                    pdfSelect.appendChild(option);
                });
            })
            .catch(err => console.error("❌ Error loading PDFs:", err));
    }

    // 📌 Load Selected PDF
    pdfSelect.addEventListener("change", (e) => {
        loadPDF(e.target.value);
    });

    function loadPDF(pdfPath) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";
        
        pdfjsLib.getDocument(pdfPath).promise.then(pdf => {
            pdfDoc = pdf;
            renderPage(1);
        }).catch(err => console.error("❌ Error loading PDF:", err));
    }

    function renderPage(num) {
        if (!pdfDoc) return;

        pdfDoc.getPage(num).then(page => {
            let viewport = page.getViewport({ scale });
            let canvas = document.getElementById("pdfCanvas");
            let ctx = canvas.getContext("2d");

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            let renderCtx = { canvasContext: ctx, viewport };

            page.render(renderCtx).promise.then(() => {
                drawHighlights();
            });

            pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
        });
    }

    function drawHighlights() {
        let canvas = document.getElementById("pdfCanvas");
        let ctx = canvas.getContext("2d");

        if (!ctx || highlights.length === 0) return;

        ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
        highlights.forEach(h => {
            let [x0, y0, x1, y1] = h.map(coord => coord * scale);
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        });
    }

    // 📌 Handle Pagination
    prevPageBtn.addEventListener("click", () => {
        if (pageNum > 1) {
            pageNum--;
            renderPage(pageNum);
        }
    });

    nextPageBtn.addEventListener("click", () => {
        if (pageNum < pdfDoc.numPages) {
            pageNum++;
            renderPage(pageNum);
        }
    });

    // 📌 Handle Search
    searchBtn.addEventListener("click", () => {
    let query = searchBox.value.trim();
    if (!query) return;

    fetch("http://localhost:5000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
    })
    .then(res => res.json())
    .then(data => {
        console.log("🔍 Search Response:", data);

        resultsList.innerHTML = "";
        resultsContainer.style.display = "block";

        if (!Array.isArray(data) || data.length === 0) {
            resultsList.innerHTML = "<li>No results found</li>";
            return;
        }

        data.forEach(pdf => {
            let pdfFile = pdf.fileName;
            let pdfItem = document.createElement("li");
            pdfItem.innerHTML = `<strong>📄 ${pdfFile}</strong>`;
            pdfItem.style.fontWeight = "bold";
            resultsList.appendChild(pdfItem);

            pdf.results.forEach(result => {
                let page = result.page ? result.page : "Unknown Page";
                let text = result.text ? result.text : "No Text Available";

                let resultItem = document.createElement("li");
                resultItem.innerHTML = `<strong class="result-page" data-page="${page}" 
                                        data-bbox='${JSON.stringify(result.bbox)}' 
                                        data-pdf="${pdf.pdfPath}">
                                        Page ${page}:
                                    </strong> ${text.replace(query, `<span class="highlight">${query}</span>`)}`;
                resultsList.appendChild(resultItem);
            });
        });

        // 📌 Attach Click Event to Search Results
        document.querySelectorAll(".result-page").forEach(item => {
            item.addEventListener("click", (e) => {
                let targetPage = parseInt(e.target.getAttribute("data-page"));
                let bboxAttr = e.target.getAttribute("data-bbox");
                let bbox = bboxAttr ? JSON.parse(bboxAttr) : null;
                let pdfPath = e.target.getAttribute("data-pdf");

                if (!isNaN(targetPage)) {
                    pdfSelect.value = pdfPath; // Switch to the correct PDF
                    loadPDF(pdfPath);
                    highlights = bbox ? [bbox] : [];
                    renderPage(targetPage);
                }
            });
        });
    })
    .catch(err => console.error("❌ Search error:", err));
});



    // 📌 File Upload
    fileInput.addEventListener("change", (e) => {
        let file = e.target.files[0];
        if (!file) return;

        let formData = new FormData();
        formData.append("pdf", file);

        fetch("http://localhost:5000/upload", {
            method: "POST",
            headers: { "file-name": file.name },
            body: file
        })
        .then(res => res.json())
        .then(() => loadPDFList());
    });

    loadPDFList();
});
