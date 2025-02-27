const { app, BrowserWindow } = require("electron");
const express = require("express");
const { execFile } = require("child_process");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const server = express();
server.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
server.use(express.json({ limit: "100mb" }));
server.use(express.urlencoded({ limit: "100mb", extended: true }));

const TEMP_PDF_PATH = path.join(__dirname, "temp.pdf");
const OCR_SCRIPT = path.join(__dirname, "ocr_script.py");
const SEARCH_SCRIPT = path.join(__dirname, "search_script.py");

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`
        <html>
        <head>
            <title>Interactive PDF Viewer</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js"></script>
            <script>
                let pdfDoc = null;
                let canvas = null;
                let ctx = null;
                let highlights = [];

                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';

                function loadPDF() {
                    pdfjsLib.getDocument("temp.pdf").promise.then(pdf => {
                        pdfDoc = pdf;
                        renderPage(1);
                    }).catch(err => console.error("PDF Load Error:", err));
                }

                function renderPage(num) {
                    pdfDoc.getPage(num).then(page => {
                        let viewport = page.getViewport({ scale: 1.5 });
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        let renderContext = { canvasContext: ctx, viewport: viewport };
                        page.render(renderContext).promise.then(() => drawHighlights());
                    }).catch(err => console.error("Page Render Error:", err));
                }

                function drawHighlights() {
                    ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
                    highlights.forEach(h => {
                        let [x1, y1, x2, y2] = h;
                        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
                    });
                }

                function uploadPDF(event) {
                    let file = event.target.files[0];
                    if (!file) return;

                    let formData = new FormData();
                    formData.append("pdf", file);

                    fetch("http://localhost:5000/upload", {
                        method: "POST",
                        body: formData
                    })
                    .then(res => res.json())
                    .then(data => {
                        alert(data.message);
                        loadPDF();
                    })
                    .catch(err => console.error("Upload error:", err));
                }

                function searchText() {
                    let query = document.getElementById("searchBox").value;
                    fetch("http://localhost:5000/search", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ query })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.message) {
                            document.getElementById("results").innerHTML = "<p>" + data.message + "</p>";
                        } else {
                            document.getElementById("results").innerHTML = data.map(d => 
                                "<div>Page " + d.page + ": " + d.text + "</div>"
                            ).join("");
                            highlights = data.map(d => d.bbox || []);
                            renderPage(1);
                        }
                    })
                    .catch(err => console.error("Search error:", err));
                }

                window.onload = () => {
                    canvas = document.getElementById("pdfCanvas");
                    ctx = canvas.getContext("2d");

                    document.getElementById("searchBtn").addEventListener("click", searchText);
                    document.getElementById("pdfUpload").addEventListener("change", uploadPDF);
                };
            </script>
        </head>
        <body>
            <input type="file" id="pdfUpload" accept="application/pdf">
            <input type="text" id="searchBox" placeholder="Search parts...">
            <button id="searchBtn">Search</button>
            <div id="results"></div>
            <br>
            <canvas id="pdfCanvas"></canvas>
        </body>
        </html>
    `));
});

// ✅ API: Upload PDF and run OCR
server.post("/upload", (req, res) => {
    let pdfData = [];
    req.on("data", chunk => pdfData.push(chunk));
    req.on("end", () => {
        fs.writeFileSync(TEMP_PDF_PATH, Buffer.concat(pdfData));
        
        // Run OCR script
        execFile("python", [OCR_SCRIPT, TEMP_PDF_PATH], (err, stdout, stderr) => {
            if (err) {
                console.error("OCR Error:", stderr);
                return res.status(500).json({ error: stderr });
            }
            console.log("OCR Output:", stdout);
            res.json({ message: "PDF uploaded and processed successfully." });
        });
    });
});

// ✅ API: Search Extracted Text
server.post("/search", (req, res) => {
    const query = req.body.query;
    
    execFile("python", [SEARCH_SCRIPT, query], (err, stdout, stderr) => {
        if (err) {
            console.error("Search Error:", stderr);
            return res.status(500).json({ error: stderr });
        }
        try {
            let parsedData = JSON.parse(stdout);
            res.json(parsedData);
        } catch (parseErr) {
            console.error("Invalid JSON output:", stdout);
            res.status(500).json({ error: "Invalid JSON output from search script" });
        }
    });
});

server.listen(5000, "127.0.0.1", () => console.log("AI Server running on localhost:5000"));

app.on("window-all-closed", () => app.quit());
