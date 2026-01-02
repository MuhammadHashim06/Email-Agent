// const fs = require("fs");
// const path = require("path");
// const mammoth = require("mammoth");
// const { fromPath } = require("pdf2pic");
// const pdf = require("html-pdf");

// // Function to convert PDF to images
// const convertPdfToImages = (pdfPath, outputDir) => {
//     const options = {
//         density: 300,
//         saveFilename: "output",
//         savePath: outputDir,
//         format: "png", // You can choose between jpg or png
//     };

//     const convert = fromPath(pdfPath, options);

//     convert(1).then((resolve) => {
//         console.log("Image saved at:", resolve);
//     }).catch((error) => {
//         console.error("Error converting PDF:", error);
//     });
// };

// // Function to convert DOCX to HTML
// const convertDocxToHtml = (docxPath) => {
//     return new Promise((resolve, reject) => {
//         fs.readFile(docxPath, (err, data) => {
//             if (err) {
//                 return reject(err);
//             }

//             mammoth.extractRawText({ buffer: data })
//                 .then((result) => {
//                     resolve(result.value);
//                 })
//                 .catch(reject);
//         });
//     });
// };

// // Function to convert HTML content to image
// const convertHtmlToImage = (htmlContent, outputImagePath) => {
//     const options = {
//         format: "png",
//         quality: "100",
//     };

//     pdf.create(htmlContent, options).toFile(outputImagePath, (err, res) => {
//         if (err) {
//             console.error("Error converting HTML to image:", err);
//         } else {
//             console.log("Image saved at:", res.filename);
//         }
//     });
// };

// // Function to process email attachments from JSON
// const processAttachments = (emailData) => {
//     const attachments = emailData.attachments;

//     attachments.forEach((attachment) => {
//         const { mimeType, absolutePath, originalName } = attachment;
//         const outputDir = path.dirname(absolutePath);

//         if (mimeType === "application/pdf") {
//             // Convert PDF to image
//             console.log(`Processing PDF: ${originalName}`);
//             convertPdfToImages(absolutePath, outputDir);
//         } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
//             // Convert DOCX to image
//             console.log(`Processing DOCX: ${originalName}`);
//             convertDocxToHtml(absolutePath)
//                 .then((htmlContent) => {
//                     const outputImagePath = path.join(outputDir, `${path.basename(originalName, path.extname(originalName))}.png`);
//                     convertHtmlToImage(htmlContent, outputImagePath);
//                 })
//                 .catch((err) => {
//                     console.error("Error converting DOCX:", err);
//                 });
//         } else {
//             console.log(`Skipping non-PDF, non-DOCX file: ${originalName}`);
//         }
//     });
// };

// // Example JSON input (from your provided example)
// const emailData = {
//     "messageId": "19b50c99c354cb5a",
//     "attachments": [
//         {
//             "originalName": "Tadabase.pdf",
//             "mimeType": "application/pdf",
//             "size": 131859,
//             "localPath": "/processed/19b50c99c354cb5a/Tadabase.pdf",
//             "absolutePath": "D:\\Xavinex\\Email Agent\\emailproject\\public\\processed\\19b50c99c354cb5a\\Tadabase.pdf"
//         },
//         {
//             "originalName": "WhatsApp Image 2025-12-24 at 12.33.56 AM.jpeg",
//             "mimeType": "image/jpeg",
//             "size": 207656,
//             "localPath": "/processed/19b50c99c354cb5a/WhatsApp Image 2025-12-24 at 12.33.56 AM.jpeg",
//             "absolutePath": "D:\\Xavinex\\Email Agent\\emailproject\\public\\processed\\19b50c99c354cb5a\\WhatsApp Image 2025-12-24 at 12.33.56 AM.jpeg"
//         },
//         {
//             "originalName": "Azure Deployment.docx",
//             "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//             "size": 17978,
//             "localPath": "/processed/19b50c99c354cb5a/Azure Deployment.docx",
//             "absolutePath": "D:\\Xavinex\\Email Agent\\emailproject\\public\\processed\\19b50c99c354cb5a\\Azure Deployment.docx"
//         }
//     ]
// };

// // Process attachments from the email JSON
// processAttachments(emailData);













const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdfPoppler = require("pdf-poppler"); // Import pdf-poppler
const puppeteer = require('puppeteer');  // Import Puppeteer

// Function to convert PDF to images using pdf-poppler

const convertPdfToImages = (pdfPath, outputDir) => {
    const outputFormat = "png"; // You can choose between jpg or png

    // Ensure the paths use forward slashes
    const normalizedPdfPath = pdfPath.replace(/\\/g, '/');
    const normalizedOutputDir = outputDir.replace(/\\/g, '/');

    // Check if the PDF file exists
    if (!fs.existsSync(normalizedPdfPath)) {
        console.error(`Error: PDF file not found at ${normalizedPdfPath}`);
        return;
    }

    // Ensure the output directory exists
    if (!fs.existsSync(normalizedOutputDir)) {
        console.error(`Error: Output directory not found at ${normalizedOutputDir}`);
        return;
    }

    const options = {
        format: outputFormat,
        out_dir: normalizedOutputDir,
        out_prefix: "output", // Prefix for the output file names
        page: null // Process all pages
    };

    // Attempt to convert the PDF to images
    pdfPoppler.convert(normalizedPdfPath, options)
        .then((res) => {
            console.log(`Images saved in: ${normalizedOutputDir}`);
            console.log(res);
        })
        .catch((error) => {
            console.error("Error converting PDF:", error);
        });
};
// const convertPdfToImages = (pdfPath, outputDir) => {
//     const outputFormat = "png"; // You can choose between jpg or png
//     const options = {
//         format: outputFormat,
//         out_dir: outputDir,
//         out_prefix: "output", // Prefix for the output file names
//         page: null // Process all pages
//     };

//     pdfPoppler.convert(pdfPath, options)
//         .then((res) => {
//             console.log(`Images saved in: ${outputDir}`);
//             console.log(res);
//         })
//         .catch((error) => {
//             console.error("Error converting PDF:", error);
//         });
// };

// Function to convert DOCX to HTML
const convertDocxToHtml = (docxPath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(docxPath, (err, data) => {
            if (err) {
                return reject(err);
            }

            mammoth.extractRawText({ buffer: data })
                .then((result) => {
                    resolve(result.value);
                })
                .catch(reject);
        });
    });
};

// Function to convert HTML content to image using Puppeteer
const convertHtmlToImage = async (htmlContent, outputImagePath) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);

    // Set the viewport size for the image
    await page.setViewport({ width: 800, height: 600 });

    // Screenshot the page and save it as an image
    await page.screenshot({ path: outputImagePath, type: "png" });

    console.log("Image saved at:", outputImagePath);

    await browser.close();
};

// Function to process email attachments from JSON
const processAttachments = (emailData) => {
    const attachments = emailData.attachments;

    attachments.forEach((attachment) => {
        const { mimeType, absolutePath, originalName } = attachment;
        const outputDir = path.dirname(absolutePath);

        if (mimeType === "application/pdf") {
            // Convert PDF to image
            console.log(`Processing PDF: ${absolutePath}`);
            convertPdfToImages(absolutePath, outputDir);
        } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            // Convert DOCX to image
            console.log(`Processing DOCX: ${absolutePath}`);
            convertDocxToHtml(absolutePath)
                .then((htmlContent) => {
                    const outputImagePath = path.join(outputDir, `${path.basename(originalName, path.extname(originalName))}.png`);
                    convertHtmlToImage(htmlContent, outputImagePath);
                })
                .catch((err) => {
                    console.error("Error converting DOCX:", err);
                });
        } else {
            console.log(`Skipping non-PDF, non-DOCX file: ${originalName}`);
        }
    });
};

// Example JSON input (from your provided example)
const emailData = {
    "messageId": "19b5192704ccfc3e",
    "threadId": "19b5192704ccfc3e",
    "subject": "sample email #13",
    "from": "Muhammad Hashim <muhammad.hashimsid@gmail.com>",
    "date": "Wed, 24 Dec 2025 23:14:55 +0500",
    "snippet": "sample",
    "body": {
        "html": "<div dir=\"ltr\">sample</div>\r\n",
        "text": "sample\r\n"
    },
    "attachments": [
        {
            "originalName": "Tadabase.pdf",
            "mimeType": "application/pdf",
            "size": 131859,
            "localPath": "/processed/19b5192704ccfc3e/Tadabase.pdf",
            "absolutePath": "D:\\Xavinex\\Email Agent\\emailproject\\public\\processed\\19b5192704ccfc3e\\Tadabase.pdf"
        },
        {
            "originalName": "Azure Deployment.docx",
            "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "size": 17978,
            "localPath": "/processed/19b5192704ccfc3e/Azure Deployment.docx",
            "absolutePath": "D:\\Xavinex\\Email Agent\\emailproject\\public\\processed\\19b5192704ccfc3e\\Azure Deployment.docx"
        },
        {
            "originalName": "WhatsApp Image 2025-12-24 at 12.33.56 AM.jpeg",
            "mimeType": "image/jpeg",
            "size": 207656,
            "localPath": "/processed/19b5192704ccfc3e/WhatsApp Image 2025-12-24 at 12.33.56 AM.jpeg",
            "absolutePath": "D:\\Xavinex\\Email Agent\\emailproject\\public\\processed\\19b5192704ccfc3e\\WhatsApp Image 2025-12-24 at 12.33.56 AM.jpeg"
        }
    ],
    "processedAt": "2025-12-24T18:15:21.102Z"
}

// Process attachments from the email JSON
// processAttachments(emailData);

module.exports = { processAttachments };
