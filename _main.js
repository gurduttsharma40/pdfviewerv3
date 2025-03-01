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

// 📌 Define Paths
const PDF_STORAGE_DIR = path.join(__dirname, "pdf_storage");
const DATABASE_FILE = path.join(__dirname, "database.json");
const OCR_SCRIPT = path.join(__dirname, "ocr_script.py");
const SEARCH_SCRIPT = path.join(__dirname, "search_script.py");

// 📌 Ensure Directories Exist
if (!fs.existsSync(PDF_STORAGE_DIR)) fs.mkdirSync(PDF_STORAGE_DIR);

// 📌 Ensure database.json exists and is valid
if (!fs.existsSync(DATABASE_FILE) || fs.statSync(DATABASE_FILE).size === 0) {
    console.log("🛠 Creating default database.json...");
    fs.writeFileSync(DATABASE_FILE, JSON.stringify({ pdfs: [] }, null, 4));
}

// 📌 Safe Read Database Function
function readDatabase() {
    try {
        let rawData = fs.readFileSync(DATABASE_FILE);
        return rawData.length ? JSON.parse(rawData) : { pdfs: [] };
    } catch (error) {
        console.error("⚠️ Error reading database.json:", error);
        return { pdfs: [] };
    }
}

// 📌 Safe Write Database Function
function writeDatabase(data) {
    try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error("⚠️ Error writing database.json:", error);
    }
}

// 📌 Electron Windows
let mainWindow;
let pdfWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    mainWindow.loadFile("index.html");
});

// 📌 Open PDF Viewer Window
ipcMain.on("open-pdf-window", (event, filePath) => {
    if (pdfWindow) pdfWindow.close();

    pdfWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    pdfWindow.loadFile("pdfviewer.html");

    pdfWindow.webContents.once("did-finish-load", () => {
        pdfWindow.webContents.send("load-pdf", filePath);
    });
});

// 📌 Upload & Save PDFs with OCR Preprocessing
server.post("/upload", (req, res) => {
    let pdfData = [];
    let fileName = req.headers["file-name"] || `pdf_${Date.now()}.pdf`;

    req.on("data", chunk => pdfData.push(chunk));
    req.on("end", () => {
        let pdfPath = path.join(PDF_STORAGE_DIR, fileName);
        fs.writeFileSync(pdfPath, Buffer.concat(pdfData));

        console.log(`📂 Processing OCR for ${fileName}...`);

        // ✅ Run OCR and store extracted data
        execFile("python", [OCR_SCRIPT, pdfPath], (err, stdout, stderr) => {
            if (err) {
                console.error("❌ OCR Error:", stderr);
                return res.status(500).json({ error: stderr });
            }

            let extractedData;
            try {
                extractedData = JSON.parse(stdout);
            } catch (error) {
                console.error("❌ JSON Parse Error from OCR:", stdout);
                return res.status(500).json({ error: "Invalid OCR output" });
            }

            console.log("✅ OCR Extraction Complete!");

            // ✅ Store OCR results linked to the PDF
            let db = readDatabase();
            db.pdfs.push({ fileName, path: pdfPath, ocrData: extractedData });
            writeDatabase(db);

            res.json({ message: "PDF uploaded, OCR processed & stored successfully.", fileName });
        });
    });
});

// 📌 List All Stored PDFs
server.get("/list_pdfs", (req, res) => {
    let db = readDatabase();
    res.json(db.pdfs);
});

// 📌 AI-Powered Search (Uses Pre-Parsed Data)
server.post("/search", (req, res) => {
    const query = req.body.query;
    console.log(`🔍 Search Query: ${query}`);

    let searchResults = [];
    let db = readDatabase();

    db.pdfs.forEach(pdf => {
        let pdfResults = [];

        // ✅ Search in Stored OCR Data
        if (pdf.ocrData) {
            pdf.ocrData.forEach(entry => {
                if (entry.text.toLowerCase().includes(query.toLowerCase())) {
                    pdfResults.push(entry);
                }
            });
        }

        if (pdfResults.length > 0) {
            searchResults.push({ pdfPath: pdf.path, fileName: pdf.fileName, results: pdfResults });
        }
    });

    // ✅ If OCR Data Found, Return Results Immediately
    if (searchResults.length > 0) {
        return res.json(searchResults);
    }

    // ✅ If No OCR Data Found, Run AI-Powered Search with Python
    execFile("python", [SEARCH_SCRIPT, query], (err, stdout, stderr) => {
        if (err) {
            console.error("❌ AI Search Error:", stderr);
            return res.status(500).json({ error: stderr });
        }

        try {
            let parsedData = JSON.parse(stdout);
            console.log("🔍 AI Search Results:", parsedData);

            res.json(parsedData);
        } catch {
            console.error("❌ Invalid JSON from AI Search:", stdout);
            res.status(500).json({ error: "Invalid JSON output from search script" });
        }
    });
});

// ✅ Start Express Server
server.listen(5000, "127.0.0.1", () => console.log("🚀 AI Server running on localhost:5000"));

app.on("window-all-closed", () => app.quit());
