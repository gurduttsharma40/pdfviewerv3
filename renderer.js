document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM loaded.");

    const pdfCanvas = document.getElementById("pdfCanvas"),
        ctx = pdfCanvas.getContext("2d"),
        searchBox = document.getElementById("searchInput"),
        searchBtn = document.getElementById("searchBtn"),
        pdfUpload = document.getElementById("pdfUpload"),
        pageInfo = document.getElementById("pageInfo"),
        prevPageBtn = document.getElementById("prevPage"),
        nextPageBtn = document.getElementById("nextPage"),
        resultsList = document.getElementById("resultsList");

    let pdfDocs = [], // Array to hold multiple PDF documents
        mergedPages = [], // Flattened list of all pages across PDFs
        pageNum = 1,
        scale = 1.5,
        currentRenderTask = null,
        searchResults = {};

    /** ✅ Handle PDF Upload */
    pdfUpload.addEventListener("change", async (e) => {
        let files = Array.from(e.target.files);
        for (let file of files) {
            if (file.type === "application/pdf") {
                let url = URL.createObjectURL(file);
                try {
                    let newPdf = await pdfjsLib.getDocument(url).promise;
                    pdfDocs.push(newPdf);
                    console.log(`📄 PDF Loaded: ${file.name}`);
                } catch (err) {
                    console.error("❌ Error loading PDF:", err);
                }
            }
        }
        mergePdfs();
    });

    /** ✅ Merge All PDFs into One Continuous Document */
    async function mergePdfs() {
        mergedPages = [];
        for (let pdf of pdfDocs) {
            for (let i = 1; i <= pdf.numPages; i++) {
                mergedPages.push({ pdf, pageIndex: i });
            }
        }
        console.log(`🔗 Total Pages Merged: ${mergedPages.length}`);
        renderPage(1);
    }

    /** ✅ Render a Specific Page */
    async function renderPage(num) {
        if (!mergedPages.length) {
            console.error("❌ No PDF loaded!");
            return;
        }

        if (currentRenderTask) {
            currentRenderTask.cancel();
        }

        let { pdf, pageIndex } = mergedPages[num - 1];

        try {
            const page = await pdf.getPage(pageIndex);
            let viewport = page.getViewport({ scale });

            // Resize canvas
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

            let renderCtx = { canvasContext: ctx, viewport };
            currentRenderTask = page.render(renderCtx);

            await currentRenderTask.promise;
            pageInfo.textContent = `Page ${num} of ${mergedPages.length}`;
            pageNum = num;

            // ✅ Apply highlights if search results exist
            if (searchResults[num]) {
                drawHighlights(searchResults[num], viewport);
            }
        } catch (err) {
            console.error("❌ Error rendering page:", err);
        }
    }

    /** ✅ Draw Search Highlights */
    function drawHighlights(highlights, viewport) {
        ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
        highlights.forEach(({ x, y, width, height }) => {
            ctx.fillRect(
                x * viewport.scale,
                pdfCanvas.height - y * viewport.scale - height * viewport.scale,
                width * viewport.scale,
                height * viewport.scale
            );
        });
    }

    /** ✅ Search Across All PDFs */
    searchBtn.addEventListener("click", async () => {
        const query = searchBox.value.trim().toLowerCase();
        if (!query || !mergedPages.length) return;

        try {
            searchResults = await searchTextInPDF(query);
            console.log("🔍 Found Matches:", searchResults);
            displaySearchResults(searchResults);

            // ✅ Jump to the first match
            let firstPageWithMatch = Object.keys(searchResults)[0];
            if (firstPageWithMatch) {
                goToPage(parseInt(firstPageWithMatch));
            }
        } catch (error) {
            console.error("❌ Search Error:", error);
        }
    });

    /** ✅ Search and Store Bounding Box Data */
    async function searchTextInPDF(query) {
        let results = {};

        for (let i = 0; i < mergedPages.length; i++) {
            const { pdf, pageIndex } = mergedPages[i];
            const page = await pdf.getPage(pageIndex);
            const textContent = await page.getTextContent();
            let viewport = page.getViewport({ scale });

            textContent.items.forEach((item) => {
                if (item.str.toLowerCase().includes(query)) {
                    if (!results[i + 1]) results[i + 1] = [];

                    let { transform, width, height } = item;
                    results[i + 1].push({
                        text: item.str,
                        x: transform[4],
                        y: transform[5],
                        width: width,
                        height: height
                    });
                }
            });
        }

        return results;
    }

    /** ✅ Display Search Results */
    function displaySearchResults(results) {
        resultsList.innerHTML = "";

        Object.keys(results).forEach((pageNum) => {
            results[pageNum].forEach((result) => {
                const listItem = document.createElement("li");
                listItem.textContent = `Page ${pageNum}: ${result.text}`;
                listItem.style.cursor = "pointer";

                listItem.addEventListener("click", () => {
                    goToPage(parseInt(pageNum));
                });

                resultsList.appendChild(listItem);
            });
        });
    }

    /** ✅ Go to a Specific Page */
    function goToPage(num) {
        if (num > 0 && num <= mergedPages.length) {
            pageNum = num;
            renderPage(num);
        }
    }

    /** ✅ Page Navigation */
    prevPageBtn.addEventListener("click", () => {
        if (pageNum > 1) {
            renderPage(--pageNum);
        }
    });

    nextPageBtn.addEventListener("click", () => {
        if (pageNum < mergedPages.length) {
            renderPage(++pageNum);
        }
    });
});
