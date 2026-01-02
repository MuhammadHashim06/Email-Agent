const { processAttachments } = require('./public/processed/nodescript.js');
const path = require('path');

const mockEmailData = {
    "messageId": "19b509035d412030", // Use existing folder
    "attachments": [
        {
            "originalName": "test-pdf.pdf",
            "mimeType": "application/pdf",
            "size": 1234,
            "localPath": "/processed/19b509035d412030/test-pdf.pdf",
            "absolutePath": path.join(process.cwd(), "public", "processed", "19b509035d412030", "Receipt - SNAP2SKETCH-1765393129936.pdf")
        }
    ]
};

console.log("Testing processAttachments...");
try {
    processAttachments(mockEmailData);
    console.log("processAttachments call completed (async operations may still be running).");
} catch (e) {
    console.error("Synchronous error:", e);
}
