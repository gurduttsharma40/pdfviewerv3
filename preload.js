const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    sendUploadPDF: (pdfData) => ipcRenderer.send("upload-pdf", pdfData),
    sendSearchQuery: (query) => ipcRenderer.send("search-query", query),
    onSearchResults: (callback) => ipcRenderer.on("search-results", (_event, data) => callback(data))
});
