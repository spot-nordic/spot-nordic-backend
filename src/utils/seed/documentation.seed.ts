import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { Ollama } from 'ollama';
import { db } from '../../configs/db.config';
import { documentationNodes, documentationAssets, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { uploadFileToS3 } from '../../services/upload.service';

const DATA_DIR = path.resolve(__dirname, '../data');
const OLLAMA_MODEL = 'llama3.1:latest';
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

const generateMetadataWithLLM = async (htmlContent: string, folderName: string) => {
  const folderHint = folderName.replace(/^[0-9]+_doc_/, '').replace(/_/g, ' ');

  const prompt = `
    You are an expert technical writer. I am giving you raw, unorganized scraped HTML from a documentation page about the Spot Matching System (SMS) related to: "${folderHint}".
    
    Your task is to completely rewrite and format this content into a modern, highly readable documentation page.
    
    REQUIREMENTS:
    1. Break up the dense text blocks.
    2. Create a logical hierarchy using <h2> and <h3> tags.
    3. Convert lists of items, features, or requirements into bulleted <ul> and <li> lists.
    4. CRITICAL: You MUST retain EVERY SINGLE <img src="..."> tag exactly as it appears in the input. Do not alter the image URLs. Place the images logically where they belong in your rewritten text.
    5. Generate a highly specific, unique, and professional title.
    6. Generate a URL-friendly slug based on the title.
    7. Generate a 1-2 sentence meta description.
    
    Respond ONLY with a valid JSON object matching this schema. Do not include markdown codeblocks around the JSON.
    {
      "title": "String",
      "slug": "String",
      "metaDescription": "String",
      "htmlContent": "String (Your beautifully formatted HTML containing headers, paragraphs, lists, and the original <img> tags)"
    }
    
    Raw Content:
    ${htmlContent}
  `;

  try {
    const response = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt: prompt,
      format: 'json',
      stream: false,
      options: {
        num_ctx: 8192 // Ensure enough context window for large HTML returns
      }
    });

    // Safely extract JSON even if the LLM hallucinates markdown wrappers
    const match = response.response.match(/\{[\s\S]*\}/);
    const jsonString = match ? match[0] : response.response;
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('⚠️ LLM Parsing Failed, falling back to defaults:', error);
    return { title: null, slug: null, metaDescription: null, htmlContent: null };
  }
};

export const seedDocs = async (): Promise<void> => {
  console.log('🚀 Starting automated documentation processing...');

  const admin = await db.select().from(users).where(eq(users.role, 'ADMIN'));
  if (admin.length === 0) {
    console.error('❌ No ADMIN user found to author docs. Please seed an admin first.');
    return;
  }
  const adminId = admin[0].id;

  console.log('📁 Creating main documentation groups...');
  const [techDocsGroup] = await db.insert(documentationNodes).values({
    title: 'Spotmatching Technology',
    slug: 'spotmatching-technology',
    authorId: adminId,
    status: 'PUBLISHED',
    sortOrder: 1,
    isGroup: true,
  }).returning();

  const [downloadsGroup] = await db.insert(documentationNodes).values({
    title: 'Downloadable Materials',
    slug: 'downloads',
    authorId: adminId,
    status: 'PUBLISHED',
    sortOrder: 2,
    isGroup: true,
  }).returning();

  const folders = await fs.readdir(DATA_DIR);
  let sortOrderCounter = 1;

  for (const folder of folders) {
    const folderPath = path.join(DATA_DIR, folder);
    const stat = await fs.stat(folderPath);

    if (!stat.isDirectory()) continue;
    if (!folder.includes('_doc_') && !folder.endsWith('_pdf')) continue;

    console.log(`\n⚙️ Processing folder: ${folder}`);

    if (folder.includes('_doc_')) {
      const files = await fs.readdir(folderPath);
      const htmlFile = files.find(f => f.endsWith('.html'));

      if (htmlFile) {
        const htmlPath = path.join(folderPath, htmlFile);
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        const $ = cheerio.load(htmlContent);
        const uploadedAssets = [];

        // --- 1. SAFE NON-DESTRUCTIVE CLEANUP ---

        // Remove structural junk that causes massive empty whitespace
        $('header, footer, nav, script, style, iframe, meta, link, noscript').remove();

        $('img').each((_, el) => {
          const src = $(el).attr('src')?.toLowerCase() || '';
          if (
            src.includes('logo') || src.includes('design_cp') ||
            src.includes('cp_printing') || src.includes('find_us_on_facebook') ||
            src.includes('linkedin') || src.includes('zeppiro') ||
            src.includes('smsready_headline') // Added from your HTML payload
          ) {
            $(el).remove();
          }
        });

        const junkTexts = [
          'shop sms', 'sms technical', 'sms products & services',
          'sms in articles and webinars', 'testimonies',
          'sms and the environment', 'sms news', 'sms ready experts',
          'interesting links', 'sms: how, why and when', 'sms q&a',
          'sms for design and advertising', 'sms for print',
          'for print', 'for web', 'for tv',
          'getting started with sms colours', 'printers (in all categories)',
          'getting started with sms colours printers (in all categories)',
          'sms blocks', 'sms ready - or not?', 'cost of ownership'
        ];

        $('*').contents().filter(function () {
          return this.nodeType === 3;
        }).each(function () {
          const textNode = this as any;
          const rawText = textNode.data || textNode.nodeValue || '';
          const normalizedText = rawText.toLowerCase().replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();

          if (normalizedText.length < 2) return;

          const isJunk = junkTexts.some(junk =>
            normalizedText === junk ||
            (normalizedText.includes(junk) && normalizedText.length <= junk.length + 5)
          );

          if (isJunk) {
            textNode.data = '';
            textNode.nodeValue = '';
          }
        });

        // Strip ALL attributes from all tags to give the LLM a clean slate, except for image sources
        // The typecast to 'any' resolves the TypeScript error for 'tagName' and 'attribs'
        $('*').each((_, el) => {
          const element = el as any;
          if (element.type === 'tag' && element.tagName !== 'img') {
            element.attribs = {};
          }
        });

        // Clean up empty tags that cause the blank space at the top
        $('p, div, span, table, tr, td, center, a, b, i, strong').each((_, el) => {
          const text = $(el).text().replace(/\s+/g, '').trim();
          const hasImages = $(el).find('img').length > 0;
          if (text === '' && !hasImages) {
            $(el).remove();
          }
        });

        // --- 2. UPLOAD REMAINING REAL IMAGES ---
        const images = $('img').toArray();
        for (const img of images) {
          let rawSrc = $(img).attr('src');

          if (rawSrc && !rawSrc.startsWith('http') && !rawSrc.startsWith('data:')) {
            let localSrc = decodeURIComponent(rawSrc);
            localSrc = localSrc.split('?')[0].split('#')[0];
            const imagePath = path.join(folderPath, localSrc);

            try {
              const fileStat = await fs.stat(imagePath);
              const fileBuffer = await fs.readFile(imagePath);
              const fileName = path.basename(localSrc);
              const mimeType = getMimeType(fileName);

              console.log(`   ⬆️ Uploading image: ${fileName}`);
              const s3Url = await uploadFileToS3(fileBuffer, fileName, mimeType, 'documentation-assets');

              $(img).attr('src', s3Url);
              $(img).removeAttr('width').removeAttr('height').removeAttr('style').removeAttr('class');

              uploadedAssets.push({
                fileName: fileName,
                fileUrl: s3Url,
                fileType: mimeType.startsWith('image/') ? 'IMAGE' : 'FILE',
                fileSize: fileStat.size,
              });
            } catch (err) {
              console.warn(`   ⚠️ Could not find/upload image ${localSrc} in ${folder}. Skipping.`);
              $(img).remove();
            }
          }
        }

        // Extract ONLY the clean body content to feed to the LLM (ignores html/head tags)
        let cleanedHtmlToPass = $('body').html() || $.html();

        // Remove the contact info strings
        cleanedHtmlToPass = cleanedHtmlToPass
          .replace(/Spot-Nordic, Spoaholar 4, 111 Reykjavik, Iceland/gi, '')
          .replace(/Phone: \+354 896 9790/gi, '')
          .replace(/E-mail: support@spotmatchingsystem\.com/gi, '');

        // --- 3. LLM INTELLIGENT REWRITE & DB INSERTION ---
        console.log(`   🧠 Asking Llama 3.1 to intelligently restructure and format content...`);
        const metadata = await generateMetadataWithLLM(cleanedHtmlToPass, folder);

        const finalTitle = metadata.title || folder.replace(/^[0-9]+_doc_/, '').replace(/_/g, ' ').toUpperCase();
        const finalSlug = metadata.slug || folder.replace(/^[0-9]+_doc_/, '').toLowerCase();

        // Use the beautifully rewritten HTML from Llama, fallback to the cleaned raw HTML if it fails
        const finalHtmlContent = metadata.htmlContent || cleanedHtmlToPass;

        console.log(`   📝 Inserting document: ${finalTitle}`);
        const [insertedNode] = await db.insert(documentationNodes).values({
          title: finalTitle,
          slug: finalSlug,
          parentId: techDocsGroup.id,
          authorId: adminId,
          status: 'PUBLISHED',
          isGroup: false,
          sortOrder: sortOrderCounter++,
          htmlContent: finalHtmlContent,
          metaTitle: finalTitle,
          metaDescription: metadata.metaDescription || '',
        }).returning();

        if (uploadedAssets.length > 0) {
          const assetsToInsert = uploadedAssets.map(asset => ({
            ...asset,
            nodeId: insertedNode.id,
          }));
          await db.insert(documentationAssets).values(assetsToInsert);
          console.log(`   🔗 Linked ${uploadedAssets.length} assets to the document.`);
        }
      }
    }

    if (folder.endsWith('_pdf')) {
      const files = await fs.readdir(folderPath);
      const pdfFile = files.find(f => f.endsWith('.pdf'));

      if (pdfFile) {
        const pdfPath = path.join(folderPath, pdfFile);
        const fileStat = await fs.stat(pdfPath);
        const fileBuffer = await fs.readFile(pdfPath);

        console.log(`   ⬆️ Uploading PDF: ${pdfFile}`);
        const s3Url = await uploadFileToS3(fileBuffer, pdfFile, 'application/pdf', 'documentation-downloads');

        const cleanTitle = pdfFile.replace('.pdf', '').replace(/_/g, ' ');

        const [pdfNode] = await db.insert(documentationNodes).values({
          title: cleanTitle,
          slug: cleanTitle.toLowerCase().replace(/\s+/g, '-'),
          parentId: downloadsGroup.id,
          authorId: adminId,
          status: 'PUBLISHED',
          isGroup: false,
          sortOrder: sortOrderCounter++,
          htmlContent: `<h2>${cleanTitle}</h2><p>Click the link below to download the attached material.</p><p><a href="${s3Url}" target="_blank" rel="noopener noreferrer" style="color: #d1d1d1; background-color: #83534e; padding: 10px 15px; border-radius: 5px; text-decoration: none; display: inline-block; margin-top: 10px; font-weight: bold;">Download ${cleanTitle} PDF</a></p>`,
        }).returning();

        await db.insert(documentationAssets).values({
          nodeId: pdfNode.id,
          fileName: pdfFile,
          fileUrl: s3Url,
          fileType: 'PDF',
          fileSize: fileStat.size,
        });
        console.log(`   🔗 Linked PDF asset to download node.`);
      }
    }
  }

  console.log('\n✅ All scraped documents, PDFs, and assets have been restructured and seeded successfully!');
};