"use server";

import puppeteer from 'puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { schemaDocImages } from '../db/schema';

function generateHtmlTemplate(contentHtml: string) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
            color: #1a1a1a;
            width: 1120px; /* 1200 - 80 padding */
            line-height: 1.6;
        }
        h1, h2, h3, h4 { color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; }
        h1 { font-size: 2.25rem; }
        h2 { font-size: 1.5rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 24px; }
        th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        th { background-color: #f9fafb; font-weight: 600; }
        code { background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
        pre { background-color: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; }
        pre code { background-color: transparent; color: inherit; padding: 0; }
        blockquote { border-left: 4px solid #d1d5db; margin: 0; padding-left: 16px; color: #4b5563; }
        .documentation-container { max-width: 100%; }
    </style>
</head>
<body>
    <div class="documentation-container">
        ${contentHtml}
    </div>
</body>
</html>
`;
}

export async function generateDocumentationImages(connectionId: string, entityName: string, markdown: string) {
    console.log(`[Puppeteer] Starting image generation for ${entityName}...`);

    const contentHtml = await marked.parse(markdown);
    const fullHtml = generateHtmlTemplate(contentHtml);

    const publicDir = path.join(process.cwd(), 'public');
    const refsDir = path.join(publicDir, 'schema_refs', connectionId);

    if (!fs.existsSync(refsDir)) {
        fs.mkdirSync(refsDir, { recursive: true });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1000 });
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = 1000;
        const totalPages = Math.max(1, Math.ceil(bodyHeight / viewportHeight));

        const generatedImages: { pageNumber: number, imagePath: string }[] = [];

        for (let i = 0; i < totalPages; i++) {
            const pageNumber = i + 1;
            const fileName = `${entityName}_page_${pageNumber}.png`;
            const filePath = path.join(refsDir, fileName);
            const relativePath = `/schema_refs/${connectionId}/${fileName}`;

            const clip = {
                x: 0,
                y: i * viewportHeight,
                width: 1200,
                height: Math.min(viewportHeight, bodyHeight - (i * viewportHeight))
            };

            // Fix zero height clip boundary error just in case
            if (clip.height <= 0) clip.height = viewportHeight;

            await page.screenshot({ path: filePath, clip });
            console.log(`[Puppeteer] Saved screenshot: ${filePath}`);

            generatedImages.push({ pageNumber, imagePath: relativePath });
        }

        return { success: true, images: generatedImages };

    } catch (e: any) {
        console.error(`[Puppeteer] Failed to generate images for ${entityName}:`, e);
        return { success: false, error: e.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

export async function saveImageMetadata(connectionId: string, entityName: string, images: { pageNumber: number, imagePath: string }[]) {
    if (!images || images.length === 0) return { success: true };

    try {
        const values = images.map(img => ({
            connectionId,
            entityName,
            pageNumber: img.pageNumber,
            imagePath: img.imagePath
        }));

        await db.insert(schemaDocImages).values(values);
        console.log(`[Puppeteer] Saved metadata for ${values.length} images for ${entityName}.`);
        return { success: true };
    } catch (e: any) {
        console.error(`[Puppeteer] Failed to save metadata for ${entityName}:`, e);
        return { success: false, error: e.message };
    }
}
