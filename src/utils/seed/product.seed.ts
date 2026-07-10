// import fs from 'fs/promises';
// import path from 'path';
// import * as cheerio from 'cheerio';
// import { Ollama } from 'ollama';
// import { db } from '../../configs/db.config';
// import { 
//   products, 
//   productCategories, 
//   orders, 
//   orderItems, 
//   productReviews, 
//   users 
// } from '../../db/schema';
// import { eq } from 'drizzle-orm';
// import { uploadFileToS3 } from '../../services/upload.service';

// const DATA_DIR = path.resolve(__dirname, '../productdata');
// const OLLAMA_MODEL = 'llama3.1:latest';
// const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

// const getMimeType = (filename: string): string => {
//   const ext = path.extname(filename).toLowerCase();
//   const mimeTypes: Record<string, string> = {
//     '.png': 'image/png',
//     '.jpg': 'image/jpeg',
//     '.jpeg': 'image/jpeg',
//     '.gif': 'image/gif',
//     '.svg': 'image/svg+xml',
//     '.webp': 'image/webp',
//     '.woff': 'font/woff',
//     '.woff2': 'font/woff2'
//   };
//   return mimeTypes[ext] || 'application/octet-stream';
// };

// const chunkArray = (array: any[], size: number) => {
//   const chunked = [];
//   let index = 0;
//   while (index < array.length) {
//     chunked.push(array.slice(index, size + index));
//     index += size;
//   }
//   return chunked;
// };

// const enrichProductsWithLLM = async (parsedProducts: any[]) => {
//   const prompt = `
//     You are an expert e-commerce catalog manager. 
//     I have accurately extracted the name, SKU, price, and image URL for several products.
    
//     Your task is to enrich this data by assigning a realistic 'categoryName' and writing a professional 2-sentence 'description' for each product.
    
//     Respond ONLY with a valid JSON object matching EXACTLY this schema. No markdown wrappers, no conversational text.
//     {
//       "products": [
//         {
//           "name": "Keep the exact original name",
//           "sku": "Keep the exact original SKU",
//           "basePrice": Keep the exact original price,
//           "images": ["Keep the exact original image URL"],
//           "categoryName": "Generate a suitable category (e.g., Color Standards, Printing Tools, Accessories)",
//           "description": "Generate a highly professional 2-sentence description based on the product name",
//           "stock": Generate a random integer between 15 and 85
//         }
//       ]
//     }
    
//     Input Data:
//     ${JSON.stringify(parsedProducts, null, 2)}
//   `;

//   try {
//     const response = await ollama.generate({
//       model: OLLAMA_MODEL,
//       prompt: prompt,
//       format: 'json',
//       stream: false,
//       options: { num_ctx: 8192 }
//     });

//     const match = response.response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
//     const jsonString = match ? match[0] : response.response;
//     const parsedData = JSON.parse(jsonString);

//     if (Array.isArray(parsedData)) return parsedData;
//     if (parsedData.products && Array.isArray(parsedData.products)) return parsedData.products;
//     if (parsedData.items && Array.isArray(parsedData.items)) return parsedData.items;

//     return [];
//   } catch (error) {
//     console.error('   ⚠️ LLM Enrichment Failed:', error);
//     return []; 
//   }
// };

// const createSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// export const seedProductsAndOrders = async (): Promise<void> => {
//   console.log('🚀 Starting robust Product & Order seeding...');

//   const adminQuery = await db.select().from(users).where(eq(users.role, 'ADMIN'));
//   const userQuery = await db.select().from(users).where(eq(users.role, 'USER'));

//   if (adminQuery.length === 0 || userQuery.length === 0) {
//     console.error('❌ Missing required users (Admin or User). Please run seedUsers first.');
//     return;
//   }

//   const regularUser = userQuery[0];
//   const categoryMap = new Map<string, string>();
//   const seenProductNames = new Set<string>();
//   const insertedProducts: any[] = [];

//   try {
//     const folders = await fs.readdir(DATA_DIR);

//     for (const folder of folders) {
//       const folderPath = path.join(DATA_DIR, folder);
//       const stat = await fs.stat(folderPath);

//       if (!stat.isDirectory() || !folder.includes('_shop') || folder.includes('_shop_2')) continue;

//       console.log(`\n⚙️ Processing shop folder: ${folder}`);
//       const files = await fs.readdir(folderPath);
//       const htmlFile = files.find(f => f.endsWith('.html'));

//       if (!htmlFile) continue;

//       const htmlPath = path.join(folderPath, htmlFile);
//       const htmlContent = await fs.readFile(htmlPath, 'utf-8');
//       const $ = cheerio.load(htmlContent);

//       const extractedItems: any[] = [];
//       const productElements = $('li.product').toArray();

//       for (const el of productElements) {
//         const name = $(el).find('.woocommerce-loop-product__title').text().trim() || $(el).find('h2').text().trim();
//         const sku = $(el).find('a.add_to_cart_button').attr('data-product_sku') || `SMS-${Math.floor(Math.random() * 10000)}`;
        
//         let price = 25.00;
//         const priceText = $(el).find('.price').text().trim();
//         const priceMatch = priceText.match(/[\d,.]+/);
//         if (priceMatch) {
//             price = parseFloat(priceMatch[0].replace(/,/g, ''));
//         }

//         const imgTag = $(el).find('img').first();
//         let rawSrc = imgTag.attr('src') || imgTag.attr('data-src');
//         let finalImageUrl = null;

//         if (rawSrc && !rawSrc.startsWith('http') && !rawSrc.startsWith('data:')) {
//             let localSrc = decodeURIComponent(rawSrc).split('?')[0].split('#')[0];
//             const imagePath = path.join(folderPath, localSrc);
//             try {
//                 const fileBuffer = await fs.readFile(imagePath);
//                 const fileName = path.basename(localSrc);
//                 const mimeType = getMimeType(fileName);
//                 finalImageUrl = await uploadFileToS3(fileBuffer, fileName, mimeType, 'products');
//             } catch (err) {
//                 console.warn(`   ⚠️ Image missing locally for: ${localSrc}`);
//             }
//         } else if (rawSrc && rawSrc.startsWith('http')) {
//             finalImageUrl = rawSrc;
//         }

//         if (name && finalImageUrl) {
//             extractedItems.push({ name, sku, basePrice: price, images: [finalImageUrl] });
//         } else if (name) {
//             console.log(`   ⏭️ Skipping "${name}" - No valid image found.`);
//         }
//       }

//       if (extractedItems.length === 0) {
//         console.log(`   ⏭️ Skipping folder ${folder} - No complete products extracted.`);
//         continue;
//       }

//       console.log(`   🧠 Extracted ${extractedItems.length} products. Grouping into batches to prevent timeouts...`);
      
//       const enrichedProducts = [];
//       const chunks = chunkArray(extractedItems, 8); 

//       for (let i = 0; i < chunks.length; i++) {
//         console.log(`   🔄 Processing batch ${i + 1}/${chunks.length}...`);
//         const chunkEnriched = await enrichProductsWithLLM(chunks[i]);

//         if (chunkEnriched && chunkEnriched.length > 0) {
//             enrichedProducts.push(...chunkEnriched);
//         } else {
//             console.log(`   ⚠️ LLM failed for batch ${i + 1}. Applying generic fallbacks.`);
//             const fallbackChunk = chunks[i].map(p => ({
//                 ...p,
//                 categoryName: 'General Equipment',
//                 description: `Professional grade ${p.name} with precise specifications.`,
//                 stock: Math.floor(Math.random() * 80) + 20
//             }));
//             enrichedProducts.push(...fallbackChunk);
//         }
//       }

//       for (const prod of enrichedProducts) {
//         if (!prod.name || !prod.images || prod.images.length === 0) continue;

//         const dedupeKey = prod.name.trim().toLowerCase();
//         if (seenProductNames.has(dedupeKey)) {
//           console.log(`   ⏭️ Skipping duplicate: "${prod.name}"`);
//           continue;
//         }
//         seenProductNames.add(dedupeKey);

//         let categoryName = prod.categoryName || 'General';
//         let categoryId = categoryMap.get(categoryName);
        
//         if (!categoryId) {
//           const catSlug = createSlug(categoryName);
//           const existingCat = await db.select().from(productCategories).where(eq(productCategories.slug, catSlug));
          
//           if (existingCat.length > 0) {
//             categoryId = existingCat[0].id;
//           } else {
//             const [newCat] = await db.insert(productCategories).values({
//               name: categoryName,
//               slug: catSlug,
//               description: `All products related to ${categoryName}`,
//               status: 'ACTIVE'
//             }).returning();
//             categoryId = newCat.id;
//           }
//           categoryMap.set(categoryName, categoryId);
//         }

//         const discount = Math.random() > 0.8 ? Math.floor(Math.random() * 15) + 5 : 0;
//         const finalPrice = typeof prod.basePrice === 'number' ? prod.basePrice : 49.99;

//         try {
//           const [newProduct] = await db.insert(products).values({
//             name: prod.name,
//             sku: prod.sku,
//             categoryId: categoryId as string,
//             description: prod.description || `High quality ${categoryName} item.`,
//             images: prod.images,
//             basePrice: finalPrice,
//             discountPercentage: discount,
//             stock: prod.stock || (Math.floor(Math.random() * 80) + 20),
//             status: 'ACTIVE'
//           }).returning();

//           insertedProducts.push(newProduct);
//           console.log(`   ✅ Seeded: ${newProduct.name}`);
//         } catch (dbErr) {
//           console.error(`   ❌ Failed to insert ${prod.name}:`, dbErr);
//         }
//       }
//     }

//     if (insertedProducts.length > 0) {
//       console.log('\n🛒 Generating Mock Orders and Reviews...');

//       for (let i = 0; i < 4; i++) {
//         const numItems = Math.floor(Math.random() * 3) + 1;
//         const shuffledProducts = [...insertedProducts].sort(() => 0.5 - Math.random());
//         const selectedProducts = shuffledProducts.slice(0, numItems);

//         let totalSubtotal = 0;
//         const orderItemsToInsert = [];

//         for (const sp of selectedProducts) {
//           const qty = Math.floor(Math.random() * 2) + 1;
//           const finalPrice = sp.basePrice * (1 - sp.discountPercentage / 100);
//           totalSubtotal += finalPrice * qty;

//           orderItemsToInsert.push({
//             productId: sp.id,
//             quantity: qty,
//             price: parseFloat(finalPrice.toFixed(2)),
//             originalPrice: parseFloat(sp.basePrice.toFixed(2))
//           });
//         }

//         const taxRate = 0.24; 
//         const taxAmount = totalSubtotal * taxRate;
//         const totalAmount = totalSubtotal + taxAmount;

//         const statuses: any[] = ['DELIVERED', 'SHIPPED', 'PROCESSING'];
//         const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

//         const [newOrder] = await db.insert(orders).values({
//           userId: regularUser.id,
//           totalSubtotal: parseFloat(totalSubtotal.toFixed(2)),
//           totalTax: parseFloat(taxAmount.toFixed(2)),
//           totalAmount: parseFloat(totalAmount.toFixed(2)),
//           taxCountry: 'IS',
//           taxPercentage: 24.0,
//           currency: 'USD',
//           conversionRate: 1.0,
//           conversionCharge: 0,
//           status: randomStatus,
//           paymentMethod: 'PAYPAL',
//           paymentStatus: 'COMPLETED',
//           shippingStreet: 'Laugavegur 1',
//           shippingCity: 'Reykjavik',
//           shippingState: 'Capital Region',
//           shippingPincode: '101',
//           shippingCountry: 'IS',
//           invoiceUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
//           createdAt: new Date(Date.now() - Math.floor(Math.random() * 7000000000))
//         }).returning();

//         const itemsWithOrderId = orderItemsToInsert.map(item => ({
//           ...item,
//           orderId: newOrder.id
//         }));

//         await db.insert(orderItems).values(itemsWithOrderId);
//       }
//       console.log('   ✅ Mock Orders Created');

//       const reviewComments = [
//         "Incredible precision and quality. Exactly what our design team needed.",
//         "Matches the description perfectly. Fast shipping.",
//         "Very useful tool for ensuring brand consistency across our marketing materials.",
//         "The interface and usability are top-notch. Will buy again.",
//         "Decent product, does the job well.",
//         "A must-have for any serious design professional."
//       ];

//       const productsToReview = [...insertedProducts].sort(() => 0.5 - Math.random()).slice(0, Math.floor(insertedProducts.length * 0.7));

//       for (const pr of productsToReview) {
//         const numReviews = Math.floor(Math.random() * 3) + 1;
//         let totalRating = 0;

//         for (let j = 0; j < numReviews; j++) {
//           const rating = Math.floor(Math.random() * 2) + 4; 
//           const comment = reviewComments[Math.floor(Math.random() * reviewComments.length)];
//           totalRating += rating;

//           await db.insert(productReviews).values({
//             productId: pr.id,
//             userId: regularUser.id,
//             rating,
//             comment,
//             isVisible: true,
//             createdAt: new Date(Date.now() - Math.floor(Math.random() * 5000000000))
//           });
//         }

//         const avgRating = totalRating / numReviews;

//         await db.update(products).set({
//           averageRating: avgRating,
//           totalReviews: numReviews
//         }).where(eq(products.id, pr.id));
//       }
//       console.log('   ✅ Mock Reviews Created');
//     } else {
//       console.log('\n⚠️ No products were inserted. Skipping order generation.');
//     }

//     console.log('\n🎉 Product and Order seeding completed successfully!');
//   } catch (error) {
//     console.error('❌ Error during product seeding:', error);
//   }
// };


import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { Ollama } from 'ollama';
import { db } from '../../configs/db.config';
import { 
  products, 
  productCategories, 
  orders, 
  orderItems, 
  productReviews, 
  users 
} from '../../db/schema';
import { eq, or } from 'drizzle-orm';
import { uploadFileToS3 } from '../../services/upload.service';

const DATA_DIR = path.resolve(__dirname, '../productdata');
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
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

const chunkArray = (array: any[], size: number) => {
  const chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
};

const enrichProductsWithLLM = async (parsedProducts: any[]) => {
  const prompt = `
    You are an expert e-commerce catalog manager. 
    I have accurately extracted the name, SKU, price, and image URL for several products.
    
    Your task is to enrich this data by assigning a realistic 'categoryName' and 'subCategoryName', and writing a professional 2-sentence 'description' for each product.
    
    Respond ONLY with a valid JSON object matching EXACTLY this schema. No markdown wrappers, no conversational text.
    {
      "products": [
        {
          "name": "Keep the exact original name",
          "sku": "Keep the exact original SKU",
          "basePrice": Keep the exact original price,
          "images": ["Keep the exact original image URL"],
          "categoryName": "Generate a suitable broad category (e.g., Electronics, Accessories, Apparel)",
          "subCategoryName": "Generate a suitable specific subcategory (e.g., Laptops, Cables, T-Shirts)",
          "description": "Generate a highly professional 2-sentence description based on the product name",
          "stock": Generate a random integer between 15 and 85
        }
      ]
    }
    
    Input Data:
    ${JSON.stringify(parsedProducts, null, 2)}
  `;

  try {
    const response = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt: prompt,
      format: 'json',
      stream: false,
      options: { num_ctx: 8192 }
    });

    const match = response.response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const jsonString = match ? match[0] : response.response;
    const parsedData = JSON.parse(jsonString);

    if (Array.isArray(parsedData)) return parsedData;
    if (parsedData.products && Array.isArray(parsedData.products)) return parsedData.products;
    if (parsedData.items && Array.isArray(parsedData.items)) return parsedData.items;

    return [];
  } catch (error) {
    console.error('   ⚠️ LLM Enrichment Failed:', error);
    return []; 
  }
};

const createSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

export const seedProductsAndOrders = async (): Promise<void> => {
  console.log('🚀 Starting robust Product & Order seeding...');

  const adminQuery = await db.select().from(users).where(eq(users.role, 'ADMIN'));
  const userQuery = await db.select().from(users).where(eq(users.role, 'USER'));

  if (adminQuery.length === 0 || userQuery.length === 0) {
    console.error('❌ Missing required users (Admin or User). Please run user.seed.ts first.');
    return;
  }

  const regularUser = userQuery[0];
  const categoryMap = new Map<string, string>();
  const seenProductNames = new Set<string>();
  const insertedProducts: any[] = [];

  try {
    // Pre-cache existing categories
    const existingCats = await db.select().from(productCategories);
    for (const cat of existingCats) {
      categoryMap.set(cat.slug, cat.id);
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    }

    const folders = await fs.readdir(DATA_DIR);

    for (const folder of folders) {
      const folderPath = path.join(DATA_DIR, folder);
      const stat = await fs.stat(folderPath);

      if (!stat.isDirectory() || !folder.includes('_shop') || folder.includes('_shop_2')) continue;

      console.log(`\n⚙️ Processing shop folder: ${folder}`);
      const files = await fs.readdir(folderPath);
      const htmlFile = files.find(f => f.endsWith('.html'));

      if (!htmlFile) continue;

      const htmlPath = path.join(folderPath, htmlFile);
      const htmlContent = await fs.readFile(htmlPath, 'utf-8');
      const $ = cheerio.load(htmlContent);

      const extractedItems: any[] = [];
      const productElements = $('li.product').toArray();

      for (const el of productElements) {
        const name = $(el).find('.woocommerce-loop-product__title').text().trim() || $(el).find('h2').text().trim();
        const sku = $(el).find('a.add_to_cart_button').attr('data-product_sku') || `SMS-${Math.floor(Math.random() * 10000)}`;
        
        let price = 25.00;
        const priceText = $(el).find('.price').text().trim();
        const priceMatch = priceText.match(/[\d,.]+/);
        if (priceMatch) {
            price = parseFloat(priceMatch[0].replace(/,/g, ''));
        }

        const imgTag = $(el).find('img').first();
        let rawSrc = imgTag.attr('src') || imgTag.attr('data-src');
        let finalImageUrl = null;

        if (rawSrc && !rawSrc.startsWith('http') && !rawSrc.startsWith('data:')) {
            let localSrc = decodeURIComponent(rawSrc).split('?')[0].split('#')[0];
            const imagePath = path.join(folderPath, localSrc);
            try {
                const fileBuffer = await fs.readFile(imagePath);
                const fileName = path.basename(localSrc);
                const mimeType = getMimeType(fileName);
                finalImageUrl = await uploadFileToS3(fileBuffer, fileName, mimeType, 'products');
            } catch (err) {
                console.warn(`   ⚠️ Image missing locally for: ${localSrc}`);
            }
        } else if (rawSrc && rawSrc.startsWith('http')) {
            finalImageUrl = rawSrc;
        }

        if (name && finalImageUrl) {
            extractedItems.push({ name, sku, basePrice: price, images: [finalImageUrl] });
        } else if (name) {
            console.log(`   ⏭️ Skipping "${name}" - No valid image found.`);
        }
      }

      if (extractedItems.length === 0) {
        console.log(`   ⏭️ Skipping folder ${folder} - No complete products extracted.`);
        continue;
      }

      console.log(`   🧠 Extracted ${extractedItems.length} products. Grouping into batches to prevent timeouts...`);
      
      const enrichedProducts = [];
      const chunks = chunkArray(extractedItems, 8); 

      for (let i = 0; i < chunks.length; i++) {
        console.log(`   🔄 Processing batch ${i + 1}/${chunks.length}...`);
        const chunkEnriched = await enrichProductsWithLLM(chunks[i]);

        if (chunkEnriched && chunkEnriched.length > 0) {
            enrichedProducts.push(...chunkEnriched);
        } else {
            console.log(`   ⚠️ LLM failed for batch ${i + 1}. Applying generic fallbacks.`);
            const fallbackChunk = chunks[i].map(p => ({
                ...p,
                categoryName: 'General Equipment',
                subCategoryName: 'Misc',
                description: `Professional grade ${p.name} with precise specifications.`,
                stock: Math.floor(Math.random() * 80) + 20
            }));
            enrichedProducts.push(...fallbackChunk);
        }
      }

      for (const prod of enrichedProducts) {
        if (!prod.name || !prod.images || prod.images.length === 0) continue;

        const dedupeKey = prod.name.trim().toLowerCase();
        if (seenProductNames.has(dedupeKey)) {
          console.log(`   ⏭️ Skipping duplicate: "${prod.name}"`);
          continue;
        }
        seenProductNames.add(dedupeKey);

        let parentCategoryName = prod.categoryName || 'General';
        let subCategoryName = prod.subCategoryName || 'Misc';
        
        const parentSlug = createSlug(parentCategoryName);
        let parentCategoryId = categoryMap.get(parentSlug) || categoryMap.get(parentCategoryName.toLowerCase());
        
        if (!parentCategoryId) {
          const existingParent = await db.select().from(productCategories).where(
            or(eq(productCategories.slug, parentSlug), eq(productCategories.name, parentCategoryName))
          );
          
          if (existingParent.length > 0) {
            parentCategoryId = existingParent[0].id;
          } else {
            try {
              const [newParentCat] = await db.insert(productCategories).values({
                name: parentCategoryName,
                slug: parentSlug,
                description: `All products related to ${parentCategoryName}`,
                status: 'ACTIVE'
              }).returning();
              parentCategoryId = newParentCat.id;
            } catch (e) {
              console.warn(`   ⚠️ Error creating parent category ${parentCategoryName}. Using existing fallback.`, e);
              // Fallback to first available category if unique constraint somehow bypassed our check
              const fallback = await db.select().from(productCategories).limit(1);
              parentCategoryId = fallback[0]?.id;
            }
          }
          if (parentCategoryId) {
            categoryMap.set(parentSlug, parentCategoryId);
            categoryMap.set(parentCategoryName.toLowerCase(), parentCategoryId);
          }
        }

        const subSlug = createSlug(`${parentCategoryName}-${subCategoryName}`);
        let subCategoryId = categoryMap.get(subSlug) || categoryMap.get(subCategoryName.toLowerCase());

        if (!subCategoryId) {
            const existingSub = await db.select().from(productCategories).where(
              or(eq(productCategories.slug, subSlug), eq(productCategories.name, subCategoryName))
            );

            if (existingSub.length > 0) {
                subCategoryId = existingSub[0].id;
            } else {
                try {
                  const [newSubCat] = await db.insert(productCategories).values({
                      name: subCategoryName,
                      slug: subSlug,
                      parentId: parentCategoryId as string,
                      description: `Subcategory ${subCategoryName} under ${parentCategoryName}`,
                      status: 'ACTIVE'
                  }).returning();
                  subCategoryId = newSubCat.id;
                } catch (e) {
                  console.warn(`   ⚠️ Error creating subcategory ${subCategoryName}. Linking product to parent.`, e);
                  // If it fails on unique constraint, just assign product to parent category directly
                  subCategoryId = parentCategoryId;
                }
            }
            if (subCategoryId) {
              categoryMap.set(subSlug, subCategoryId);
              categoryMap.set(subCategoryName.toLowerCase(), subCategoryId);
            }
        }

        const discount = Math.random() > 0.8 ? Math.floor(Math.random() * 15) + 5 : 0;
        const finalPrice = typeof prod.basePrice === 'number' ? prod.basePrice : 49.99;

        try {
          const [newProduct] = await db.insert(products).values({
            name: prod.name,
            sku: prod.sku,
            categoryId: subCategoryId as string,
            description: prod.description || `High quality item.`,
            images: prod.images,
            basePrice: finalPrice,
            discountPercentage: discount,
            stock: prod.stock || (Math.floor(Math.random() * 80) + 20),
            status: 'ACTIVE'
          }).returning();

          insertedProducts.push(newProduct);
          console.log(`   ✅ Seeded: ${newProduct.name} under ${parentCategoryName} -> ${subCategoryName}`);
        } catch (dbErr) {
          console.error(`   ❌ Failed to insert ${prod.name}:`, dbErr);
        }
      }
    }

    if (insertedProducts.length > 0) {
      console.log('\n🛒 Generating Mock Orders and Reviews...');

      for (let i = 0; i < 4; i++) {
        const numItems = Math.floor(Math.random() * 3) + 1;
        const shuffledProducts = [...insertedProducts].sort(() => 0.5 - Math.random());
        const selectedProducts = shuffledProducts.slice(0, numItems);

        let totalSubtotal = 0;
        const orderItemsToInsert = [];

        for (const sp of selectedProducts) {
          const qty = Math.floor(Math.random() * 2) + 1;
          const finalPrice = sp.basePrice * (1 - sp.discountPercentage / 100);
          totalSubtotal += finalPrice * qty;

          orderItemsToInsert.push({
            productId: sp.id,
            quantity: qty,
            price: parseFloat(finalPrice.toFixed(2)),
            originalPrice: parseFloat(sp.basePrice.toFixed(2))
          });
        }

        const taxRate = 0.24; 
        const taxAmount = totalSubtotal * taxRate;
        const totalAmount = totalSubtotal + taxAmount;

        const statuses: any[] = ['DELIVERED', 'SHIPPED', 'PROCESSING'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        const [newOrder] = await db.insert(orders).values({
          userId: regularUser.id,
          totalSubtotal: parseFloat(totalSubtotal.toFixed(2)),
          totalTax: parseFloat(taxAmount.toFixed(2)),
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          taxCountry: 'IS',
          taxPercentage: 24.0,
          currency: 'EUR',
          conversionRate: 1.0,
          conversionCharge: 0,
          status: randomStatus,
          paymentMethod: 'PAYPAL',
          paymentStatus: 'COMPLETED',
          shippingStreet: 'Laugavegur 1',
          shippingCity: 'Reykjavik',
          shippingState: 'Capital Region',
          shippingPincode: '101',
          shippingCountry: 'IS',
          invoiceUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 7000000000))
        }).returning();

        const itemsWithOrderId = orderItemsToInsert.map(item => ({
          ...item,
          orderId: newOrder.id
        }));

        await db.insert(orderItems).values(itemsWithOrderId);
      }
      console.log('   ✅ Mock Orders Created');

      const reviewComments = [
        "Incredible precision and quality. Exactly what our design team needed.",
        "Matches the description perfectly. Fast shipping.",
        "Very useful tool for ensuring brand consistency across our marketing materials.",
        "The interface and usability are top-notch. Will buy again.",
        "Decent product, does the job well.",
        "A must-have for any serious design professional."
      ];

      const productsToReview = [...insertedProducts].sort(() => 0.5 - Math.random()).slice(0, Math.floor(insertedProducts.length * 0.7));

      for (const pr of productsToReview) {
        const numReviews = Math.floor(Math.random() * 3) + 1;
        let totalRating = 0;

        for (let j = 0; j < numReviews; j++) {
          const rating = Math.floor(Math.random() * 2) + 4; 
          const comment = reviewComments[Math.floor(Math.random() * reviewComments.length)];
          totalRating += rating;

          await db.insert(productReviews).values({
            productId: pr.id,
            userId: regularUser.id,
            rating,
            comment,
            isVisible: true,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 5000000000))
          });
        }

        const avgRating = totalRating / numReviews;

        await db.update(products).set({
          averageRating: avgRating,
          totalReviews: numReviews
        }).where(eq(products.id, pr.id));
      }
      console.log('   ✅ Mock Reviews Created');
    } else {
      console.log('\n⚠️ No products were inserted. Skipping order generation.');
    }

    console.log('\n🎉 Product and Order seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during product seeding:', error);
  }
};