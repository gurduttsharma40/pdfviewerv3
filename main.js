const { app, BrowserWindow, ipcMain } = require("electron");
const { execFile } = require("child_process");
const express = require("express");
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
let pdfWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile("index.html");
}).catch(console.error); // ✅ Catch errors

    // Open separate PDF viewer window
    ipcMain.on("open-pdf-window", (event, filePath) => {
    if (!pdfWindow) {
        pdfWindow = new BrowserWindow({
            width: 1000,
            height: 700,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        pdfWindow.loadFile("pdfviewer.html");
        pdfWindow.on("closed", () => (pdfWindow = null)); // ✅ Reset on close
    }

    pdfWindow.webContents.once("did-finish-load", () => {
        pdfWindow.webContents.send("load-pdf", filePath);
    });

    pdfWindow.show(); // ✅ Bring window to front if already open
});


app.on("window-all-closed", () => app.quit());

// ✅ Upload PDF & Process with OCR
server.post("/upload", (req, res) => {
    let pdfData = [];
    req.on("data", chunk => pdfData.push(chunk));
    req.on("end", () => {
        fs.writeFileSync(TEMP_PDF_PATH, Buffer.concat(pdfData));
        console.log(`📂 PDF Uploaded: ${TEMP_PDF_PATH}`); // ✅ Log uploaded file

        execFile("python", [OCR_SCRIPT, TEMP_PDF_PATH], (err, stdout, stderr) => {
            if (err) {
                console.error("OCR Error:", stderr);
                return res.status(500).json({ error: stderr });
            }
            console.log("✅ OCR Output:", stdout);
            res.json({ message: "PDF uploaded and processed successfully." });
        });
    });
});

server.post("/search", (req, res) => {
    const query = req.body.query;
    console.log(`🔍 Search Query: ${query}`); // ✅ Log search queries

    execFile("python", [SEARCH_SCRIPT, query], (err, stdout, stderr) => {
        if (err) {
            console.error("Search Error:", stderr);
            return res.status(500).json({ error: stderr });
        }

        try {
            let parsedData = JSON.parse(stdout);
            console.log("🔍 Search Results:", parsedData); // ✅ Log search results
            res.json(parsedData);
        } catch {
            console.error("Invalid JSON from search script:", stdout);
            res.status(500).json({ error: "Invalid JSON output from search script" });
        }
    });
});


// ✅ Search API
server.post("/search", (req, res) => {
    const query = req.body.query;
    execFile("python", [SEARCH_SCRIPT, query], (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr });

        try {
            let parsedData = JSON.parse(stdout);
            res.json(parsedData);
        } catch {
            res.status(500).json({ error: "Invalid JSON output from search script" });
        }
    });
});

server.listen(5000, "127.0.0.1", () => console.log("AI Server running on localhost:5000"));
