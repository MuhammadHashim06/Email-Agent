import path from 'path';
import fs from 'fs';
import { pdfToPng } from 'pdf-to-png-converter';

const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed');

// Run test
(async () => {
    const messageId = '19b509035d412030';
    const filename = 'Receipt - SNAP2SKETCH-1765393129936.pdf';
    const pdfPath = path.join(PROCESSED_DIR, messageId, filename);

    if (!fs.existsSync(pdfPath)) {
        console.error('Test PDF not found!');
        process.exit(1);
    }

    const buffer = fs.readFileSync(pdfPath);
    console.log(`Read buffer: ${buffer.length} bytes`);

    const outputDir = path.join(PROCESSED_DIR, messageId);

    try {
        console.log('Converting buffer...');
        const pngPages = await pdfToPng(buffer, {
            outputFolder: outputDir,
            outputFileMask: filename.replace('.pdf', ''),
            viewportScale: 2.0
        });

        console.log(`Generated ${pngPages.length} pages.`);
        console.log(pngPages);
    } catch (err) {
        console.error('Error converting PDF buffer:', err);
    }
})();
