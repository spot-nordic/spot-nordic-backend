import fs from 'fs/promises';
import path from 'path';
import { db } from '../../configs/db.config';
import { blogs, users, blogComments, blogInteractions } from '../../db/schema';
import { eq, ne } from 'drizzle-orm';
import { uploadFileToS3 } from '../../services/upload.service';

const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
};

const getFileBuffer = async (filename: string): Promise<Buffer | null> => {
  try {
    const filePath = path.join(__dirname, '../blogdata', filename);
    return await fs.readFile(filePath);
  } catch (error) {
    console.warn(`Warning: Could not read local file ${filename} in src/utils/blogdata. Skipping image upload for this post.`);
    return null;
  }
};

const generateComments = [
  "This is a fascinating perspective on color matching! I never realized how complex flag colors were.",
  "Great read. The inconsistency between coated and uncoated paper has always frustrated me.",
  "Very informative! Thank you for sharing this history.",
  "Spot on. Brand identity relies entirely on color consistency.",
  "I completely agree. We need better standardization across digital and print.",
  "This perfectly explains the issues I've had when printing corporate logos.",
  "Brilliant breakdown of the CMYK limitations.",
  "As a designer, this is incredibly relevant to my daily workflow."
];

export const seedBlogs = async () => {
  try {
    const adminUsers = await db.select().from(users).where(eq(users.role, 'ADMIN'));
    const regularUsers = await db.select().from(users).where(ne(users.role, 'ADMIN'));
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin user found to author blogs. Please seed an admin user first.');
      return;
    }

    const author = adminUsers[0];

    const blogData = [
      {
        title: 'Spot Matching System: How, why and when is it ideal?',
        slug: 'spot-matching-system-ideal-use',
        imageFile: '1.png',
        htmlContent: `
          <h2>By Ingi Karlsson, creator of the Spot Matching System</h2>
          <p>When we think about colours, there is one item that is especially close to my heart, and hopefully yours too. This is the colour of our national flag. It brings about a feeling of belonging and we feel that the colours of our flag should be respected and kept correct, at any cost (almost) - just like we are not ok with someone burning our flag in the street or peeing on it.</p>
          <p>If you think about it, of course the colours of your flag are in fact nothing less than the <strong>Brand colours</strong> of your country.</p>
          <h3>The Evolution of Flag Colours</h3>
          <p>It should though be kept in mind that most flags were designed a long time ago, before there were any proper colour matching systems and long before anyone thought about printing colours in CMYK and long before some experts on colour found out that colours of brands should - and since recently, COULD be presented correctly, no matter if they are being printed on a cloth/textile, on paper, plastic, in CMYK or as spot colours or displayed on the Internet.</p>
          <blockquote>The most popular colour matching system in the world today is of course PANTONE.</blockquote>
          <p>In the past flag colours had been defined by specialized textile colour systems intended only for textile. And so some 60 years ago or so, the experts got together and came to the natural conclusion that it would be appropriate to add a formal definition for those flag colours for other purposes than just the flag itself, so they could be printed on paper according to a standard.</p>
        `
      },
      {
        title: 'The 5 Variations of a Single Flag Colour',
        slug: 'five-variations-single-flag-colour',
        imageFile: '2.jpeg',
        htmlContent: `
          <h2>The Complexity of Print Standardization</h2>
          <p>When experts decided to formally define flag colours for print, the natural solution was to find the closest PANTONE colour that looked close to the original colour of the flag. Typically there is simply one PANTONE colour for each flag colour.</p>
          <p>In many cases I don't know if the experts had Pantone C or Pantone U in mind, since of course <strong>Pantone C and Pantone U don't look the same</strong> = they are not the same colours even if (and because) they share the same recipe when you mix them. My guess is that most of them had Pantone C (Pantone Formula Guide, Coated version) in mind.</p>
          <h3>The CMYK Era</h3>
          <p>Around 2000, when CMYK printing had become very common worldwide, the experts realized that CMYK values for the national flags were now necessary to standardize the colours of the flags when printed in 4 colour. Just like with the PANTONE colours, the experts typically added a single CMYK value - i.e. fixed percentages of Cyan, Magenta, Yellow and Black, to the flag colour descriptions.</p>
          <p>Same rule applies here: The same CMYK halftone (recipe) will result in one colour when printed on coated paper and another colour when printed on uncoated paper.</p>
          <h3>The Resulting Chaos</h3>
          <p>So now in reality we find ourselves with a total of 5 different print versions of colours for each flag colour:</p>
          <ul>
            <li><strong>1)</strong> The original textile colour</li>
            <li><strong>2)</strong> Pantone C (recipe for mixed spot colour)</li>
            <li><strong>3)</strong> Pantone U (same recipe for mixed spot colour)</li>
            <li><strong>4)</strong> CMYK C (4 colour variation, fixed percentages)</li>
            <li><strong>5)</strong> CMYK U (4 colour variation, same fixed percentages)</li>
          </ul>
        `
      },
      {
        title: 'The EU Flag: A Case Study in Colour Confusion',
        slug: 'eu-flag-case-study-colour-confusion',
        imageFile: '3.png',
        htmlContent: `
          <h2>Standardizing a Continent's Brand</h2>
          <p>To prove my point about colour standardization issues, I decided to take a closer look at a flag that one would assume would be completely bulletproof, when it comes to colour. It represents an entire continent (well a big part of it) and it was intended to be used in its current colours for years and probably decades.</p>
          <p>When examining the original website of the EU, the guidelines present fixed colour values that simply do not translate across different physical mediums.</p>
          <h3>The Problem with Fixed Values</h3>
          <p>When an institution declares that a specific blue must be used, they often provide a single Pantone reference and a single CMYK breakdown. However, as any print professional knows, ink reacts differently depending on the substrate. The blue on a glossy coated brochure will look fundamentally different from the exact same CMYK percentages printed on an uncoated letterhead.</p>
          <p>This reveals a fundamental misunderstanding of colour science at the highest levels of institutional branding. A true Spot Matching System is required to bridge these physical gaps.</p>
        `
      },
      {
        title: 'Pantone Coated vs Uncoated: The Hidden Difference',
        slug: 'pantone-coated-vs-uncoated',
        imageFile: '4.jpg',
        htmlContent: `
          <h2>Why the Same Ink Looks Different</h2>
          <p>One of the most common misunderstandings in brand design is the relationship between Pantone C (Coated) and Pantone U (Uncoated). Designers often pick a single Pantone number, let's say Pantone 185, and expect it to look identical across all their corporate stationery.</p>
          <h3>The Substrate Absorbtion Effect</h3>
          <p>Coated paper has a surface sealant, usually clay, which restricts the ink from absorbing into the fibers of the paper. The ink sits on top, retaining its sharp, vibrant, and deep characteristics. Uncoated paper is highly porous. The ink sinks into the fibers, causing it to spread slightly (dot gain) and lose a significant amount of its vibrancy and darkness.</p>
          <ul>
            <li><strong>Coated:</strong> Crisp, bright, vibrant, high-contrast.</li>
            <li><strong>Uncoated:</strong> Soft, muted, darker, less saturated.</li>
          </ul>
          <p>Because they share the exact same ink mixing recipe, printing the same ink on these two different surfaces yields two distinct colours. This is why a unified Spot Matching System is crucial for brand consistency.</p>
        `
      },
      {
        title: 'The Limitations of CMYK in Brand Identity',
        slug: 'limitations-cmyk-brand-identity',
        imageFile: '5.jpg',
        htmlContent: `
          <h2>Beyond Cyan, Magenta, Yellow, and Black</h2>
          <p>CMYK printing revolutionized the industry by allowing full-colour images to be reproduced using only four plates. However, when it comes to reproducing specific brand colours—like the vibrant orange of a telecommunications company or the deep blue of a national flag—CMYK often falls drastically short.</p>
          <h3>The Colour Gamut Problem</h3>
          <p>The CMYK colour gamut (the range of colours it can reproduce) is significantly smaller than the RGB gamut of a computer monitor, and also smaller than the range of colours achievable by mixing solid Spot inks. Vivid oranges, bright greens, and deep navy blues are notoriously difficult, if not impossible, to hit accurately using standard 4-colour process.</p>
          <p>This is why defining a flag or a brand strictly by a fixed CMYK percentage is dangerous. It guarantees that the colour will never reach its true visual potential on paper.</p>
        `
      },
      {
        title: 'Why We Need the Spot Matching System',
        slug: 'why-we-need-spot-matching-system',
        imageFile: '1.png',
        htmlContent: `
          <h2>A New Paradigm for Colour Consistency</h2>
          <p>The historical approach to colour matching is broken. By assigning a single CMYK value to a brand colour, we ignore the physical realities of paper types, printing presses, and ink absorption.</p>
          <h3>Dynamic Matching Over Fixed Recipes</h3>
          <p>The Spot Matching System proposes a different approach. Instead of fixing the <em>recipe</em>, we must fix the <em>visual outcome</em>. If the goal is to make a logo look identical on a glossy magazine cover and a matte cardboard box, the CMYK values <strong>must</strong> be different for each medium.</p>
          <p>By shifting our focus from the numbers in the file to the visual reality of the final product, we can achieve true brand consistency. This system respects the original intention of the colour, treating it with the same reverence we treat our national flags.</p>
        `
      },
      {
        title: 'Translating Textile Colours to Paper',
        slug: 'translating-textile-colours-to-paper',
        imageFile: '2.jpeg',
        htmlContent: `
          <h2>Bridging Two Worlds</h2>
          <p>As mentioned regarding national flags, many of the world's most important colours were originally formulated for textiles. Flags, military uniforms, and royal banners were dyed using chemical processes completely unrelated to modern offset printing.</p>
          <h3>The Translation Challenge</h3>
          <p>When the print industry attempted to standardize these colours 60 years ago, they had to visually match dyed fabrics to printed ink swatches. This process is inherently subjective. Furthermore, a flag is often viewed backlit (by the sun) and in motion, whereas a printed document is viewed flat under reflected light.</p>
          <p>Creating a true matching system requires acknowledging these physical differences and providing designers with the specific formulations needed to replicate the <em>feeling</em> of the textile colour on paper, rather than just mathematically converting values.</p>
        `
      },
      {
        title: 'Digital Displays vs Physical Print',
        slug: 'digital-displays-vs-physical-print',
        imageFile: '3.png',
        htmlContent: `
          <h2>The RGB Illusion</h2>
          <p>Today, the first place a new brand identity is usually seen is on a digital screen. Designers spend hours perfecting a colour in RGB space, only to be disappointed when the physical brochures arrive from the printer.</p>
          <h3>Light vs. Pigment</h3>
          <p>Monitors emit light (additive colour), allowing for incredible vibrancy and brightness. Paper reflects light (subtractive colour). When you mix all RGB colours, you get pure white light. When you mix all CMYK colours, you get a muddy dark brown/black.</p>
          <p>The Spot Matching System serves as the crucial interpreter between the digital dream and the physical reality, ensuring that what the client falls in love with on screen can actually be achieved on a printing press.</p>
        `
      },
      {
        title: 'The True Cost of Brand Inconsistency',
        slug: 'true-cost-brand-inconsistency',
        imageFile: '4.jpg',
        htmlContent: `
          <h2>Trust, Recognition, and Colour</h2>
          <p>Why does it matter if a corporate blue is slightly too purple on a business card and slightly too green on a billboard? It matters because colour is the fastest form of non-verbal communication. It registers in the human brain before shapes, logos, or typography.</p>
          <h3>The Psychology of Matching</h3>
          <p>When a brand's colours fluctuate wildly across different mediums, it subconsciously communicates instability, lack of attention to detail, and a fragmented identity. Just as we wouldn't accept our national flag printed in the wrong shade of red, consumers unconsciously lose trust in brands that can't maintain their visual identity.</p>
          <p>Implementing a rigorous Spot Matching System is not just a technical necessity; it is a fundamental pillar of brand equity protection.</p>
        `
      },
      {
        title: 'Redefining the Industry Standard',
        slug: 'redefining-industry-standard',
        imageFile: '5.jpg',
        htmlContent: `
          <h2>Moving Beyond Outdated Guidelines</h2>
          <p>We are at a turning point in the graphic arts industry. For decades, we have relied on a patchwork of systems that were never designed to work together seamlessly. The reliance on a single CMYK code for all printing scenarios is a relic of the past.</p>
          <h3>The Path Forward</h3>
          <p>The future of colour matching lies in intelligent, adaptable systems. Designers, printers, and brand managers must adopt frameworks like the Spot Matching System that account for the substrate, the viewing environment, and the specific printing technology being used. Only then can we guarantee that the colours we design are the colours the world sees.</p>
        `
      },
      {
        title: 'Spot Colours: When 4-Colour Just Won\'t Do',
        slug: 'spot-colours-when-4-colour-fails',
        imageFile: '1.png',
        htmlContent: `
          <h2>The Need for Pre-Mixed Ink</h2>
          <p>Despite the dominance of digital and CMYK printing, true Spot colours remain irreplaceable for premium branding. A spot colour is a specially mixed ink that is printed using its own dedicated plate on the press.</p>
          <h3>Vibrancy and Consistency</h3>
          <p>Because spot colours are pre-mixed, they offer absolute consistency across a print run. They also allow for the reproduction of colours completely outside the CMYK gamut—such as fluorescents, metallics, and extreme vibrancies. When brand accuracy is paramount, bypassing CMYK entirely and utilizing a dedicated spot matching approach is often the only acceptable solution.</p>
        `
      },
      {
        title: 'The Future of Nordic Visual Identity',
        slug: 'future-nordic-visual-identity',
        imageFile: '2.jpeg',
        htmlContent: `
          <h2>Applying Colour Science to Regional Branding</h2>
          <p>Nordic design is world-renowned for its clarity, minimalism, and precise use of colour. From the stark contrast of the Icelandic flag to the warm, muted tones of Scandinavian furniture, colour is central to our regional identity.</p>
          <h3>Protecting Our Heritage</h3>
          <p>As our brands and national symbols are increasingly reproduced across a fragmented media landscape, protecting this visual heritage requires technical rigor. By adopting advanced colour matching methodologies, we ensure that the aesthetic values of Nordic design are preserved and accurately represented to the global audience, whether on a silk flag or a digital display.</p>
        `
      }
    ];

    let seededCount = 0;

    for (let i = 0; i < blogData.length; i++) {
      const data = blogData[i];
      let thumbnailUrl = 'https://via.placeholder.com/800x400?text=Spot+Matching+System';

      const fileBuffer = await getFileBuffer(data.imageFile);
      if (fileBuffer) {
        const mimeType = getMimeType(data.imageFile);
        thumbnailUrl = await uploadFileToS3(fileBuffer, data.imageFile, mimeType, 'blogs');
      }

      // Generate dates spread over the last 6 months
      const randomDaysAgo = Math.floor(Math.random() * 180);
      const publishedDate = new Date();
      publishedDate.setDate(publishedDate.getDate() - randomDaysAgo);

      // Insert Blog
      const newBlog = await db.insert(blogs).values({
        title: data.title,
        slug: data.slug,
        htmlContent: data.htmlContent,
        thumbnailUrl,
        authorId: author.id,
        status: 'PUBLISHED',
        publishedAt: publishedDate,
        createdAt: publishedDate,
        updatedAt: publishedDate,
        viewsCount: 0, 
        likesCount: 0, 
        dislikesCount: 0 
      }).returning();

      const blogId = newBlog[0].id;
      
      const viewsCount = Math.floor(Math.random() * 800) + 150;
      let likes = 0;
      let dislikes = 0;

      if (regularUsers.length > 0) {
        // Seed Interactions
        const shuffledUsers = [...regularUsers].sort(() => 0.5 - Math.random());
        const maxInteractions = Math.min(regularUsers.length, Math.floor(Math.random() * 10) + 2);
        
        for (let j = 0; j < maxInteractions; j++) {
          const user = shuffledUsers[j];
          const isLike = Math.random() > 0.15; // 85% chance of like
          
          if (isLike) likes++;
          else dislikes++;

          await db.insert(blogInteractions).values({
            blogId: blogId,
            userId: user.id,
            type: isLike ? 'LIKE' : 'DISLIKE',
            createdAt: new Date(publishedDate.getTime() + Math.random() * 10000000)
          });
        }

        // Seed Comments
        const numComments = Math.floor(Math.random() * 4) + 1; // 1 to 4 comments
        for (let k = 0; k < Math.min(numComments, regularUsers.length); k++) {
          const randomComment = generateComments[Math.floor(Math.random() * generateComments.length)];
          const commenter = shuffledUsers[(maxInteractions + k) % regularUsers.length]; 
          
          await db.insert(blogComments).values({
            blogId: blogId,
            userId: commenter.id,
            content: randomComment,
            createdAt: new Date(publishedDate.getTime() + Math.random() * 20000000)
          });
        }
      }

      // Update the blog with the final counts
      await db.update(blogs).set({
        viewsCount,
        likesCount: likes,
        dislikesCount: dislikes
      }).where(eq(blogs.id, blogId));

      seededCount++;
    }

    console.log(`✅ Successfully seeded ${seededCount} high-quality blogs with images, views, likes, and comments.`);
  } catch (error) {
    console.error('❌ Error seeding blogs:', error);
  }
};