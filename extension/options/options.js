const $ = (id) => document.getElementById(id);

const CATEGORIES = [
  ['EMAIL', 'Email address'],
  ['PHONE', 'Phone number'],
  ['SSN', 'Social security number'],
  ['CREDIT_CARD', 'Credit card'],
  ['IP_ADDRESS', 'IP address'],
  ['API_KEY', 'API key / secret'],
  ['JWT', 'JSON Web Token'],
  ['IBAN', 'Bank / IBAN'],
  ['DOB', 'Date of birth'],
];

async function getSettings() {
  const { piigSettings = {} } = await chrome.storage.local.get('piigSettings');
  return {
    enabled: piigSettings.enabled !== false,
    mode: piigSettings.mode || 'interactive',
    defaultAction: piigSettings.defaultAction || 'tokenize',
    enabledCategories: piigSettings.enabledCategories || null,
    allowlist: piigSettings.allowlist || [],
  };
}

async function saveSettings(patch) {
  const { piigSettings = {} } = await chrome.storage.local.get('piigSettings');
  await chrome.storage.local.set({ piigSettings: { ...piigSettings, ...patch } });
}

function renderCategories(enabledCategories) {
  const wrap = $('cats');
  wrap.innerHTML = '';
  const enabled = enabledCategories || CATEGORIES.map((c) => c[0]);
  for (const [id, label] of CATEGORIES) {
    const row = document.createElement('label');
    row.className = 'cat';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = id;
    cb.checked = enabled.includes(id);
    cb.addEventListener('change', async () => {
      const all = Array.from(wrap.querySelectorAll('input'))
        .filter((x) => x.checked)
        .map((x) => x.value);
      await saveSettings({
        enabledCategories: all.length === CATEGORIES.length ? null : all,
      });
    });
    const span = document.createElement('span');
    span.textContent = label;
    row.appendChild(cb);
    row.appendChild(span);
    wrap.appendChild(row);
  }
}

async function renderLog() {
  const { piigLog = [] } = await chrome.storage.local.get('piigLog');
  const el = $('log');
  if (piigLog.length === 0) {
    el.innerHTML = '<div class="empty">No activity yet.</div>';
    return;
  }
  el.innerHTML = '';
  for (const ev of piigLog) {
    const row = document.createElement('div');
    row.className = 'log-row';
    const d = new Date(ev.ts);
    const time = document.createElement('span'); time.className = 'log-time'; time.textContent = d.toLocaleString();
    const site = document.createElement('span'); site.className = 'log-site'; site.textContent = ev.site || '';
    const typeEl = document.createElement('span'); typeEl.className = 'log-type'; typeEl.textContent = ev.type || '';
    const count = document.createElement('span'); count.className = 'log-count';
    count.textContent = ev.findings + ' finding' + (ev.findings === 1 ? '' : 's');
    const actions = document.createElement('span'); actions.className = 'log-actions';
    actions.textContent = (ev.decisions || []).join(', ') || '-';
    row.append(time, site, typeEl, count, actions);
    el.appendChild(row);
  }
}

function renderTest() {
  const input = $('test-input');
  const output = $('test-output');
  function run() {
    output.innerHTML = '';
    if (!window.__SILH || !window.__SILH.detection) {
      output.innerHTML = '<div class="empty">Detection module failed to load.</div>';
      return;
    }
    const findings = window.__SILH.detection.detect(input.value, {});
    if (!findings.length) {
      output.innerHTML = '<div class="empty">No detections.</div>';
      return;
    }
    for (const f of findings) {
      const row = document.createElement('div');
      row.className = 'test-row';
      const pill = document.createElement('span');
      pill.className = 'pill pill-' + f.type;
      pill.textContent = f.type;
      const code = document.createElement('code');
      code.textContent = f.text;
      const conf = document.createElement('span');
      conf.className = 'conf';
      conf.textContent = Math.round(f.confidence * 100) + '%';
      row.append(pill, code, conf);
      output.appendChild(row);
    }
  }
  input.addEventListener('input', run);
  if (location.hash === '#test') { input.focus(); }
}

async function init() {
  const s = await getSettings();
  $('enabled').checked = s.enabled;
  $('mode').value = s.mode;
  $('defaultAction').value = s.defaultAction;
  $('allowlist').value = (s.allowlist || []).join('\n');
  renderCategories(s.enabledCategories);

  $('enabled').addEventListener('change', (e) => saveSettings({ enabled: e.target.checked }));
  $('mode').addEventListener('change', (e) => saveSettings({ mode: e.target.value }));
  $('defaultAction').addEventListener('change', (e) => saveSettings({ defaultAction: e.target.value }));
  $('allowlist').addEventListener('input', (e) => {
    const list = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
    saveSettings({ allowlist: list });
  });

  $('clear-log').addEventListener('click', async () => {
    await chrome.storage.local.set({ piigLog: [] });
    renderLog();
  });

  $('clear-maps').addEventListener('click', async () => {
    if (!confirm('Remove all per-conversation token maps? Responses will no longer auto-un-redact.')) return;
    const all = await chrome.storage.local.get(null);
    const toRemove = Object.keys(all).filter((k) => k.startsWith('tokmap:'));
    if (toRemove.length) await chrome.storage.local.remove(toRemove);
    alert('Removed ' + toRemove.length + ' token map(s).');
  });

  $('clear-all').addEventListener('click', async () => {
    if (!confirm('Reset ALL SilhouetteAI data (settings, logs, token maps)? This cannot be undone.')) return;
    await chrome.storage.local.clear();
    location.reload();
  });

  renderLog();
  renderTest();

  if (location.hash === '#welcome') {
    $('welcome-section').classList.remove('hidden');
    $('dismiss-welcome').addEventListener('click', () => {
      $('welcome-section').classList.add('hidden');
      history.replaceState(null, '', location.pathname);
    });
  }
}

init();
