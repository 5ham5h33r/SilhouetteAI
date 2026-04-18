// SilhouetteAI - Layer A (deterministic) detection pass.
// Pure functions. Registers on window.__SILH.detection.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});

  function luhnValid(digits) {
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = digits.charCodeAt(i) - 48;
      if (n < 0 || n > 9) return false;
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  // Each pattern: { type, regex (global), confidence, validate? }
  const patterns = [
    {
      type: 'EMAIL',
      regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      confidence: 0.99,
    },
    {
      type: 'API_KEY',
      regex: /\b(?:sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})\b/g,
      confidence: 0.99,
    },
    {
      type: 'JWT',
      regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      confidence: 0.99,
    },
    {
      type: 'SSN',
      regex: /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
      confidence: 0.97,
    },
    {
      type: 'CREDIT_CARD',
      regex: /\b(?:\d[ -]*?){13,19}\b/g,
      confidence: 0.95,
      validate: (m) => luhnValid(m.replace(/\D/g, '')),
    },
    {
      type: 'PHONE',
      regex: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
      confidence: 0.9,
      validate: (m) => (m.match(/\d/g) || []).length >= 10,
    },
    {
      type: 'IBAN',
      regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g,
      confidence: 0.9,
    },
    {
      type: 'IP_ADDRESS',
      regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
      confidence: 0.85,
    },
    {
      type: 'DOB',
      regex: /\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b|\b(?:0[1-9]|1[0-2])[/\-](?:0[1-9]|[12]\d|3[01])[/\-](?:19|20)\d{2}\b/g,
      confidence: 0.6,
    },
  ];

  // Merge overlapping spans. Prefer higher confidence, then longer span.
  function fuseSpans(spans) {
    if (spans.length <= 1) return spans.slice();
    const sorted = spans.slice().sort((a, b) => a.start - b.start || b.end - a.end);
    const out = [];
    for (const s of sorted) {
      const last = out[out.length - 1];
      if (last && s.start < last.end) {
        const longer = (s.end - s.start) > (last.end - last.start);
        const better =
          s.confidence > last.confidence ||
          (s.confidence === last.confidence && longer);
        if (better) out[out.length - 1] = s;
      } else {
        out.push(s);
      }
    }
    return out;
  }

  function detect(text, options) {
    options = options || {};
    const allow = new Set((options.allowlist || []).map((s) => String(s).toLowerCase()));
    const enabled = options.enabledCategories; // null | Array<string>

    const findings = [];
    for (const p of patterns) {
      if (enabled && !enabled.includes(p.type)) continue;
      p.regex.lastIndex = 0;
      let m;
      while ((m = p.regex.exec(text)) !== null) {
        const matchText = m[0];
        if (p.validate && !p.validate(matchText)) {
          if (m.index === p.regex.lastIndex) p.regex.lastIndex++;
          continue;
        }
        if (allow.has(matchText.toLowerCase())) {
          if (m.index === p.regex.lastIndex) p.regex.lastIndex++;
          continue;
        }
        findings.push({
          type: p.type,
          start: m.index,
          end: m.index + matchText.length,
          text: matchText,
          confidence: p.confidence,
        });
        if (m.index === p.regex.lastIndex) p.regex.lastIndex++;
      }
    }
    return fuseSpans(findings);
  }

  SILH.detection = { detect, fuseSpans, patterns };
})();
