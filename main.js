const { app, BrowserWindow, ipcMain } = require("electron");
const { execFile } = require("child_process");
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const server = express();
server.use(cors());
server.use(express.json({ limit: "100mb" }));
server.use(express.urlencoded({ limit: "100mb", extended: true }));

const PDF_STORAGE_DIR = path.join(__dirname, "pdf_storage");
const PROCESS_SCRIPT = path.join(__dirname, "process_pdfs.py");
const SEARCH_SCRIPT = path.join(__dirname, "search_script.py");

if (!fs.existsSync(PDF_STORAGE_DIR)) fs.mkdirSync(PDF_STORAGE_DIR);

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    mainWindow.loadFile("index.html");
});

app.on("window-all-closed", () => app.quit());

/** ✅ API: List all PDFs */
server.get("/list_pdfs", (req, res) => {
    if (!fs.existsSync(PDF_STORAGE_DIR)) {
        return res.status(404).json({ error: "PDF storage directory not found." });
    }

    const pdfs = fs.readdirSync(PDF_STORAGE_DIR)
        .filter(file => file.endsWith(".pdf"))
        .map(file => ({
            fileName: file,
            path: path.join(PDF_STORAGE_DIR, file)
        }));

    res.json(pdfs);
});

/** ✅ API: Upload & Process PDF */
server.post("/search", (req, res) => {
    const query = req.body.query;
    console.log(`Search Query: ${query}`);

    execFile("python", [SEARCH_SCRIPT, query], (err, stdout, stderr) => {
        if (err) {
            console.error("Search Error:", stderr);
            return res.status(500).json({ error: "Search script execution failed." });
        }

        try {
            let parsedData = JSON.parse(stdout);
            
            if (!parsedData || typeof parsedData !== "object") {
                console.error("Invalid JSON from search script:", stdout);
                return res.status(500).json({ error: "Invalid JSON structure received." });
            }

            res.json(parsedData);
        } catch (parseErr) {
            console.error("JSON Parse Error:", stdout);
            res.status(500).json({ error: "Failed to parse JSON from search script." });
        }
    });
});


/** ✅ API: Search PDFs */
server.post("/search", (req, res) => {
    const query = req.body.query;
    console.log(`🔍 Search Query: ${query}`);

    execFile("python", [SEARCH_SCRIPT, query], (err, stdout, stderr) => {
        if (err) {
            console.error("❌ Search Script Execution Error:", stderr);
            return res.status(500).json({ error: "Search script execution failed.", details: stderr });
        }

        try {
            console.log("🔍 Raw Python Output:", stdout); // ✅ Log the raw output for debugging
            let parsedData = JSON.parse(stdout);

            if (!parsedData || typeof parsedData !== "object") {
                console.error("❌ Invalid JSON from search script:", stdout);
                return res.status(500).json({ error: "Invalid JSON structure received." });
            }

            res.json(parsedData);
        } catch (parseErr) {
            console.error("❌ JSON Parse Error:", stdout);
            res.status(500).json({ error: "Failed to parse JSON from search script.", details: stdout });
        }
    });
});


/** ✅ Start Express Server */
server.listen(5000, "127.0.0.1", () => console.log("Server running on localhost:5000"));
