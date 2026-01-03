#!/usr/bin/env node
import fs from "fs";
import path from "path";
import process from "process";
import OpenAI from "openai";
import "dotenv/config";

/* -------------------- ENV CHECK -------------------- */

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY env var.");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

/* -------------------- CLI ARGS -------------------- */

const inputPath = process.argv[2];
const outIndex = process.argv.indexOf("--out");
const outputPath =
  outIndex !== -1 ? process.argv[outIndex + 1] : "stellungnahme_final.txt";

if (!inputPath) {
  console.error(
    "Usage: node generate_stellungnahme_full.js <input.json> --out <output.txt>"
  );
  process.exit(1);
}

/* -------------------- LOAD INPUT -------------------- */

const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (input.final_decision !== "process") {
  console.error("Input is not eligible for Stellungnahme generation.");
  process.exit(1);
}

const d = input.extracted_fields;

/* -------------------- MODEL -------------------- */

const MODEL = "gpt-5-mini";

/* -------------------- PROMPTS -------------------- */

const SYSTEM_PROMPT = `
Du bist ein öffentlich bestellter und vereidigter Sachverständiger
für die Bewertung von bebauten und unbebauten Grundstücken.

Du schreibst:
- juristisch präzise
- sachlich
- ohne Füllwörter
- ohne emotionale Sprache
- im Stil formeller Stellungnahmen an Finanzbehörden in Deutschland

Der Text muss fachlich belastbar, behördentauglich
und zur direkten Verwendung in Word geeignet sein.
`;

const USER_PROMPT = `
Erstelle eine vollständige Stellungnahme zur Ablehnung eines
Restnutzungsdauergutachtens gemäß § 7 Abs. 4 Satz 2 EStG.

WICHTIG:
- Der Text MUSS in klar abgegrenzten Abschnitten ausgegeben werden
- Jeder Abschnitt MUSS mit der unten vorgegebenen Abschnittskennung beginnen
- Keine Markdown-Formatierung
- Kein Fettdruck, keine Kursivschrift
- Reiner Fließtext
- Keine Platzhalter
- Keine Wiederholungen
- Ein durchgehendes Dokument

====================
VERBINDLICHER AUFBAU
====================

[HEADER]
GSC Germany GmbH
Tölzer Straße 37
82031 Grünwald
E-Mail: info@gsc-germany.de

[ADRESSAT]
(Formuliere den vollständigen Adressatenblock der zuständigen Finanzbehörde.)

[ORT_DATUM]
(Formuliere Ort und aktuelles Datum im behördlichen Stil.)

[BETREFF]
(Formuliere einen rechtlich präzisen Betreff mit Objektadresse.)

[ANREDE]
Sehr geehrte Damen und Herren,

[ABSCHNITT_I_EINLEITUNG]
(Ziel und Anlass der Stellungnahme.)

[ABSCHNITT_II_GESETZLICHE_GRUNDLAGE]
(Darstellung zu § 7 Abs. 4 Satz 2 EStG.)

[ABSCHNITT_III_WUERDIGUNG_ABLEHNUNG]
(Sachliche Zusammenfassung und Würdigung der Ablehnungsgründe.)

[ABSCHNITT_IV_TECHNISCHE_BEGRUENDUNG]
(Technische Herleitung der Restnutzungsdauer.)

[ABSCHNITT_V_WIRTSCHAFTLICHE_BEGRUENDUNG]
(Wirtschaftliche Einflussfaktoren und Bewertung.)

[ABSCHNITT_VI_METHODISCHE_HERLEITUNG]
(Darstellung der Bewertungsmethoden.)

[ABSCHNITT_VII_RECHTLICHE_EINORDNUNG]
(Einordnung anhand BFH IX R 2/12 und FG Münster 11 K 4108/18 E.)

[ABSCHNITT_VIII_EINZELWUERDIGUNG]
(Konkrete Würdigung der einzelnen Beanstandungen.)

[ABSCHNITT_IX_SCHLUSSFOLGERUNG]
(Zusammenfassende Bewertung und Bitte/Antrag zur erneuten Prüfung.)

[SIGNATUR]
Mit freundlichen Grüßen

GSC Germany GmbH
Lars Kurjo
Geschäftsführer
Sachverständiger für bebaute und unbebaute Grundstücke

====================
INHALTSDATEN
====================

Objektadresse:
${d.objektadresse}

Ablehnung / Widerspruch:
${d.widerspruch_text}

Kernaussagen des Gutachtens:
${d.gutachten_kernaussagen}

Technische Aspekte:
${d.technische_defizite}

Wirtschaftliche Aspekte:
${d.wirtschaftliche_faktoren}

Restnutzungsdauer:
${d.restnutzungsdauer_verwendet}

Bewertungsmethoden:
${d.bewertungsmethoden}

Rechtsprechung:
- § 7 Abs. 4 Satz 2 EStG
- BFH, Urteil IX R 2/12
- FG Münster, 11 K 4108/18 E

Der Text muss vollständig, konsistent und juristisch belastbar sein.
`;

/* -------------------- OPENAI CALL -------------------- */

const response = await client.responses.create({
  model: MODEL,
  input: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: USER_PROMPT }
  ]
});

const finalText = response.output_text.trim();

/* -------------------- WRITE OUTPUT -------------------- */

fs.writeFileSync(outputPath, finalText, "utf8");
console.log(`Final Stellungnahme written to ${outputPath}`);
