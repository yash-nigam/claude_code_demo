const {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateUUID,
  sanitizeString,
  validateCreditCard,
  validateDateOfBirth
} = require('../../src/utils/validators');

describe('validatePhoneNumber', () => {
  test('accepts a plain digit string within 7-15 digits', () => {
    expect(validatePhoneNumber('9876543210')).toBe(true);
  });

  test('accepts a number with a leading +', () => {
    expect(validatePhoneNumber('+19876543210')).toBe(true);
  });

  test('accepts numbers formatted with spaces, hyphens, and parentheses', () => {
    expect(validatePhoneNumber('+1 (987) 654-3210')).toBe(true);
  });

  test('accepts exactly 7 digits, the lower boundary', () => {
    expect(validatePhoneNumber('1234567')).toBe(true);
  });

  test('accepts exactly 15 digits, the upper boundary', () => {
    expect(validatePhoneNumber('123456789012345')).toBe(true);
  });

  test('rejects exactly 6 digits, one below the lower boundary', () => {
    expect(validatePhoneNumber('123456')).toBe(false);
  });

  test('rejects strings that are too short', () => {
    expect(validatePhoneNumber('12345')).toBe(false);
  });

  test('rejects strings that are too long', () => {
    expect(validatePhoneNumber('1234567890123456')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(validatePhoneNumber('')).toBe(false);
  });

  test('rejects a string of separators with no digits', () => {
    expect(validatePhoneNumber('() - ')).toBe(false);
  });

  test('rejects a lone + with no digits', () => {
    expect(validatePhoneNumber('+')).toBe(false);
  });

  test('rejects a + that is not in the leading position', () => {
    expect(validatePhoneNumber('987+6543210')).toBe(false);
  });

  test('rejects non-numeric characters', () => {
    expect(validatePhoneNumber('987-abc-3210')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(validatePhoneNumber(9876543210)).toBe(false);
    expect(validatePhoneNumber(null)).toBe(false);
    expect(validatePhoneNumber(undefined)).toBe(false);
    expect(validatePhoneNumber(0)).toBe(false);
    expect(validatePhoneNumber({})).toBe(false);
    expect(validatePhoneNumber([])).toBe(false);
  });
});

describe('validateEmail', () => {
  test('accepts a standard email address', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('accepts an email with a multi-part domain', () => {
    expect(validateEmail('user@mail.example.co.uk')).toBe(true);
  });

  test('accepts an email surrounded by whitespace', () => {
    expect(validateEmail('  user@example.com  ')).toBe(true);
  });

  test('rejects an email missing the @ symbol', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  test('rejects an email missing the domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  test('rejects an email missing the local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  test('rejects an email missing the TLD', () => {
    expect(validateEmail('user@example')).toBe(false);
  });

  test('rejects an email containing a space', () => {
    expect(validateEmail('user name@example.com')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  test('rejects a whitespace-only string', () => {
    expect(validateEmail('   ')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(12345)).toBe(false);
    expect(validateEmail({})).toBe(false);
    expect(validateEmail([])).toBe(false);
  });
});

describe('validatePassword', () => {
  test('accepts a password at the minimum length boundary', () => {
    expect(validatePassword('abcdefgh')).toBe(true);
  });

  test('accepts a password longer than the minimum length', () => {
    expect(validatePassword('a-much-longer-password')).toBe(true);
  });

  test('rejects a password one character below the minimum length', () => {
    expect(validatePassword('abcdefg')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(validatePassword('')).toBe(false);
  });

  test('accepts 8 whitespace characters, as length is not trimmed', () => {
    expect(validatePassword('        ')).toBe(true);
  });

  test('rejects non-string input', () => {
    expect(validatePassword(null)).toBe(false);
    expect(validatePassword(undefined)).toBe(false);
    expect(validatePassword(12345678)).toBe(false);
    expect(validatePassword({})).toBe(false);
    expect(validatePassword([])).toBe(false);
  });
});

describe('validateUUID', () => {
  test('accepts a well-formed UUID v4 string', () => {
    expect(validateUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });

  test('accepts a well-formed UUID v4 string in uppercase', () => {
    expect(validateUUID('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
  });

  test('rejects a UUID with a non-v4 version nibble', () => {
    expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(false);
  });

  test('accepts each of the valid variant nibbles 8, 9, a and b', () => {
    expect(validateUUID('123e4567-e89b-42d3-8456-426614174000')).toBe(true);
    expect(validateUUID('123e4567-e89b-42d3-9456-426614174000')).toBe(true);
    expect(validateUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    expect(validateUUID('123e4567-e89b-42d3-b456-426614174000')).toBe(true);
  });

  test('rejects a UUID with an invalid variant nibble', () => {
    expect(validateUUID('123e4567-e89b-42d3-1456-426614174000')).toBe(false);
  });

  test('rejects a UUID with surrounding whitespace, which is not trimmed', () => {
    expect(validateUUID(' 123e4567-e89b-42d3-a456-426614174000 ')).toBe(false);
  });

  test('rejects a UUID with a non-hex character', () => {
    expect(validateUUID('123e4567-e89b-42d3-a456-42661417400g')).toBe(false);
  });

  test('rejects a UUID with trailing extra characters', () => {
    expect(validateUUID('123e4567-e89b-42d3-a456-426614174000x')).toBe(false);
  });

  test('rejects a UUID missing hyphens', () => {
    expect(validateUUID('123e4567e89b42d3a456426614174000')).toBe(false);
  });

  test('rejects an arbitrary non-UUID string', () => {
    expect(validateUUID('not-a-uuid')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(validateUUID('')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(validateUUID(null)).toBe(false);
    expect(validateUUID(undefined)).toBe(false);
    expect(validateUUID(12345)).toBe(false);
    expect(validateUUID({})).toBe(false);
    expect(validateUUID([])).toBe(false);
  });
});

describe('sanitizeString', () => {
  test('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  test('removes control characters', () => {
    expect(sanitizeString('hello\x00world')).toBe('helloworld');
    expect(sanitizeString('hello\x1Fworld')).toBe('helloworld');
    expect(sanitizeString('hello\x7Fworld')).toBe('helloworld');
  });

  test('removes newlines and tabs, which fall in the control range', () => {
    expect(sanitizeString('a\nb\tc')).toBe('abc');
  });

  test('leaves inner whitespace untouched', () => {
    expect(sanitizeString('  hello   world  ')).toBe('hello   world');
  });

  test('does not trim whitespace shielded by a leading control character', () => {
    // trim() runs before control characters are stripped, so a leading \x00
    // stops the trim and the spaces behind it survive.
    expect(sanitizeString('\x00  hello  ')).toBe('  hello');
  });

  test('returns an empty string for an input of only control characters', () => {
    expect(sanitizeString('\x00\x01')).toBe('');
  });

  test('returns an empty string for an empty string input', () => {
    expect(sanitizeString('')).toBe('');
  });

  test('returns an empty string for a whitespace-only input', () => {
    expect(sanitizeString('   ')).toBe('');
  });

  test('returns an empty string for non-string input', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(12345)).toBe('');
    expect(sanitizeString({})).toBe('');
    expect(sanitizeString([])).toBe('');
  });
});

describe('validateCreditCard', () => {
  test('accepts a valid 16-digit Visa test number', () => {
    expect(validateCreditCard('4111111111111111')).toBe(true);
  });

  test('accepts a valid 16-digit Mastercard test number', () => {
    expect(validateCreditCard('5500005555555559')).toBe(true);
  });

  test('accepts a valid 15-digit Amex test number', () => {
    expect(validateCreditCard('340000000000009')).toBe(true);
  });

  test('accepts exactly 13 digits, the lower boundary', () => {
    expect(validateCreditCard('4222222222222')).toBe(true);
  });

  test('accepts exactly 19 digits, the upper boundary', () => {
    expect(validateCreditCard('4000000000000000006')).toBe(true);
  });

  test('accepts a number formatted with spaces and hyphens', () => {
    expect(validateCreditCard('4111 1111-1111 1111')).toBe(true);
  });

  test('rejects a number that fails the Luhn checksum', () => {
    expect(validateCreditCard('4111111111111112')).toBe(false);
  });

  test('rejects 12 digits, one below the lower boundary', () => {
    expect(validateCreditCard('422222222222')).toBe(false);
  });

  test('rejects 20 digits, one above the upper boundary', () => {
    expect(validateCreditCard('40000000000000000067')).toBe(false);
  });

  test('rejects a string containing non-digit characters', () => {
    expect(validateCreditCard('4111-1111-1111-111a')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(validateCreditCard('')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(validateCreditCard(4111111111111111)).toBe(false);
    expect(validateCreditCard(null)).toBe(false);
    expect(validateCreditCard(undefined)).toBe(false);
    expect(validateCreditCard({})).toBe(false);
    expect(validateCreditCard([])).toBe(false);
  });
});

describe('validateDateOfBirth', () => {
  test('accepts a valid past date', () => {
    expect(validateDateOfBirth('1990-06-15')).toBe(true);
  });

  test('accepts today\'s date', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(validateDateOfBirth(today)).toBe(true);
  });

  test('accepts a date exactly 120 years ago', () => {
    const year = new Date().getFullYear() - 120;
    expect(validateDateOfBirth(`${year}-01-01`)).toBe(true);
  });

  test('rejects a date in the future', () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(validateDateOfBirth(`${nextYear}-01-01`)).toBe(false);
  });

  test('rejects a date more than 120 years ago', () => {
    const year = new Date().getFullYear() - 121;
    expect(validateDateOfBirth(`${year}-01-01`)).toBe(false);
  });

  test('rejects a calendar date that does not exist', () => {
    expect(validateDateOfBirth('2023-02-30')).toBe(false);
  });

  test('rejects a malformed date string', () => {
    expect(validateDateOfBirth('06/15/1990')).toBe(false);
    expect(validateDateOfBirth('1990-6-15')).toBe(false);
    expect(validateDateOfBirth('not-a-date')).toBe(false);
    expect(validateDateOfBirth('')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(validateDateOfBirth(631152000000)).toBe(false);
    expect(validateDateOfBirth(new Date('1990-06-15'))).toBe(false);
    expect(validateDateOfBirth(null)).toBe(false);
    expect(validateDateOfBirth(undefined)).toBe(false);
    expect(validateDateOfBirth({})).toBe(false);
    expect(validateDateOfBirth([])).toBe(false);
  });
});
