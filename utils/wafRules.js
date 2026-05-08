const blockedPatterns = [
  { pattern: /<\s*script/i, reason: 'Embedded script tags are not allowed.' },
  { pattern: /<\/?\w+[^>]*>/, reason: 'HTML tags are not allowed.' },
  { pattern: /\bselect\b.*\bfrom\b/i, reason: 'SQL injection patterns are not allowed.' },
  { pattern: /\bunion\b.*\bselect\b/i, reason: 'SQL injection patterns are not allowed.' },
  { pattern: /\bdrop\b.*\btable\b/i, reason: 'SQL injection patterns are not allowed.' },
  { pattern: /(--|#|;)/, reason: 'SQL comment or separator patterns are not allowed.' }
];

export function inspectInput(value) {
  const input = String(value ?? '');
  for (const rule of blockedPatterns) {
    if (rule.pattern.test(input)) {
      return {
        blocked: true,
        reason: rule.reason,
        pattern: rule.pattern.toString(),
        input
      };
    }
  }
  return {
    blocked: false,
    reason: null,
    pattern: null,
    input
  };
}

export function sanitizeInput(value) {
  const input = String(value ?? '');
  return input.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
}

export function validateField(value, options = {}) {
  const text = String(value ?? '');
  const minLength = options.minLength ?? 1;
  const maxLength = options.maxLength ?? 255;
  if (text.length < minLength) {
    return { valid: false, message: `Must be at least ${minLength} character${minLength === 1 ? '' : 's'}.` };
  }
  if (text.length > maxLength) {
    return { valid: false, message: `Must be no more than ${maxLength} characters.` };
  }
  return { valid: true, message: '' };
}
