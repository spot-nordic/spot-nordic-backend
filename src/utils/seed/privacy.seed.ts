import { db } from '../../configs/db.config';
import { privacyPolicies } from '../../db/schema';

export const seedPrivacy = async () => {
  const extendedPrivacyHtml = `
    <h1>Privacy Policy</h1>
    <p><strong>Effective Date:</strong> January 1, 2024</p>

    <h2>1. Introduction</h2>
    <p>Welcome to Spot Nordic. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.</p>

    <h2>2. The Data We Collect About You</h2>
    <p>Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
    <ul>
      <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
      <li><strong>Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
      <li><strong>Financial Data:</strong> includes bank account and payment card details (processed securely via our payment gateways).</li>
      <li><strong>Transaction Data:</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
      <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform on the devices you use to access this website.</li>
      <li><strong>Profile Data:</strong> includes your username and password, purchases or orders made by you, your interests, preferences, feedback and survey responses.</li>
      <li><strong>Usage Data:</strong> includes information about how you use our website, products and services.</li>
    </ul>

    <h2>3. How We Use Your Personal Data</h2>
    <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
    <ul>
      <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., fulfilling an order).</li>
      <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
      <li>Where we need to comply with a legal or regulatory obligation.</li>
    </ul>

    <h2>4. Cookies and Tracking Technologies</h2>
    <p>We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</p>

    <h2>5. Data Security</h2>
    <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.</p>

    <h2>6. Your Legal Rights</h2>
    <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
    <ul>
      <li>Request access to your personal data.</li>
      <li>Request correction of your personal data.</li>
      <li>Request erasure of your personal data.</li>
      <li>Object to processing of your personal data.</li>
      <li>Request restriction of processing your personal data.</li>
      <li>Request transfer of your personal data.</li>
      <li>Right to withdraw consent.</li>
    </ul>

    <h2>7. Contact Us</h2>
    <p>If you have any questions about this privacy policy or our privacy practices, please contact our support team through the contact page or via support@spotnordic.com.</p>
  `;

  await db.insert(privacyPolicies).values({
    version: '1.0.0',
    title: 'Spot Nordic Privacy Policy',
    htmlContent: extendedPrivacyHtml,
    isActive: true,
  });
  console.log('✅ Privacy policy seeded');
};