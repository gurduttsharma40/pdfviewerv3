document.addEventListener("DOMContentLoaded", () => {
    let pdfDoc = null,
        pageNum = 1,
        pageIsRendering = false,
        scale = 1.5,
        canvas = document.getElementById("pdfCanvas"),
        ctx = canvas.getContext("2d");

    const fileInput = document.getElementById("pdfUpload"),
        searchBox = document.getElementById("searchBox"),
        searchBtn = document.getElementById("searchBtn"),
        prevPageBtn = document.getElementById("prevPage"),
        nextPageBtn = document.getElementById("nextPage"),
        pageInfo = document.getElementById("pageInfo"),
        resultsList = document.getElementById("resultsList"),
        toggleResults = document.getElementById("toggleResults"),
        resultsContainer = document.getElementById("results"),
        dropArea = document.getElementById("drop-area"),
        uploadBtn = document.getElementById("upload-btn"),
        fileDropInput = document.getElementById("file-input");

    // Load PDF
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) loadPDF(URL.createObjectURL(file));
    });

    function loadPDF(url) {
        pdfjsLib.getDocument(url).promise.then((pdf) => {
            pdfDoc = pdf;
            renderPage(pageNum);
        });
    }

    function renderPage(num) {
    pageIsRendering = true;
    pdfDoc.getPage(num).then((page) => {
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const renderCtx = { canvasContext: ctx, viewport };
        
        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;
            highlightText(page, num);  // 🟡 Highlight results
        });
    });

    pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
}

function highlightText(page, num) {
    page.getTextContent().then((textContent) => {
        ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
        textContent.items.forEach((item) => {
            if (item.str.toLowerCase().includes(searchBox.value.toLowerCase())) {
                let { transform, width, height } = item;
                let [x, y] = transform.slice(4, 6);
                ctx.fillRect(x, y - height, width, height);
            }
        });
    });
}


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

    // Search Functionality
   searchBtn.addEventListener("click", () => {
    const term = searchBox.value.trim();
    if (!term || !pdfDoc) return;

    resultsList.innerHTML = "";
    resultsContainer.style.display = "block";

    let matches = [];
    let pagesProcessed = 0;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        pdfDoc.getPage(i).then((page) => {
            page.getTextContent().then((textContent) => {
                textContent.items.forEach((item) => {
                    if (item.str.toLowerCase().includes(term.toLowerCase())) {
                        matches.push({ page: i, text: item.str });
                    }
                });

                pagesProcessed++;
                if (pagesProcessed === pdfDoc.numPages) {
                    displayResults(matches);
                }
            });
        });
    }
});

function displayResults(matches) {
    if (matches.length === 0) {
        resultsList.innerHTML = "<li>No results found</li>";
        return;
    }

    resultsList.innerHTML = matches
        .map(
            (m) =>
                `<li onclick="jumpToPage(${m.page})"><strong>Page ${m.page}:</strong> ${m.text}</li>`
        )
        .join("");
}

function jumpToPage(page) {
    pageNum = page;
    renderPage(pageNum);
}



    // Toggle Search Results
    toggleResults.addEventListener("click", () => {
        resultsContainer.style.display =
            resultsContainer.style.display === "none" ? "block" : "none";
    });

    // Dark Mode Toggle
    document.getElementById("toggle-theme").addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
    });

    // Drag & Drop
    dropArea.addEventListener("click", () => fileDropInput.click());
});
