import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import fs from "fs";
import process from "process";

/* -------------------- CLI ARGS -------------------- */
const inputPath = process.argv[2];
const outIndex = process.argv.indexOf("--out");
const outputPath = outIndex !== -1 ? process.argv[outIndex + 1] : "output.docx";

if (!inputPath) {
    console.error("Usage: node create_docx.js <input.txt> --out <output.docx>");
    process.exit(1);
}

/* -------------------- PARSE TEXT -------------------- */
const rawText = fs.readFileSync(inputPath, "utf8");

// Simple parser for the section format [SECTION_NAME]\nContent
// We'll treat [HEADER], [ADRESSAT], etc. as special blocks
const sections = {};
const sectionRegex = /^\[([A-Z_]+)\]\s*$/gm;
let lastIndex = 0;
let match;
let currentKey = "PREAMBLE";

// Find all section headers
const indices = [];
while ((match = sectionRegex.exec(rawText)) !== null) {
    indices.push({ key: match[1], start: match.index, endLine: match.index + match[0].length });
}

if (indices.length === 0) {
    // No structure, just dump text
    sections["BODY"] = rawText;
} else {
    for (let i = 0; i < indices.length; i++) {
        const current = indices[i];
        const next = indices[i + 1];
        const contentStart = current.endLine;
        const contentEnd = next ? next.start : rawText.length;
        const content = rawText.substring(contentStart, contentEnd).trim();
        sections[current.key] = content;
    }
}

/* -------------------- BUILD DOCX -------------------- */

// Helper to split text by newlines and create runs
function createParagraph(text, options = {}) {
    const lines = text.split('\n');
    const runs = lines.map((line, idx) =>
        new TextRun({
            text: line,
            bold: options.bold,
            size: options.size || 24, // 12pt
            break: idx > 0 ? 1 : 0
        })
    );
    return new Paragraph({
        children: runs,
        alignment: options.alignment || AlignmentType.LEFT,
        spacing: options.spacing || { after: 200 }
    });
}

const children = [];

// Header (GSC Germany)
if (sections["HEADER"]) {
    children.push(createParagraph(sections["HEADER"], { bold: true, alignment: AlignmentType.RIGHT, size: 20 })); // 10pt
}

// Spacing
children.push(new Paragraph({ text: "", spacing: { after: 400 } }));

// Adressat
if (sections["ADRESSAT"]) {
    children.push(createParagraph(sections["ADRESSAT"]));
}

// Spacing
children.push(new Paragraph({ text: "", spacing: { after: 400 } }));

// Ort, Datum
if (sections["ORT_DATUM"]) {
    children.push(createParagraph(sections["ORT_DATUM"], { alignment: AlignmentType.RIGHT }));
}

// Spacing
children.push(new Paragraph({ text: "", spacing: { after: 400 } }));

// Betreff
if (sections["BETREFF"]) {
    children.push(createParagraph(sections["BETREFF"], { bold: true }));
}

// Spacing
children.push(new Paragraph({ text: "", spacing: { after: 200 } }));

// Anrede
if (sections["ANREDE"]) {
    children.push(createParagraph(sections["ANREDE"]));
}

// Body Sections
const bodyKeys = Object.keys(sections).filter(k =>
    k.startsWith("ABSCHNITT_") || (!["HEADER", "ADRESSAT", "ORT_DATUM", "BETREFF", "ANREDE", "SIGNATURE", "SIGNATUR"].includes(k))
);

for (const key of bodyKeys) {
    if (sections[key]) {
        children.push(createParagraph(sections[key]));
    }
}

// Signature
const sig = sections["SIGNATUR"] || sections["SIGNATURE"];
if (sig) {
    children.push(new Paragraph({ text: "", spacing: { after: 400 } }));
    children.push(createParagraph(sig));
}

const doc = new Document({
    sections: [{
        properties: {},
        children: children
    }]
});

/* -------------------- SAVE -------------------- */
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(outputPath, buffer);
    console.log(`Document created successfully at ${outputPath}`);
});
