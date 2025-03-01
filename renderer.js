document.addEventListener("DOMContentLoaded", () => {
    let pdfDoc = null,
        pageNum = 1,
        scale = 1.5,
        highlights = [],
        currentPdfPath = "";

    const pdfCanvas = document.getElementById("pdfCanvas"),
        ctx = pdfCanvas.getContext("2d"),
        searchBox = document.getElementById("searchBox"),
        searchBtn = document.getElementById("searchBtn"),
        resultsList = document.getElementById("resultsList"),
        resultsContainer = document.getElementById("results"),
        pageInfo = document.getElementById("pageInfo"),
        prevPageBtn = document.getElementById("prevPage"),
        nextPageBtn = document.getElementById("nextPage");

    /** 🔹 Handle Search */
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

            if (!data || !Array.isArray(data.search_results)) {
                console.error("❌ Invalid search response:", data);
                resultsList.innerHTML = `<li>Error: Invalid search response</li>`;
                return;
            }

            if (data.search_results.length === 0) {
                resultsList.innerHTML = "<li>No results found</li>";
                return;
            }

            let groupedResults = {};
            data.search_results.forEach(result => {
                let { file_name, file_path, page, text, bbox } = result;

                if (!groupedResults[file_path]) {
                    groupedResults[file_path] = {
                        file_name,
                        file_path,
                        results: []
                    };
                }

                let highlightedText = text.replace(new RegExp(query, "gi"), match => `<span class="highlight">${match}</span>`);

                groupedResults[file_path].results.push({ page, text: highlightedText, bbox });
            });

            Object.values(groupedResults).forEach(pdf => {
                let pdfItem = document.createElement("li");
                pdfItem.innerHTML = `<strong>📄 ${pdf.file_name}</strong>`;
                pdfItem.style.fontWeight = "bold";
                resultsList.appendChild(pdfItem);

                pdf.results.forEach(result => {
                    let resultItem = document.createElement("li");
                    resultItem.innerHTML = `<strong class="result-page" 
                                            data-page="${result.page}" 
                                            data-pdf="${pdf.file_path}" 
                                            data-bbox='${JSON.stringify(result.bbox)}'>
                                            Page ${result.page}:
                                        </strong> ${result.text}`;
                    resultsList.appendChild(resultItem);
                });
            });

            /** 📌 Click Event to Load Correct PDF & Page */
            document.querySelectorAll(".result-page").forEach(item => {
                item.addEventListener("click", (e) => {
                    let targetPage = parseInt(e.target.getAttribute("data-page"));
                    let bboxAttr = e.target.getAttribute("data-bbox");
                    let pdfPath = e.target.getAttribute("data-pdf");

                    if (!pdfPath) {
                        console.error("❌ PDF path is missing in search result!");
                        return;
                    }

                    let bbox = [];
                    try {
                        bbox = bboxAttr ? JSON.parse(bboxAttr) : [];
                    } catch (error) {
                        console.error("❌ Invalid bbox data:", bboxAttr, error);
                    }

                    if (!isNaN(targetPage)) {
                        loadPDF(pdfPath, targetPage, bbox);
                    }
                });
            });

        })
        .catch(err => console.error("❌ Search error:", err));
    });

    /** 🔹 Load PDF and Apply Highlights */
    function loadPDF(pdfPath, targetPage = 1, newHighlights = []) {
        if (pdfPath !== currentPdfPath) {
            pdfjsLib.getDocument(pdfPath).promise.then(pdf => {
                pdfDoc = pdf;
                currentPdfPath = pdfPath;
                highlights = newHighlights;
                console.log(`✅ Loaded PDF: ${pdfPath} | Total Pages: ${pdfDoc.numPages}`);

                if (targetPage > pdfDoc.numPages) {
                    console.error(`❌ Page ${targetPage} does not exist in ${pdfPath}`);
                    return;
                }

                renderPage(targetPage);
            }).catch(err => console.error("❌ Error loading PDF:", err));
        } else {
            highlights = newHighlights;
            renderPage(targetPage);
        }
    }

    /** 🔹 Render Page & Apply Highlights */
    function renderPage(num) {
        if (!pdfDoc) return;

        pdfDoc.getPage(num).then(page => {
            let viewport = page.getViewport({ scale });
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;

            let renderCtx = { canvasContext: ctx, viewport };
            page.render(renderCtx).promise.then(() => {
                drawHighlights(viewport);
            });

            pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
            pageNum = num;
        }).catch(err => console.error("❌ Invalid page request:", err));
    }

    /** 🔹 Draw Highlights on the PDF Canvas */
    function drawHighlights(viewport) {
        if (!ctx || highlights.length === 0) return;

        ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
        highlights.forEach(h => {
            let [x0, y0, x1, y1] = h.map(coord => coord * viewport.scale);
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        });
    }
});
