// SilhouetteAI - pre-send interstitial UI.
// Registers window.__SILH.interstitial.{show, toast}.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});

  const LABELS = {
    EMAIL: 'Email',
    PHONE: 'Phone',
    SSN: 'SSN',
    CREDIT_CARD: 'Credit card',
    IP_ADDRESS: 'IP address',
    API_KEY: 'API key',
    JWT: 'JWT',
    IBAN: 'Bank / IBAN',
    DOB: 'Date of birth',
    PERSON: 'Name',
    ORG: 'Organization',
    ADDRESS: 'Address',
  };

  const ACTIONS = [
    ['mask', 'Mask'],
    ['tokenize', 'Tokenize'],
    ['synthesize', 'Synthesize'],
    ['keep', 'Keep original'],
  ];

  // Returns Promise<{action: 'send'|'cancel', decisions: Array}>
  function show(text, findings, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const existing = document.getElementById('silh-interstitial');
      if (existing) existing.remove();

      const root = document.createElement('div');
      root.id = 'silh-interstitial';
      root.className = 'silh-root';
      root.innerHTML = [
        '<div class="silh-backdrop"></div>',
        '<div class="silh-modal" role="dialog" aria-labelledby="silh-title" aria-modal="true">',
        '  <header class="silh-header">',
        '    <div class="silh-brand"><span class="silh-logo" aria-hidden="true"></span><span>SilhouetteAI</span></div>',
        '    <h2 id="silh-title">Review before sending</h2>',
        '    <p class="silh-sub"></p>',
        '  </header>',
        '  <div class="silh-preview-wrap">',
        '    <div class="silh-preview-label">Preview of what will be sent</div>',
        '    <div class="silh-preview" id="silh-preview"></div>',
        '  </div>',
        '  <ul class="silh-list" id="silh-list"></ul>',
        '  <footer class="silh-footer">',
        '    <button type="button" class="silh-btn silh-btn-ghost" id="silh-cancel">Cancel</button>',
        '    <button type="button" class="silh-btn silh-btn-primary" id="silh-send">Send redacted</button>',
        '  </footer>',
        '</div>',
      ].join('');
      document.body.appendChild(root);

      root.querySelector('.silh-sub').textContent =
        findings.length + ' sensitive item' + (findings.length === 1 ? '' : 's') +
        ' detected. Choose what to do with each.';

      const defaultAction = opts.defaultAction || 'tokenize';
      const decisions = findings.map((f) => ({ finding: f, action: defaultAction }));

      const list = root.querySelector('#silh-list');
      findings.forEach((f, i) => {
        const li = document.createElement('li');
        li.className = 'silh-item';

        const left = document.createElement('div');
        left.className = 'silh-item-left';
        const pill = document.createElement('span');
        pill.className = 'silh-pill silh-type-' + f.type;
        pill.textContent = LABELS[f.type] || f.type;
        const code = document.createElement('code');
        code.className = 'silh-text';
        code.textContent = f.text.length > 64 ? f.text.slice(0, 61) + '\u2026' : f.text;
        code.title = f.text;
        left.appendChild(pill);
        left.appendChild(code);

        const select = document.createElement('select');
        select.className = 'silh-select';
        select.dataset.idx = String(i);
        for (const [v, label] of ACTIONS) {
          const o = document.createElement('option');
          o.value = v;
          o.textContent = label;
          if (v === defaultAction) o.selected = true;
          select.appendChild(o);
        }

        li.appendChild(left);
        li.appendChild(select);
        list.appendChild(li);
      });

      function renderPreview() {
        const previewEl = root.querySelector('#silh-preview');
        previewEl.textContent = '';
        const sorted = decisions.slice().sort((a, b) => a.finding.start - b.finding.start);
        let cursor = 0;
        for (const d of sorted) {
          const { finding, action } = d;
          if (cursor < finding.start) {
            previewEl.appendChild(document.createTextNode(text.slice(cursor, finding.start)));
          }
          let rep;
          if (action === 'mask') rep = '\u2588\u2588\u2588\u2588\u2588\u2588';
          else if (action === 'tokenize') rep = '[' + finding.type + ']';
          else if (action === 'synthesize') rep = '\u00abfake\u00bb';
          else rep = finding.text;
          const mark = document.createElement('mark');
          mark.className = 'silh-mark silh-action-' + action;
          mark.textContent = rep;
          previewEl.appendChild(mark);
          cursor = finding.end;
        }
        if (cursor < text.length) {
          previewEl.appendChild(document.createTextNode(text.slice(cursor)));
        }
      }
      renderPreview();

      list.addEventListener('change', (e) => {
        const t = e.target;
        if (t instanceof HTMLSelectElement && t.classList.contains('silh-select')) {
          const idx = Number(t.dataset.idx);
          decisions[idx].action = t.value;
          renderPreview();
        }
      });

      function done(result) {
        root.remove();
        document.removeEventListener('keydown', onKey, true);
        resolve(result);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopImmediatePropagation();
          done({ action: 'cancel', decisions: [] });
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          done({ action: 'send', decisions });
        }
      }
      document.addEventListener('keydown', onKey, true);

      root.querySelector('#silh-cancel').addEventListener('click', () =>
        done({ action: 'cancel', decisions: [] })
      );
      root.querySelector('#silh-send').addEventListener('click', () =>
        done({ action: 'send', decisions })
      );
      root.querySelector('.silh-backdrop').addEventListener('click', () =>
        done({ action: 'cancel', decisions: [] })
      );

      setTimeout(() => root.querySelector('#silh-send').focus(), 30);
    });
  }

  function toast(message, ms) {
    ms = ms || 2500;
    const el = document.createElement('div');
    el.className = 'silh-toast';
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('silh-toast-show'));
    setTimeout(() => {
      el.classList.remove('silh-toast-show');
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  SILH.interstitial = { show, toast };
})();
