const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModules } = require('./helpers');

test('applies mixed decisions without corrupting span offsets', async () => {
  const { SILH } = loadModules(['redaction.js']);
  const text = 'Email a@example.com, phone +1 (415) 555-0132.';
  const emailStart = text.indexOf('a@example.com');
  const phone = '+1 (415) 555-0132';
  const phoneStart = text.indexOf(phone);
  const result = await SILH.redaction.applyDecisions(text, [
    { finding: { type: 'EMAIL', text: 'a@example.com', start: emailStart, end: emailStart + 13 }, action: 'tokenize' },
    { finding: { type: 'PHONE', text: phone, start: phoneStart, end: phoneStart + phone.length }, action: 'mask' },
  ], 'chatgpt::one');

  assert.match(result, /Email \[EMAIL_1_[a-f0-9]{8}\]/);
  assert.match(result, /phone █{12}\./);
});

test('reuses tokens and reverse maps only within a conversation', async () => {
  const { SILH } = loadModules(['redaction.js']);
  const finding = { type: 'EMAIL', text: 'a@example.com', start: 0, end: 13 };
  const first = await SILH.redaction.applyDecisions('a@example.com', [
    { finding, action: 'tokenize' },
  ], 'claude::one');
  const second = await SILH.redaction.applyDecisions('a@example.com', [
    { finding, action: 'tokenize' },
  ], 'claude::one');

  assert.equal(first, second);
  assert.equal(await SILH.redaction.reverseMap(`Hello ${first}`, 'claude::one'), 'Hello a@example.com');
  assert.equal(await SILH.redaction.reverseMap(first, 'claude::two'), first);
});

test('keep leaves the source untouched', async () => {
  const { SILH } = loadModules(['redaction.js']);
  const finding = { type: 'EMAIL', text: 'a@example.com', start: 0, end: 13 };
  const result = await SILH.redaction.applyDecisions('a@example.com', [
    { finding, action: 'keep' },
  ], 'gemini::one');
  assert.equal(result, 'a@example.com');
});
