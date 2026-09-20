/**
 * Normalizes and validates Indian mobile phone numbers.
 *
 * Accepted input formats:
 * - Empty / whitespace / null -> normalized: null, isValid: true
 * - 9876543210 -> normalized: +919876543210, isValid: true
 * - +919876543210 -> normalized: +919876543210, isValid: true
 * - +91 98765 43210 -> normalized: +919876543210, isValid: true
 * - 09876543210 -> normalized: +919876543210, isValid: true
 * - Invalid length or characters -> normalized: null, isValid: false
 */
export function normalizeIndianPhone(input: string | null | undefined): {
  normalized: string | null;
  isValid: boolean;
} {
  if (!input || !input.trim()) {
    return { normalized: null, isValid: true };
  }

  const raw = input.trim();
  let digits = raw.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return {
      normalized: `+91${digits}`,
      isValid: true,
    };
  }

  return {
    normalized: null,
    isValid: false,
  };
}
