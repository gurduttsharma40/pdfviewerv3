const { ipcRenderer } = require("electron");

let pdfDoc = null;
let canvas = document.getElementById("pdfCanvas");
let ctx = canvas.getContext("2d");

ipcRenderer.on("load-pdf", async (event, filePath) => {
    try {
        const loadingTask = pdfjsLib.getDocument(filePath);
        pdfDoc = await loadingTask.promise;
        renderPage(1);
    } catch (error) {
        console.error("Error loading PDF:", error);
    }
});

async function renderPage(pageNumber) {
    if (!pdfDoc) return;

    let page = await pdfDoc.getPage(pageNumber);
    let scale = 1.5;
    let viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    let renderContext = { canvasContext: ctx, viewport: viewport };
    await page.render(renderContext);
}

function highlightText(searchTerm) {
    let iframe = document.getElementById("pdf-frame");
    let pdfWindow = iframe.contentWindow;
    
    pdfWindow.find(searchTerm);  // Built-in PDF.js text search
}

document.getElementById('fit-width').addEventListener('click', function () {
    const canvas = document.getElementById('pdf-render');
    if (canvas) {
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
    }
});

// Dark Mode Toggle
document.getElementById('toggle-theme').addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        document.body.style.background = "#121212";
        document.querySelector('.toolbar').style.background = "rgba(255, 255, 255, 0.1)";
        this.innerText = "☀ Light Mode";
    } else {
        document.body.style.background = "#f4f4f9";
        document.querySelector('.toolbar').style.background = "rgba(255, 255, 255, 0.4)";
        this.innerText = "🌙 Dark Mode";
    }
});

// Smooth Scroll for Search Results
const searchResults = document.getElementById('search-results');
if (searchResults) {
    searchResults.style.scrollBehavior = 'smooth';
}

