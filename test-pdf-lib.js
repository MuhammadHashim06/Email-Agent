import path from 'path';
import fs from 'fs';
import { pdfToPng } from 'pdf-to-png-converter';

const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed');

async function convertPdfToImages(pdfPath, messageId, filename) {
    const outputDir = path.join(PROCESSED_DIR, messageId);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputImages = [];
    const baseFilename = filename.replace(/\.pdf$/i, '');

    console.log(`Converting ${pdfPath} to images...`);

    try {
        const pngPages = await pdfToPng(pdfPath, {
            outputFolder: outputDir,
            outputFileMask: baseFilename,
            viewportScale: 2.0
        });

        console.log(`Generated ${pngPages.length} pages.`);

        for (const page of pngPages) {
            console.log(`Page: ${page.name}`);
            const webPath = `/processed/${messageId}/${page.name}`;
            outputImages.push(webPath);
        }

    } catch (err) {
        console.error('Error converting PDF to images:', err);
    }

    return outputImages;
}

// Run test
(async () => {
    const messageId = '19b509035d412030';
    const filename = 'Receipt - SNAP2SKETCH-1765393129936.pdf';
    const pdfPath = path.join(PROCESSED_DIR, messageId, filename);

    if (!fs.existsSync(pdfPath)) {
        console.error('Test PDF not found!');
        process.exit(1);
    }

    const images = await convertPdfToImages(pdfPath, messageId, filename);
    console.log('Conversion complete. Images:', images);
})();
