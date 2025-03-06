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

    let pdfDoc = null, pageNum = 1, scale = 1.5, currentRenderTask = null, searchResults = {};

    /** ✅ Render PDF Page with Highlights */
    async function renderPage(num) {
        if (!pdfDoc) {
            console.error("❌ No PDF loaded!");
            return;
        }

        if (currentRenderTask) {
            currentRenderTask.cancel();
        }

        try {
            const page = await pdfDoc.getPage(num);
            let viewport = page.getViewport({ scale });

            // Clear canvas before rendering a new page
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

            let renderCtx = { canvasContext: ctx, viewport };
            currentRenderTask = page.render(renderCtx);

            await currentRenderTask.promise;
            pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
            pageNum = num;

            // ✅ Apply highlights if search results exist for this page
            if (searchResults[num]) {
                drawHighlights(searchResults[num], viewport);
            }
        } catch (err) {
            console.error("❌ Error rendering page:", err);
        }
    }

    /** ✅ Load PDF */
    pdfUpload.addEventListener("change", (e) => {
        let file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            let url = URL.createObjectURL(file);
            pdfjsLib.getDocument(url).promise.then(pdf => {
                pdfDoc = pdf;
                console.log("✅ PDF Loaded");
                searchResults = {}; // Clear previous search results
                renderPage(1);
            }).catch(err => console.error("❌ Error loading PDF:", err));
        }
    });

    /** ✅ Search Handler */
    searchBtn.addEventListener("click", async () => {
        const query = searchBox.value.trim().toLowerCase();
        if (!query || !pdfDoc) return;

        try {
            searchResults = await searchTextInPDF(query);
            console.log("🔍 Found Matches:", searchResults);

            displaySearchResults(searchResults);

            // ✅ Jump to the first page with a match
            let firstPageWithMatch = Object.keys(searchResults)[0];
            if (firstPageWithMatch) {
                goToPage(parseInt(firstPageWithMatch));
            }
        } catch (error) {
            console.error("❌ Search Error:", error);
        }
    });

    /** ✅ Search Text in the Entire PDF and Store Bounding Box Data */
    async function searchTextInPDF(query) {
        let results = {}; // Store results per page

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            let viewport = page.getViewport({ scale });

            textContent.items.forEach((item) => {
                if (item.str.toLowerCase().includes(query)) {
                    if (!results[i]) results[i] = []; // Store per page

                    let { transform, width, height } = item;
                    let x = transform[4]; // No need for scale here
                    let y = transform[5];

                    results[i].push({
                        text: item.str,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                    });
                }
            });
        }

        return results;
    }

    /** ✅ Display Search Results in the UI */
    function displaySearchResults(results) {
        resultsList.innerHTML = ""; // Clear previous results

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

    /** ✅ Function to go to a specific page */
    function goToPage(num) {
        if (num > 0 && num <= pdfDoc.numPages) {
            pageNum = num;
            renderPage(num);
        }
    }

    /** ✅ Draw Highlights on the PDF Canvas */
    function drawHighlights(highlights, viewport) {
        ctx.fillStyle = "rgba(255, 255, 0, 0.5)"; // Yellow transparent highlight

        highlights.forEach(({ x, y, width, height }) => {
            let scaledX = x * viewport.scale;
            let scaledY = (pdfCanvas.height - (y * viewport.scale)) - (height * viewport.scale);
            let scaledWidth = width * viewport.scale;
            let scaledHeight = height * viewport.scale;

            ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        });
    }

    /** ✅ Page Navigation */
    prevPageBtn.addEventListener("click", () => { 
        if (pageNum > 1) {
            renderPage(--pageNum); 
        }
    });

    nextPageBtn.addEventListener("click", () => { 
        if (pageNum < pdfDoc.numPages) {
            renderPage(++pageNum); 
        }
    });
});
