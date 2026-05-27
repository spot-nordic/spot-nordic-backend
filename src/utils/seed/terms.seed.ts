import { db } from '../../configs/db.config';
import { termsConditions } from '../../db/schema';

export const seedTerms = async () => {
  const extendedTermsHtml = `
    <h1>Terms of Service</h1>
    <p><strong>Effective Date:</strong> January 1, 2024</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing and using Spot Nordic (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.</p>

    <h2>2. Description of Service</h2>
    <p>Spot Nordic provides an online platform dedicated to Nordic design, offering a curated shop, informational blogs, editorial content, and community interaction features. We reserve the right to modify, suspend, or discontinue the Service at any time without notice.</p>

    <h2>3. User Accounts and Registration</h2>
    <p>To access certain features of the Service (like commenting, interacting with blogs, or managing orders), you must register for an account. You agree to:</p>
    <ul>
      <li>Provide accurate, current, and complete information during the registration process.</li>
      <li>Maintain and promptly update your account information.</li>
      <li>Maintain the security of your password and accept all risks of unauthorized access to your account.</li>
      <li>Notify us immediately if you discover or otherwise suspect any security breaches related to the Service.</li>
    </ul>

    <h2>4. E-commerce and Purchases</h2>
    <p>If you purchase any products or services made available through the Service ("Purchase"), you may be asked to supply certain information relevant to your Purchase including, without limitation, your credit card number, the expiration date of your credit card, your billing address, and your shipping information.</p>
    <p>We reserve the right to refuse or cancel your order at any time for certain reasons including but not limited to: product or service availability, errors in the description or price of the product or service, error in your order or other reasons.</p>

    <h2>5. Intellectual Property</h2>
    <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Spot Nordic and its licensors. The Service is protected by copyright, trademark, and other laws of both the European Union and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Spot Nordic.</p>

    <h2>6. User-Generated Content</h2>
    <p>Users may post comments and interact with blogs on our platform. By posting content, you grant Spot Nordic a non-exclusive, royalty-free, perpetual, and worldwide license to use, reproduce, modify, adapt, publish, translate, and distribute it in any media. You agree not to post content that is illegal, offensive, threatening, libelous, defamatory, or otherwise objectionable.</p>

    <h2>7. Limitation of Liability</h2>
    <p>In no event shall Spot Nordic, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory.</p>

    <h2>8. Governing Law</h2>
    <p>These Terms shall be governed and construed in accordance with the laws of Sweden/European Union, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</p>

    <h2>9. Changes to Terms</h2>
    <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

    <h2>10. Contact Information</h2>
    <p>If you have any questions about these Terms, please contact us at legal@spotnordic.com.</p>
  `;

  await db.insert(termsConditions).values({
    version: '1.0.0',
    title: 'Spot Nordic Terms of Service',
    htmlContent: extendedTermsHtml,
    isActive: true,
  });
  console.log('✅ Terms seeded');
};