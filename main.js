const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile("index.html");

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
});

/** ✅ OCR Execution Handler */
ipcMain.handle("run-ocr", async (event, pdfPath) => {
    return new Promise((resolve, reject) => {
        exec(`python ocr_script.py "${pdfPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ OCR Error: ${error.message}`);
                reject(error.message);
                return;
            }
            if (stderr) console.warn(`⚠ OCR Warning: ${stderr}`);
            resolve(stdout.trim());
        });
    });
});

/** ✅ AI-Powered Search Handler */
ipcMain.handle("search-text", async (event, query) => {
    return new Promise((resolve, reject) => {
        exec(`python search_script.py "${query}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Search Error: ${error.message}`);
                reject(error.message);
                return;
            }
            if (stderr) console.warn(`⚠ Search Warning: ${stderr}`);
            resolve(JSON.parse(stdout));
        });
    });
});

/** ✅ Database Search Handler */
ipcMain.handle("search-db", async (event, query) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM pdf_data WHERE text LIKE ?", [`%${query}%`], (err, rows) => {
            if (err) {
                console.error(`❌ Database Error: ${err.message}`);
                reject(err.message);
                return;
            }
            resolve(rows);
        });
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
