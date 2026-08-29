/**
 * Input Validation Utilities
 * Pure functions for validating user-supplied data before processing.
 */

/**
 * Validates an email address format.
 *
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
}

/**
 * Validates a password meets minimum requirements.
 * Requirements: at least 8 characters.
 *
 * @param {string} password
 * @returns {boolean}
 */
function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

/**
 * Validates a phone number, accepting an optional leading "+" and
 * 7-15 digits with spaces, hyphens, or parentheses as separators.
 *
 * @param {string} phone
 * @returns {boolean}
 */
function validatePhoneNumber(phone) {
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  return typeof phone === 'string' && phoneRegex.test(phone.trim().replace(/[\s\-()]/g, ''));
}

/**
 * Validates a UUID v4 string.
 *
 * @param {string} id
 * @returns {boolean}
 */
function validateUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
}

/**
 * Sanitizes a string by trimming whitespace and removing control characters.
 *
 * @param {string} input
 * @returns {string}
 */
function sanitizeString(input) {
  return typeof input === 'string' ? input.trim().replace(/[\x00-\x1F\x7F]/g, '') : '';
}

/**
 * Validates a credit card number: 13-19 digits (spaces and hyphens allowed
 * as separators) that passes the Luhn checksum.
 *
 * @param {string} cardNumber
 * @returns {boolean}
 */
function validateCreditCard(cardNumber) {
  return (
    typeof cardNumber === 'string' &&
    /^[0-9]{13,19}$/.test(cardNumber.replace(/[\s-]/g, '')) &&
    cardNumber
      .replace(/[\s-]/g, '')
      .split('')
      .reverse()
      .reduce((sum, digit, idx) => {
        const doubled = idx % 2 === 1 ? Number(digit) * 2 : Number(digit);
        return sum + (doubled > 9 ? doubled - 9 : doubled);
      }, 0) %
      10 ===
      0
  );
}

/**
 * Validates a date of birth given as an ISO "YYYY-MM-DD" string: it must be
 * a real calendar date, not in the future, and no more than 120 years ago.
 *
 * @param {string} dob
 * @returns {boolean}
 */
function validateDateOfBirth(dob) {
  return (
    typeof dob === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
    (() => {
      const date = new Date(dob);
      const now = new Date();
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === dob &&
        date <= now &&
        now.getFullYear() - date.getFullYear() <= 120
      );
    })()
  );
}

module.exports = {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateUUID,
  sanitizeString,
  validateCreditCard,
  validateDateOfBirth
};
