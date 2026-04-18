const $ = (id) => document.getElementById(id);

async function getSettings() {
  const { piigSettings = {} } = await chrome.storage.local.get('piigSettings');
  return piigSettings;
}

async function setSettings(patch) {
  const s = await getSettings();
  await chrome.storage.local.set({ piigSettings: { ...s, ...patch } });
}

async function init() {
  const s = await getSettings();
  $('toggle-enabled').checked = s.enabled !== false;
  $('mode-select').value = s.mode || 'interactive';
  $('action-select').value = s.defaultAction || 'tokenize';
  updateHint(s.enabled !== false);

  $('toggle-enabled').addEventListener('change', async (e) => {
    await setSettings({ enabled: e.target.checked });
    updateHint(e.target.checked);
  });
  $('mode-select').addEventListener('change', (e) => setSettings({ mode: e.target.value }));
  $('action-select').addEventListener('change', (e) => setSettings({ defaultAction: e.target.value }));

  $('options-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('test-btn').addEventListener('click', () =>
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#test') })
  );
}

function updateHint(enabled) {
  $('status-hint').textContent = enabled ? 'Active' : 'Disabled';
  document.body.classList.toggle('is-disabled', !enabled);
}

init();
