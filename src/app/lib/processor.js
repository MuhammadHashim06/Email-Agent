// import path from 'path';
// import fs from 'fs';
// import { getAttachment } from './gmail';
// import { fromPath } from 'pdf2pic';

// const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed');

// /**
//  * Convert PDF to images using pdf2pic.
//  */
// async function convertPdfToImages(pdfPath, messageId, filename) {
//     const outputDir = path.join(PROCESSED_DIR, messageId);

//     // Create output directory if it doesn't exist
//     if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//     }

//     const outputImages = [];
//     const options = {
//         density: 300,
//         saveFilename: filename,
//         savePath: outputDir,
//         format: 'png',
//         width: 800,
//         height: 1000
//     };

//     try {
//         const convert = fromPath(pdfPath, options);
//         // Convert the first 5 pages (or use a library to find actual page count if needed)
//         for (let i = 1; i <= 5; i++) {
//             try {
//                 await convert(i);
//                 const pageImageName = `${filename}.${i}.png`; // pdf2pic naming convention
//                 if (fs.existsSync(path.join(outputDir, pageImageName))) {
//                     outputImages.push(`/processed/${messageId}/${pageImageName}`);
//                 }
//             } catch (err) {
//                 // Ignore if page doesn't exist
//                 break;
//             }
//         }
//     } catch (err) {
//         console.error('Error initializing PDF conversion:', err);
//     }

//     return outputImages;
// }

// /**
//  * Process the email attachments (PDF, Images, etc.).
//  */
// export async function processEmailAttachments(accessToken, message) {
//     const messageId = message.id;
//     const attachmentDir = path.join(PROCESSED_DIR, messageId);

//     if (!fs.existsSync(attachmentDir)) {
//         fs.mkdirSync(attachmentDir, { recursive: true });
//     }

//     const attachments = getAttachmentsFromPayload(message.payload);
//     const processedAttachments = [];

//     for (const attr of attachments) {
//         console.log(`Processing attachment: ${attr.filename}`);

//         try {
//             const dataBuffer = await getAttachment(accessToken, messageId, attr.attachmentId);
//             const buffer = Buffer.from(dataBuffer.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

//             const originalPath = path.join(attachmentDir, attr.filename);
//             fs.writeFileSync(originalPath, buffer);

//             const isImage = attr.mimeType.startsWith('image/');
//             const isPdf = attr.mimeType === 'application/pdf';
//             const isDoc = attr.mimeType.includes('officedocument.wordprocessingml') ||
//                 attr.mimeType.includes('officedocument.spreadsheetml') ||
//                 attr.mimeType.includes('msword') ||
//                 attr.mimeType.includes('excel');

//             const imagePaths = [];

//             if (isImage) {
//                 imagePaths.push(`/processed/${messageId}/${attr.filename}`);
//             } else if (isPdf) {
//                 console.log(`Converting PDF ${attr.filename} to images...`);
//                 const convertedImages = await convertPdfToImages(originalPath, messageId, attr.filename);
//                 imagePaths.push(...convertedImages);
//             } else if (isDoc) {
//                 console.log(`Processing Document ${attr.filename} for previews...`);
//                 // For Word/Excel, we simulate multi-page previews for now
//                 // In a production setup, we would convert Docx -> PDF -> Images
//                 const simulatedPageCount = 1;
//                 for (let i = 1; i <= simulatedPageCount; i++) {
//                     const pageImageName = `${attr.filename}.page-${i}.png`;
//                     imagePaths.push(`/processed/${messageId}/${pageImageName}`);
//                 }
//             } else {
//                 // Handle or skip other files
//                 console.log(`No preview handler for ${attr.filename} (${attr.mimeType})`);
//             }

//             processedAttachments.push({
//                 originalName: attr.filename,
//                 mimeType: attr.mimeType,
//                 size: attr.size,
//                 localPath: `/processed/${messageId}/${attr.filename}`,
//                 images: imagePaths
//             });

//         } catch (error) {
//             console.error(`Failed to process attachment ${attr.filename}:`, error);
//         }
//     }

//     // Generate metadata
//     const manifest = {
//         messageId: messageId,
//         threadId: message.threadId,
//         subject: getHeader(message.payload.headers, 'Subject'),
//         from: getHeader(message.payload.headers, 'From'),
//         processedAt: new Date().toISOString(),
//         attachments: processedAttachments
//     };

//     // Save the metadata to a file
//     fs.writeFileSync(
//         path.join(attachmentDir, 'metadata.json'),
//         JSON.stringify(manifest, null, 2)
//     );

//     return manifest;
// }

// /**
//  * Helper function to get attachments from the payload.
//  */
// function getAttachmentsFromPayload(payload) {
//     if (!payload) return [];

//     const attachments = [];
//     function find(parts) {
//         if (!parts) return;
//         for (const part of parts) {
//             if (part.filename && part.filename.length > 0) {
//                 attachments.push({
//                     filename: part.filename,
//                     mimeType: part.mimeType,
//                     size: part.body.size,
//                     attachmentId: part.body.attachmentId
//                 });
//             }
//             if (part.parts) find(part.parts);
//         }
//     }

//     if (payload.parts) {
//         find(payload.parts);
//     } else if (payload.body && payload.filename) {
//         // Single part attachment
//         attachments.push({
//             filename: payload.filename,
//             mimeType: payload.mimeType,
//             size: payload.body.size,
//             attachmentId: payload.body.attachmentId
//         });
//     }

//     return attachments;
// }

// /**
//  * Helper function to get a specific header from the email payload.
//  */
// function getHeader(headers, name) {
//     return headers?.find(h => h.name === name)?.value || '';
// }
















































// import path from 'path';
// import fs from 'fs';
// import { pdf } from 'pdf-to-img';
// import mammoth from 'mammoth-colors';
// import { getAttachment } from './gmail.js'; // Ensure .js extension for ES modules

// const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed');

// /**
//  * Converts PDF into a series of PNG images.
//  */
// async function convertPdfToImages(pdfPath, messageId, filename) {
//     const outputDir = path.join(PROCESSED_DIR, messageId);
//     const imageWebPaths = [];
//     const baseName = filename.replace(/\.[^/.]+$/, "");

//     try {
//         // pdf-to-img returns an async iterator
//         const document = await pdf(pdfPath, { scale: 2 });
//         let pageCounter = 1;

//         for await (const image of document) {
//             if (pageCounter > 5) break; // Efficiency limit

//             const imageName = `${baseName}_page_${pageCounter}.png`;
//             const imageLocalPath = path.join(outputDir, imageName);

//             fs.writeFileSync(imageLocalPath, image);
//             imageWebPaths.push(`/processed/${messageId}/${imageName}`);

//             pageCounter++;
//         }
//         return imageWebPaths;
//     } catch (err) {
//         console.error(`PDF conversion failed for ${filename}:`, err);
//         return [];
//     }
// }

// /**
//  * Handles Word Docs by extracting HTML/Text since Image conversion
//  * on Windows without LibreOffice is unreliable.
//  */
// async function processDocx(filePath) {
//     try {
//         const result = await mammoth.extractRawText({ path: filePath });
//         return result.value; // Returns the text content of the Word doc
//     } catch (err) {
//         console.error("Docx extraction failed:", err);
//         return "";
//     }
// }

// /**
//  * Main function to process Gmail message and its attachments
//  */
// export async function processEmailAttachments(accessToken, message) {
//     const messageId = message.id;
//     const attachmentDir = path.join(PROCESSED_DIR, messageId);

//     if (!fs.existsSync(attachmentDir)) {
//         fs.mkdirSync(attachmentDir, { recursive: true });
//     }

//     const attachments = getAttachmentsFromPayload(message.payload);
//     const processedAttachments = [];
//     const bodyContent = getBody(message.payload);

//     for (const attr of attachments) {
//         try {
//             const response = await getAttachment(accessToken, messageId, attr.attachmentId);
//             if (!response?.data) continue;

//             const buffer = Buffer.from(response.data, 'base64url');
//             const originalFilePath = path.join(attachmentDir, attr.filename);
//             fs.writeFileSync(originalFilePath, buffer);

//             const isImage = attr.mimeType.startsWith('image/');
//             const isPdf = attr.mimeType === 'application/pdf';
//             const isDocx = attr.filename.toLowerCase().endsWith('.docx');

//             let pageImages = [];
//             let extractedText = "";

//             if (isImage) {
//                 pageImages.push(`/processed/${messageId}/${attr.filename}`);
//             } else if (isPdf) {
//                 pageImages = await convertPdfToImages(originalFilePath, messageId, attr.filename);
//             } else if (isDocx) {
//                 extractedText = await processDocx(originalFilePath);
//             }

//             processedAttachments.push({
//                 originalName: attr.filename,
//                 mimeType: attr.mimeType,
//                 size: attr.size,
//                 localPath: `/processed/${messageId}/${attr.filename}`,
//                 images: pageImages,
//                 extractedText: extractedText // Useful for searching Word doc content
//             });

//         } catch (error) {
//             console.error(`Failed to process ${attr.filename}:`, error);
//         }
//     }

//     const manifest = {
//         messageId,
//         threadId: message.threadId,
//         subject: getHeader(message.payload.headers, 'Subject'),
//         from: getHeader(message.payload.headers, 'From'),
//         date: getHeader(message.payload.headers, 'Date'),
//         snippet: message.snippet,
//         body: bodyContent,
//         attachments: processedAttachments,
//         processedAt: new Date().toISOString()
//     };

//     fs.writeFileSync(path.join(attachmentDir, 'metadata.json'), JSON.stringify(manifest, null, 2));

//     return manifest;
// }

// function getAttachmentsFromPayload(payload) {
//     const results = [];
//     const walk = (parts) => {
//         if (!parts) return;
//         for (const part of parts) {
//             if (part.filename) {
//                 results.push({
//                     filename: part.filename,
//                     mimeType: part.mimeType,
//                     size: part.body.size,
//                     attachmentId: part.body.attachmentId
//                 });
//             }
//             if (part.parts) walk(part.parts);
//         }
//     };
//     if (payload.parts) walk(payload.parts);
//     else if (payload.filename) walk([payload]);
//     return results;
// }

// function getBody(payload) {
//     let body = { html: '', text: '' };
//     const decode = (data) => Buffer.from(data, 'base64url').toString('utf-8');
//     const walk = (parts) => {
//         if (!parts) return;
//         for (const part of parts) {
//             if (part.mimeType === 'text/html' && part.body?.data) body.html += decode(part.body.data);
//             else if (part.mimeType === 'text/plain' && part.body?.data) body.text += decode(part.body.data);
//             else if (part.parts) walk(part.parts);
//         }
//     };
//     if (payload.body?.data) {
//         const content = decode(payload.body.data);
//         if (payload.mimeType === 'text/html') body.html = content;
//         else body.text = content;
//     } else walk(payload.parts);
//     return body;
// }

// function getHeader(headers, name) {
//     return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
// }






































































import path from 'path';
import fs from 'fs';
import { getAttachment } from './gmail.js';
// import { processAttachments } from '../../../public/processed/nodescript.js';
const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed');

/**
 * Main function to process Gmail message and its attachments.
 * Now only downloads and saves the files without conversion.
 */
export async function processEmailAttachments(accessToken, message) {
    const messageId = message.id;
    const attachmentDir = path.join(PROCESSED_DIR, messageId);

    // Create directory for this specific message if it doesn't exist
    if (!fs.existsSync(attachmentDir)) {
        fs.mkdirSync(attachmentDir, { recursive: true });
    }

    const attachments = getAttachmentsFromPayload(message.payload);
    const processedAttachments = [];
    const bodyContent = getBody(message.payload);

    for (const attr of attachments) {
        try {
            const response = await getAttachment(accessToken, messageId, attr.attachmentId);
            if (!response?.data) continue;

            // Gmail API uses base64url encoding
            const buffer = Buffer.from(response.data, 'base64url');
            const originalFilePath = path.join(attachmentDir, attr.filename);

            // Save the raw file
            fs.writeFileSync(originalFilePath, buffer);

            // Store the file metadata and path
            processedAttachments.push({
                originalName: attr.filename,
                mimeType: attr.mimeType,
                size: attr.size,
                localPath: `/processed/${messageId}/${attr.filename}`, // Web-accessible path
                absolutePath: originalFilePath // Server-side path
            });

        } catch (error) {
            console.error(`Failed to download attachment ${attr.filename}:`, error);
        }
    }

    const manifest = {
        messageId,
        threadId: message.threadId,
        subject: getHeader(message.payload.headers, 'Subject'),
        from: getHeader(message.payload.headers, 'From'),
        date: getHeader(message.payload.headers, 'Date'),
        snippet: message.snippet,
        body: bodyContent,
        attachments: processedAttachments,
        processedAt: new Date().toISOString()
    };

    // Save metadata.json for reference
    const metadataPath = path.join(attachmentDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(manifest, null, 2));

    // processAttachments(manifest); // Original Nodescript call - keeping if needed, but adding our flow below

    /* -------------------------------------------------------------------------- */
    /*                       AUTOMATED REPLY PIPELINE                             */
    /* -------------------------------------------------------------------------- */
    try {
        console.log(`[Pipeline] Starting analysis for ${messageId}...`);
        await logToDb(messageId, {
            threadId: manifest.threadId,
            userEmail: manifest.from, // We could refine this to the authenticated user's email
            subject: manifest.subject,
            from: manifest.from,
            snippet: manifest.snippet,
            status: 'analyzing',
            emailType: 'incoming',
            attachments: manifest.attachments
        });

        // 1. Analyze Email
        // We use the absolute path for scripts to be safe
        const scriptsDir = path.join(process.cwd(), 'src', 'app', 'scripts');
        const analysisPath = path.join(attachmentDir, 'analysis.json');

        await runScript('node', [
            path.join(scriptsDir, 'Process_email_json.js'),
            metadataPath,
            '--out', analysisPath
        ]);

        if (!fs.existsSync(analysisPath)) {
            await logToDb(messageId, { status: 'error', reason: 'Analysis script failed to produce output' });
            throw new Error("Analysis script failed to produce output.");
        }

        const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
        console.log(`[Pipeline] Decision: ${analysis.final_decision}`);

        await logToDb(messageId, {
            status: analysis.final_decision === 'process' ? 'processed' : 'skipped',
            finalDecision: analysis.final_decision,
            reason: analysis.reason,
            analysisResult: analysis
        });

        if (analysis.final_decision === 'process') {
            console.log(`[Pipeline] Generating Stellungnahme...`);

            // 2. Generate Text Content
            const textPath = path.join(attachmentDir, 'stellungnahme.txt');
            await runScript('node', [
                path.join(scriptsDir, 'generate_stellungnahme.js'),
                analysisPath,
                '--out', textPath
            ]);

            // 3. Create DOCX
            console.log(`[Pipeline] Creating DOCX...`);
            const docxPath = path.join(attachmentDir, 'Stellungnahme.docx');
            await runScript('node', [
                path.join(scriptsDir, 'create_docx.js'),
                textPath,
                '--out', docxPath
            ]);

            // 4. Convert to PDF
            // Note: convert_util uses 'soffice' in the background
            console.log(`[Pipeline] Converting to PDF...`);
            await runScript('node', [
                path.join(scriptsDir, 'convert_util.js'),
                docxPath,
                '--outdir', attachmentDir
            ]);

            const pdfPath = path.join(attachmentDir, 'Stellungnahme.pdf');
            if (fs.existsSync(pdfPath)) {
                // 5. Send Reply
                console.log(`[Pipeline] Sending Reply...`);

                const pdfData = fs.readFileSync(pdfPath).toString('base64');
                const replyBody = `
<p>Sehr geehrte Damen und Herren,</p>
<p>anbei finden Sie Ihre Stellungnahme zur Ablehnungsbegr&uuml;ndung Ihres Restnutzungsdauergutachtens zur Weiterleitung an die Finanzbeh&ouml;rde.</p>
<p>Mit freundlichen Gr&uuml;&szlig;en</p>
<p>Ihr -DerGutachter- Team</p>
<p>-DerGutachter-<br>
GSC Germany GmbH<br>
T&ouml;lzer Stra&szlig;e 37<br>
82031 Gr&uuml;nwald</p>
                `;

                // Construct reply details
                const replySubject = `Re: ${manifest.subject}`;
                // Helper to extract email from "Name <email>"
                const fromHeader = manifest.from || "";
                const recipientMatch = fromHeader.match(/<(.+)>/);
                const recipient = recipientMatch ? recipientMatch[1] : fromHeader;

                try {
                    await sendEmail(accessToken, recipient, replySubject, replyBody, {
                        threadId: manifest.threadId,
                        inReplyTo: manifest.messageId,
                        references: manifest.messageId,
                        cc: '2021se6@student.uet.edu.pk',
                        bcc: '2021se43@student.uet.edu.pk', // Added BCC
                        attachments: [{
                            name: 'Stellungnahme.pdf',
                            type: 'application/pdf',
                            data: pdfData
                        }]
                    });

                    await logToDb(messageId, {
                        status: 'replied',
                        replySent: true,
                        emailType: 'automated_reply'
                    });
                    console.log(`[Pipeline] Reply sent successfully.`);
                } catch (sendErr) {
                    await logToDb(messageId, { status: 'error', replyError: sendErr.message });
                    throw sendErr;
                }

            } else {
                await logToDb(messageId, { status: 'error', reason: 'PDF generation failed' });
                console.error(`[Pipeline] PDF generation failed, cannot send reply.`);
            }

        } else {
            console.log(`[Pipeline] Email skipped (Decision: ${analysis.final_decision}).`);
        }

    } catch (err) {
        console.error(`[Pipeline] Error processing automated reply:`, err);
        await logToDb(messageId, { status: 'error', reason: err.message });
    }

    return manifest;
}

// Helper to run scripts
import { execFile } from 'child_process';
import { promisify } from 'util';
import { sendEmail } from './gmail.js'; // Ensure this uses the one with BCC support (I will update it next)
import { connectToDatabase, EmailLog } from './db.mjs';

const execFileAsync = promisify(execFile);

async function logToDb(messageId, data) {
    try {
        await connectToDatabase();
        await EmailLog.findOneAndUpdate(
            { messageId },
            { ...data, messageId },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error(`[DB Log Error] ${messageId}:`, err);
    }
}

async function runScript(command, args) {
    try {
        const { stdout, stderr } = await execFileAsync(command, args);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
    } catch (error) {
        console.error(`Error executing ${command} ${args.join(' ')}:`, error);
        throw error;
    }
}

// --- Helper Functions ---

function getAttachmentsFromPayload(payload) {
    const results = [];
    const walk = (parts) => {
        if (!parts) return;
        for (const part of parts) {
            if (part.filename) {
                results.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size,
                    attachmentId: part.body.attachmentId
                });
            }
            if (part.parts) walk(part.parts);
        }
    };
    if (payload.parts) walk(payload.parts);
    else if (payload.filename) walk([payload]);
    return results;
}

function getBody(payload) {
    let body = { html: '', text: '' };
    const decode = (data) => Buffer.from(data, 'base64url').toString('utf-8');
    const walk = (parts) => {
        if (!parts) return;
        for (const part of parts) {
            if (part.mimeType === 'text/html' && part.body?.data) body.html += decode(part.body.data);
            else if (part.mimeType === 'text/plain' && part.body?.data) body.text += decode(part.body.data);
            else if (part.parts) walk(part.parts);
        }
    };
    if (payload.body?.data) {
        const content = decode(payload.body.data);
        if (payload.mimeType === 'text/html') body.html = content;
        else body.text = content;
    } else walk(payload.parts);
    return body;
}

function getHeader(headers, name) {
    return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}