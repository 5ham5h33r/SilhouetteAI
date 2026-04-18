// SilhouetteAI - redaction & reverse-mapping.
// Tokens are salted per-install so user-typed `[PERSON_1]` is never accidentally rewritten.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});

  const mapCache = new Map(); // convKey -> map
  let cachedSalt = null;

  async function getSalt() {
    if (cachedSalt) return cachedSalt;
    const res = await chrome.storage.local.get('__silh_salt');
    if (res.__silh_salt) { cachedSalt = res.__silh_salt; return cachedSalt; }
    const buf = crypto.getRandomValues(new Uint8Array(4));
    cachedSalt = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
    await chrome.storage.local.set({ __silh_salt: cachedSalt });
    return cachedSalt;
  }

  async function loadMap(convKey) {
    if (mapCache.has(convKey)) return mapCache.get(convKey);
    const key = `tokmap:${convKey}`;
    const res = await chrome.storage.local.get(key);
    const map = res[key] || { counters: {}, forward: {}, reverse: {} };
    mapCache.set(convKey, map);
    return map;
  }

  async function saveMap(convKey, map) {
    mapCache.set(convKey, map);
    await chrome.storage.local.set({ [`tokmap:${convKey}`]: map });
  }

  function tokenFor(map, type, originalText, salt) {
    if (map.forward[originalText]) return map.forward[originalText];
    map.counters[type] = (map.counters[type] || 0) + 1;
    const token = `[${type}_${map.counters[type]}_${salt}]`;
    map.forward[originalText] = token;
    map.reverse[token] = originalText;
    return token;
  }

  const FAKES = {
    PERSON: ['Alex Morgan', 'Jordan Riley', 'Sam Chen', 'Taylor Kim'],
    EMAIL: ['alex@example.com', 'user@example.org'],
    PHONE: ['555-0100', '555-0149'],
    SSN: ['000-00-0000'],
    CREDIT_CARD: ['4111 1111 1111 1111'],
    IP_ADDRESS: ['192.0.2.1'],
    API_KEY: ['sk-REDACTED000000000000'],
    JWT: ['eyJFAKE.eyJFAKE.FAKE'],
    IBAN: ['GB00ABCD00000000000000'],
    DOB: ['1990-01-01'],
    ADDRESS: ['123 Example St'],
    ORG: ['Example Corp'],
  };

  function synthesizeFake(type) {
    const list = FAKES[type] || ['[REDACTED]'];
    return list[Math.floor(Math.random() * list.length)];
  }

  // decisions: [{finding, action: 'mask'|'tokenize'|'synthesize'|'keep'}]
  async function applyDecisions(text, decisions, convKey) {
    const salt = await getSalt();
    const map = await loadMap(convKey);

    const sorted = decisions.slice().sort((a, b) => b.finding.start - a.finding.start);
    let out = text;
    for (const d of sorted) {
      const { finding, action } = d;
      let replacement;
      switch (action) {
        case 'mask': {
          const len = Math.max(3, Math.min(finding.end - finding.start, 12));
          replacement = '\u2588'.repeat(len);
          break;
        }
        case 'tokenize':
          replacement = tokenFor(map, finding.type, finding.text, salt);
          break;
        case 'synthesize':
          replacement = synthesizeFake(finding.type);
          break;
        case 'keep':
        default:
          continue;
      }
      out = out.slice(0, finding.start) + replacement + out.slice(finding.end);
    }
    await saveMap(convKey, map);
    return out;
  }

  // Replaces any tokens in `text` with originals (display-only un-redaction).
  async function reverseMap(text, convKey) {
    const map = await loadMap(convKey);
    const keys = Object.keys(map.reverse);
    if (keys.length === 0) return text;
    let out = text;
    for (const token of keys) {
      const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp(esc, 'g'), map.reverse[token]);
    }
    return out;
  }

  function conversationKey(siteId, convId) {
    return `${siteId}::${convId || 'default'}`;
  }

  SILH.redaction = {
    applyDecisions,
    reverseMap,
    conversationKey,
    loadMap,
    synthesizeFake,
  };
})();
