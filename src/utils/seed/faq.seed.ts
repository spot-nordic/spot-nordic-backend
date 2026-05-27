import { db } from '../../configs/db.config';
import { faqs } from '../../db/schema';

export const seedFaqs = async () => {
  await db.insert(faqs).values([
    // General E-commerce FAQs
    {
      question: 'What is your shipping policy?',
      answer: 'We ship worldwide using climate-compensated logistics, with tracking included on all orders.',
      category: 'Shipping',
      sortOrder: 1,
      isActive: true,
    },
    {
      question: 'How do I return a product?',
      answer: 'You can return items in their original condition within 30 days of purchase. Please visit our Returns portal to generate a label.',
      category: 'Returns',
      sortOrder: 2,
      isActive: true,
    },
    
    // Spot Matching System Specific FAQs
    {
      question: 'What is the Spot Matching System (SMS)?',
      answer: 'The Spot Matching System is an advanced framework designed to ensure absolute color consistency across different mediums. Unlike traditional systems that rely on a single recipe (like one CMYK code), SMS adapts the color formulation based on the physical substrate (e.g., coated vs. uncoated paper) to ensure the visual outcome remains identical.',
      category: 'Color Matching',
      sortOrder: 3,
      isActive: true,
    },
    {
      question: 'Why do my brand colors look faded on uncoated paper?',
      answer: 'Uncoated paper is highly porous. When ink is applied, it absorbs deep into the paper fibers, causing it to lose vibrancy and saturation (dot gain). Coated paper has a sealant that keeps the ink on the surface, keeping it sharp. The Spot Matching System accounts for this by utilizing different ink formulations for different paper types to achieve the same visual result.',
      category: 'Color Matching',
      sortOrder: 4,
      isActive: true,
    },
    {
      question: 'Can I just use CMYK to print my exact brand color?',
      answer: 'Often, no. The CMYK (Cyan, Magenta, Yellow, Black) gamut is limited and cannot reproduce highly vibrant colors, deep navy blues, or rich oranges found in many national flags and corporate brands. For precise color fidelity, especially for brand identity, pre-mixed Spot colors are strongly recommended over standard 4-color process.',
      category: 'Color Matching',
      sortOrder: 5,
      isActive: true,
    },
    {
      question: 'How do you match textile colors, like national flags, for print?',
      answer: 'Flags and textiles are dyed using chemical processes entirely different from printing inks. Furthermore, flags are typically viewed backlit (by the sun), while paper is viewed via reflected light. Our system does not just mathematically convert the color; it visually translates the "feeling" and vibrancy of the dyed fabric into a specific ink formulation for paper.',
      category: 'Color Matching',
      sortOrder: 6,
      isActive: true,
    },
    {
      question: 'Why does the color on my monitor look different than the printed brochure?',
      answer: 'Monitors use RGB (additive color, emitting light), which can display extremely bright and vibrant colors. Printing uses CMYK or Spot inks (subtractive color, reflecting light). You cannot print light. Our system bridges this gap by determining the closest physical ink match to your digital design, ensuring what you see on screen translates accurately to the press.',
      category: 'Color Matching',
      sortOrder: 7,
      isActive: true,
    }
  ]);
  console.log('✅ FAQs seeded');
};