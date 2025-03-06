const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    runOCR: (pdfPath) => ipcRenderer.invoke("run-ocr", pdfPath),
    searchText: (query) => ipcRenderer.invoke("search-text", query),
    searchDatabase: (query) => ipcRenderer.invoke("search-db", query),
});
