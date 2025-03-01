document.addEventListener("DOMContentLoaded", () => {
    let pdfDoc = null,
        pageNum = 1,
        scale = 1.5,
        canvas = document.getElementById("pdfCanvas"),
        ctx = canvas.getContext("2d"),
        highlights = [];

    const fileInput = document.getElementById("pdfUpload"),
        searchBox = document.getElementById("searchBox"),
        searchBtn = document.getElementById("searchBtn"),
        prevPageBtn = document.getElementById("prevPage"),
        nextPageBtn = document.getElementById("nextPage"),
        pageInfo = document.getElementById("pageInfo"),
        resultsList = document.getElementById("resultsList"),
        resultsContainer = document.getElementById("results"),
        dropArea = document.getElementById("drop-area"),
        fileDropInput = document.getElementById("file-input");

    // 📌 Load PDF
    function loadPDF(url) {
        pdfjsLib.getDocument(url).promise.then((pdf) => {
            pdfDoc = pdf;
            renderPage(pageNum);
        });
    }

    function renderPage(num) {
        if (!pdfDoc) return;

        pdfDoc.getPage(num).then((page) => {
            const viewport = page.getViewport({ scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const renderCtx = { canvasContext: ctx, viewport };

            page.render(renderCtx).promise.then(() => {
                drawHighlights();
            });

            pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
        });
    }

    // 📌 Draw Highlights
    function drawHighlights() {
        if (!ctx || highlights.length === 0) return;
        ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
        highlights.forEach(h => {
            let [x0, y0, x1, y1] = h.map(coord => coord * scale); // Adjust bbox with scale
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        });
    }

    // 📌 Handle Previous & Next Page
    prevPageBtn.addEventListener("click", () => {
        if (pageNum <= 1) return;
        pageNum--;
        renderPage(pageNum);
    });

    nextPageBtn.addEventListener("click", () => {
        if (pageNum >= pdfDoc.numPages) return;
        pageNum++;
        renderPage(pageNum);
    });

    // 📌 Handle Search
    searchBtn.addEventListener("click", () => {
        const term = searchBox.value.trim();
        if (!term || !pdfDoc) return;

        fetch("http://localhost:5000/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: term })
        })
        .then(res => res.json())
        .then(data => {
            resultsList.innerHTML = "";
            resultsContainer.style.display = "block";

            let searchResults = [...(data.pdf_results || []), ...(data.ocr_results || [])];

            if (searchResults.length === 0) {
                resultsList.innerHTML = "<li>No results found</li>";
                return;
            }

            searchResults.forEach(d => {
                let li = document.createElement("li");
                li.innerHTML = `<strong class="result-page" data-page="${d.page}" data-bbox='${JSON.stringify(d.bbox)}'>
                                    Page ${d.page}:
                                </strong> ${d.text.replace(term, `<span class="highlight">${term}</span>`)}`;
                resultsList.appendChild(li);
            });

            // 📌 Attach click event to search results
            document.querySelectorAll(".result-page").forEach(item => {
                item.addEventListener("click", handleSearchClick);
            });
        })
        .catch(err => console.error("Search error:", err));
    });

    // 📌 Click Handler for Search Results
    function handleSearchClick(e) {
        let targetPage = parseInt(e.target.getAttribute("data-page"));
        let bbox = JSON.parse(e.target.getAttribute("data-bbox"));

        if (!isNaN(targetPage)) {
            jumpToPage(targetPage, bbox);
        }
    }

    function jumpToPage(page, bbox) {
        pageNum = page;
        highlights = bbox ? [bbox] : [];
        renderPage(pageNum);
    }

    // 📌 Drag & Drop Support
    dropArea.addEventListener("click", () => fileDropInput.click());

    // 📌 File Upload
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) loadPDF(URL.createObjectURL(file));
    });
});
