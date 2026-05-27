export const validateTextContent = (text: string): void => {
  if (!text) return;

  const restrictedKeywords = [
    'abuseword1', 'abuseword2', 'spamlink.com'
  ];

  const lowerText = text.toLowerCase();
  
  for (const keyword of restrictedKeywords) {
    if (lowerText.includes(keyword)) {
      throw new Error('Content contains restricted or inappropriate language.');
    }
  }
};