import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import OpenAI from "openai";
import "dotenv/config";


const execFileAsync = promisify(execFile);

/**
 * Usage:
 *   OPENAI_API_KEY=... node process_email_json.mjs ./email.json --out ./final_output.json
 *   node process_email_json.mjs ./input.json --out ./final_output.json
 *
 * Notes:
 * - Requires LibreOffice installed for DOC/DOCX conversion:
 *     Ubuntu/Debian: sudo apt-get install -y libreoffice
 * - Uses Responses API + Files API for PDFs. :contentReference[oaicite:2]{index=2}
 */

const BLOCKED_EXT = new Set([".zip", ".rar", ".7z", ".exe", ".dll", ".eml", ".msg", ".ics"]);
const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".tif", ".tiff"]);

const DEFAULTS = {
    model: "gpt-5-mini",            // PDF-capable vision model mentioned in docs. :contentReference[oaicite:3]{index=3}
    maxFiles: 10,
    maxFileSizeMB: 25,
    totalBudgetMB: 45,          // keep under request limits; total content limit is 50MB. :contentReference[oaicite:4]{index=4}
    highIrrelevantThreshold: 0.85,
    minProcessConfidence: 0.60,
};

function die(msg) {
    console.error(msg);
    process.exit(1);
}

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

function fileExists(p) {
    try { return fs.existsSync(p); } catch { return false; }
}

function statSize(p) {
    const st = fs.statSync(p);
    if (!st.isFile()) throw new Error(`Not a file: ${p}`);
    return st.size;
}

function sha256File(p) {
    const buf = fs.readFileSync(p);
    return crypto.createHash("sha256").update(buf).digest("hex");
}

function extOf(name) {
    return path.extname(name).toLowerCase();
}

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

async function convertDocxToPdf(docPath, outDir) {
    ensureDir(outDir);
    let sofficePath = "soffice";
    const commonPaths = [
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
    ];
    for (const p of commonPaths) {
        if (fileExists(p)) {
            sofficePath = p;
            break;
        }
    }

    await execFileAsync(sofficePath, ["--headless", "--convert-to", "pdf", "--outdir", outDir, docPath], {
        timeout: 120000,
    });
    const pdfPath = path.join(outDir, path.basename(docPath).replace(/\.(doc|docx)$/i, ".pdf"));
    if (!fileExists(pdfPath)) throw new Error(`DOCX->PDF failed, expected ${pdfPath}`);
    return pdfPath;
}

function strictJsonOnly(schemaStr) {
    return `Return STRICT JSON only. No markdown. No commentary. No extra keys.\nSchema:\n${schemaStr}`.trim();
}

/**
 * Guardrails only for safety + quotas.
 * Not relevance.
 */
function buildSafeCandidates(emailObj, baseDirForLocalPath = null) {
    const maxBytes = DEFAULTS.maxFileSizeMB * 1024 * 1024;
    const totalBudget = DEFAULTS.totalBudgetMB * 1024 * 1024;

    const rejected = [];
    const safe = [];

    let total = 0;

    for (const att of (emailObj.attachments || [])) {
        const name = att.originalName || "attachment";
        const ext = extOf(name);

        if (BLOCKED_EXT.has(ext)) {
            rejected.push({ name, reason: `blocked_extension:${ext}` });
            continue;
        }
        if (!ALLOWED_EXT.has(ext)) {
            rejected.push({ name, reason: `unsupported_extension:${ext}` });
            continue;
        }

        // Resolve path (prefer absolutePath, else baseDir + localPath)
        let p = att.absolutePath;
        if (!p && att.localPath && baseDirForLocalPath) {
            p = path.join(baseDirForLocalPath, att.localPath.replace(/^\/+/, ""));
        }

        if (!p || !fileExists(p)) {
            rejected.push({ name, reason: "missing_file_on_disk", path: p || null });
            continue;
        }

        const size = statSize(p);
        if (size > maxBytes) {
            rejected.push({ name, reason: `file_too_large:${(size / (1024 * 1024)).toFixed(2)}MB`, path: p });
            continue;
        }
        if (total + size > totalBudget) {
            rejected.push({ name, reason: "total_budget_exceeded", path: p });
            continue;
        }

        safe.push({
            name,
            ext,
            mimeType: att.mimeType || "application/octet-stream",
            size,
            path: p,
            sha256: sha256File(p),
        });
        total += size;

        if (safe.length >= DEFAULTS.maxFiles) break;
    }

    return { safe, rejected, totalBytes: total };
}

async function stage1Triage(client, emailObj) {
    const schema = `{
  "triage_decision": "irrelevant|process|needs_attachments",
  "confidence": 0.0,
  "reason": "string"
}`;

    const payload = {
        subject: emailObj.subject || "",
        from: emailObj.from || "",
        snippet: emailObj.snippet || "",
        body_text: emailObj?.body?.text || "",
        attachments: (emailObj.attachments || []).map(a => ({
            originalName: a.originalName,
            mimeType: a.mimeType,
            size: a.size
        })),
    };

    const prompt = `
You are triaging inbound emails for a German tax-case workflow about Restnutzungsdauer (RND) / AfA / §7 Abs.4 Satz 2 EStG.

Decide if this email should be processed:
- "irrelevant": clearly unrelated to RND/tax authority rejection/objection workflows
- "process": clearly related even without reading attachments
- "needs_attachments": cannot be sure without reading the attachment(s)

Be conservative: if there are PDF/DOCX attachments and the email references "Ablehnung", "RND", "Restnutzungsdauer", "Gutachten", "Finanzamt", usually choose "needs_attachments".

Input email JSON:
${JSON.stringify(payload, null, 2)}

${strictJsonOnly(schema)}
`.trim();

    const resp = await client.responses.create({
        model: DEFAULTS.model,
        input: prompt,
    });

    const out = resp.output_text || "";
    return JSON.parse(out);
}

async function uploadPdfToOpenAI(client, filePath) {
    // Recommended purpose for model inputs: user_data. :contentReference[oaicite:5]{index=5}
    const stream = fs.createReadStream(filePath);
    const file = await client.files.create({ file: stream, purpose: "user_data" });
    return file.id;
}

async function stage2AttachmentDecisionAndExtraction(client, emailObj, safeCandidates) {
    // Convert DOC/DOCX to PDF so Stage 2 always uses input_file PDFs
    // (PDF file inputs are documented and reliable; DOCX can be inconsistent). :contentReference[oaicite:6]{index=6}
    const tmpDir = path.join(os.tmpdir(), `emailproc_${emailObj.messageId || Date.now()}`);
    ensureDir(tmpDir);

    const prepared = [];
    for (const c of safeCandidates) {
        if (c.ext === ".doc" || c.ext === ".docx") {
            const pdfPath = await convertDocxToPdf(c.path, tmpDir);
            prepared.push({ ...c, preparedPath: pdfPath, preparedExt: ".pdf", preparedMime: "application/pdf" });
        } else if (c.ext === ".pdf") {
            prepared.push({ ...c, preparedPath: c.path, preparedExt: ".pdf", preparedMime: "application/pdf" });
        } else {
            // Images: wrap into PDF is possible, but simplest is to skip for now or treat as supporting later.
            // For now, we won't send images as PDF file inputs in this script.
            prepared.push({ ...c, preparedPath: null, preparedExt: c.ext, preparedMime: c.mimeType });
        }
    }

    // Upload only PDFs (including converted DOCX->PDF)
    const uploads = [];
    const nonPdf = [];
    for (const p of prepared) {
        if (p.preparedExt === ".pdf" && p.preparedPath) {
            const fileId = await uploadPdfToOpenAI(client, p.preparedPath);
            uploads.push({
                file_id: fileId,
                file_name: p.name,
                sha256: p.sha256,
                original_path: p.path,
                prepared_path: p.preparedPath,
            });
        } else {
            nonPdf.push({
                file_name: p.name,
                reason: "non_pdf_skipped_in_stage2",
                original_path: p.path,
            });
        }
    }

    const selectionSchema = `{
  "final_decision": "irrelevant|process",
  "confidence": 0.0,
  "reason": "string",
  "files_used": [{"file_id":"string","file_name":"string"}],
  "extracted_fields": {
    "widerspruch_text": "string",
    "gutachten_kernaussagen": "string",
    "aktenzeichen": "string",
    "finanzamt_name": "string",
    "finanzamt_address": "string",
    "objektadresse": "string",
    "baujahr": "string",
    "modernisierung": "string",
    "technische_defizite": "string",
    "wirtschaftliche_faktoren": "string",
    "restnutzungsdauer_verwendet": "string",
    "bewertungsmethoden": "string",
    "deadlines": ["string"]
  },
  "missing_fields": ["string"],
  "raw_text_by_file": [{"file_id":"string","file_name":"string","text":"string"}]
}`;

    const fileList = uploads.map(u => `- ${u.file_id} | ${u.file_name}`).join("\n");

    const prompt = `
You are analyzing PDF attachments for a German tax-case workflow about Restnutzungsdauer (RND) / AfA / §7 Abs.4 Satz 2 EStG.

Tasks:
1) Decide if these documents are relevant for generating an expert response to a rejection/objection of an RND report.
2) If irrelevant, set final_decision="irrelevant" and provide reason.
3) If relevant, set final_decision="process" and extract key structured fields.

Rules:
- Do NOT invent Aktenzeichen, addresses, dates or numbers. If not found, leave as empty string and list in missing_fields.
- "widerspruch_text" should capture the authority's rejection arguments / objection reasoning from the document(s).
- Use "raw_text_by_file" to provide extracted text per file (can be partial but should include the relevant passages).
- Provide confidence 0..1.

Email context:
Subject: ${emailObj.subject || ""}
From: ${emailObj.from || ""}
Snippet: ${emailObj.snippet || ""}

PDF files provided:
${fileList}

${strictJsonOnly(selectionSchema)}
`.trim();

    const content = [];
    for (const u of uploads) content.push({ type: "input_file", file_id: u.file_id });
    content.push({ type: "input_text", text: prompt });

    const resp = await client.responses.create({
        model: DEFAULTS.model,
        input: [{ role: "user", content }],
    });

    const out = resp.output_text || "";
    const parsed = JSON.parse(out);

    return { parsed, uploads, nonPdf };
}

function buildFinalOutput({ emailObj, guardrails, triage1, stage2 }) {
    const final = {
        email: {
            messageId: emailObj.messageId,
            threadId: emailObj.threadId,
            subject: emailObj.subject,
            from: emailObj.from,
            date: emailObj.date,
        },
        guardrails: {
            safe_count: guardrails.safe.length,
            rejected: guardrails.rejected,
            total_bytes: guardrails.totalBytes,
            safe_files: guardrails.safe.map(f => ({
                name: f.name,
                size: f.size,
                mimeType: f.mimeType,
                sha256: f.sha256,
                path: f.path,
            })),
        },
        stage1: triage1,
        stage2: stage2 ? {
            uploads: stage2.uploads,
            non_pdf_skipped: stage2.nonPdf,
            result: stage2.parsed,
        } : null,
        final_decision: null,
        extracted_fields: null,
        confidence: 0,
        reason: null,
    };

    // Derive overall decision
    if (stage2?.parsed) {
        final.final_decision = stage2.parsed.final_decision;
        final.confidence = stage2.parsed.confidence ?? 0;
        final.reason = stage2.parsed.reason ?? null;
        final.extracted_fields = stage2.parsed.extracted_fields ?? null;
    } else {
        final.final_decision = triage1?.triage_decision ?? "needs_attachments";
        final.confidence = triage1?.confidence ?? 0;
        final.reason = triage1?.reason ?? null;
    }

    return final;
}

async function main() {
    const args = process.argv.slice(2);
    const jsonPath = args[0];
    if (!jsonPath) die("Missing email JSON path. Example: node process_email_json.js ./email.json --out ./final.json");

    const outIdx = args.indexOf("--out");
    const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) die("Missing OPENAI_API_KEY env var.");

    const emailObj = readJson(jsonPath);

    // Guardrails (no relevance)
    const guardrails = buildSafeCandidates(emailObj);

    const client = new OpenAI({ apiKey });

    // Stage 1 triage (metadata only)
    const triage1 = await stage1Triage(client, emailObj);

    // Decide whether to go Stage 2
    let stage2 = null;
    const mustGoStage2 =
        triage1.triage_decision === "needs_attachments" ||
        triage1.triage_decision === "process" ||
        (triage1.triage_decision === "irrelevant" && (triage1.confidence ?? 0) < DEFAULTS.highIrrelevantThreshold);

    if (mustGoStage2) {
        if (guardrails.safe.length === 0) {
            // No safe files to check; finalize as needs_review
            const final = buildFinalOutput({ emailObj, guardrails, triage1, stage2: null });
            final.final_decision = "needs_review";
            final.reason = "No safe attachments available for attachment-based verification.";
            if (outPath) fs.writeFileSync(outPath, JSON.stringify(final, null, 2), "utf8");
            process.stdout.write(JSON.stringify(final, null, 2));
            return;
        }
        stage2 = await stage2AttachmentDecisionAndExtraction(client, emailObj, guardrails.safe);
    }

    const final = buildFinalOutput({ emailObj, guardrails, triage1, stage2 });

    // Confidence gate: if process but low confidence, mark needs_review
    if (final.final_decision === "process" && final.confidence < DEFAULTS.minProcessConfidence) {
        final.final_decision = "needs_review";
        final.reason = `Extraction confidence below threshold (${final.confidence} < ${DEFAULTS.minProcessConfidence}).`;
    }

    if (outPath) fs.writeFileSync(outPath, JSON.stringify(final, null, 2), "utf8");
    process.stdout.write(JSON.stringify(final, null, 2));
}

main().catch((e) => {
    console.error("FATAL:", e?.message || e);
    process.exit(1);
});
