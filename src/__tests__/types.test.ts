import { parseDate, isValidType, isValidStatus, isValidCategory } from '../types.js';

describe('parseDate', () => {
  test('parses valid YYYY-MM-DD date', () => {
    const result = parseDate('2025-10-04');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(9); // 0-indexed
    expect(result?.getDate()).toBe(4);
  });

  test('returns null for invalid format', () => {
    expect(parseDate('2025/10/04')).toBeNull();
    expect(parseDate('10-04-2025')).toBeNull();
    expect(parseDate('2025-13-01')).toBeNull(); // Invalid month
    expect(parseDate('not a date')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });

  test('returns null for invalid date values', () => {
    expect(parseDate('2025-02-30')).toBeNull(); // Invalid day for February
  });
});

describe('isValidType', () => {
  test('returns true for valid types', () => {
    expect(isValidType('note')).toBe(true);
    expect(isValidType('project')).toBe(true);
    expect(isValidType('task')).toBe(true);
    expect(isValidType('daily')).toBe(true);
    expect(isValidType('meeting')).toBe(true);
  });

  test('returns false for invalid types', () => {
    expect(isValidType('invalid')).toBe(false);
    expect(isValidType('')).toBe(false);
    expect(isValidType(null)).toBe(false);
    expect(isValidType(undefined)).toBe(false);
    expect(isValidType(123)).toBe(false);
    expect(isValidType({})).toBe(false);
  });
});

describe('isValidStatus', () => {
  test('returns true for valid statuses', () => {
    expect(isValidStatus('active')).toBe(true);
    expect(isValidStatus('archived')).toBe(true);
    expect(isValidStatus('idea')).toBe(true);
    expect(isValidStatus('completed')).toBe(true);
  });

  test('returns false for invalid statuses', () => {
    expect(isValidStatus('invalid')).toBe(false);
    expect(isValidStatus('')).toBe(false);
    expect(isValidStatus(null)).toBe(false);
    expect(isValidStatus(undefined)).toBe(false);
  });
});

describe('isValidCategory', () => {
  test('returns true for valid categories', () => {
    expect(isValidCategory('work')).toBe(true);
    expect(isValidCategory('personal')).toBe(true);
    expect(isValidCategory('knowledge')).toBe(true);
    expect(isValidCategory('life')).toBe(true);
    expect(isValidCategory('dailies')).toBe(true);
  });

  test('returns false for invalid categories', () => {
    expect(isValidCategory('invalid')).toBe(false);
    expect(isValidCategory('')).toBe(false);
    expect(isValidCategory(null)).toBe(false);
    expect(isValidCategory(undefined)).toBe(false);
  });
});
