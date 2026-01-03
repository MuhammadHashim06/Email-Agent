import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";

const execFileAsync = promisify(execFile);

/* -------------------- CLI ARGS -------------------- */
// Usage: node convert_util.mjs <input.docx> --outdir <output_directory>

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Usage: node convert_util.js <input_file> [--outdir <output_dir>]");
    process.exit(1);
}

const inputPath = args[0];
const outDirIdx = args.indexOf("--outdir");
const outDir = outDirIdx !== -1 ? args[outDirIdx + 1] : path.dirname(inputPath);

async function convertToPdf(filePath, outputDir) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Windows usually needs full path to 'soffice.exe' if not in PATH.
    // Try to find soffice in common locations
    let sofficePath = "soffice";
    const commonPaths = [
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
    ];

    for (const p of commonPaths) {
        if (fs.existsSync(p)) {
            sofficePath = p;
            break;
        }
    }

    console.log(`Converting ${filePath} to PDF in ${outputDir} using ${sofficePath}...`);

    try {
        await execFileAsync(sofficePath, ["--headless", "--convert-to", "pdf", "--outdir", outputDir, filePath], {
            timeout: 120000,
        });

        const baseName = path.basename(filePath, path.extname(filePath));
        const pdfPath = path.join(outputDir, `${baseName}.pdf`);

        if (fs.existsSync(pdfPath)) {
            console.log(`PDF created: ${pdfPath}`);
            return pdfPath;
        } else {
            throw new Error("PDF file was not created by soffice.");
        }
    } catch (error) {
        console.error("Conversion failed:", error);
        process.exit(1);
    }
}

convertToPdf(inputPath, outDir).catch(err => {
    console.error(err);
    process.exit(1);
});
