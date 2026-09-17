const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModules } = require('./helpers');

const { SILH } = loadModules(['detection.js']);

test('detects the supported deterministic PII categories', () => {
  const text = [
    'email jane.doe@example.com',
    'phone +1 (415) 555-0132',
    'ssn 123-45-6789',
    'card 4111 1111 1111 1111',
    'ip 192.0.2.42',
    'dob 1990-02-28',
    'iban GB82 WEST 1234 5698 7654 32',
    'key sk-abcdefghijklmnopqrstuvwxyz123456',
    'jwt eyJabcdefghijk.abcdefghijklm.abcdefghijklm',
  ].join('\n');

  const types = new Set(SILH.detection.detect(text).map((finding) => finding.type));
  for (const type of [
    'EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'IP_ADDRESS', 'DOB', 'IBAN', 'API_KEY', 'JWT',
  ]) assert.equal(types.has(type), true, `missing ${type}`);
});

test('rejects invalid checksums and impossible dates', () => {
  const findings = SILH.detection.detect(
    'card 4111 1111 1111 1112 iban GB82 WEST 1234 5698 7654 31 dob 2023-02-29'
  );
  assert.deepEqual(Array.from(findings), []);
});

test('requires context for bare ten-digit phone numbers', () => {
  assert.equal(SILH.detection.detect('Order 1234567890 is ready').length, 0);
  assert.equal(SILH.detection.detect('Phone: 4155550132')[0].type, 'PHONE');
});

test('honors category filters and case-insensitive allowlists', () => {
  const text = 'Jane@Example.com and +1 (415) 555-0132';
  const findings = SILH.detection.detect(text, {
    enabledCategories: ['EMAIL'],
    allowlist: ['jane@example.com'],
  });
  assert.deepEqual(Array.from(findings), []);
});

test('can ignore inline and fenced code while preserving offsets', () => {
  const text = 'Outside a@example.com\n```\ninside b@example.com\n```\n`c@example.com`';
  const findings = SILH.detection.detect(text, { ignoreCodeBlocks: true });
  assert.deepEqual(Array.from(findings, (finding) => finding.text), ['a@example.com']);
  assert.equal(findings[0].start, text.indexOf('a@example.com'));
});

test('fuses overlapping findings in favor of confidence then length', () => {
  const spans = SILH.detection.fuseSpans([
    { start: 0, end: 10, confidence: 0.5, type: 'A' },
    { start: 2, end: 8, confidence: 0.9, type: 'B' },
  ]);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].type, 'B');
});
