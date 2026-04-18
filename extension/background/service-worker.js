// SilhouetteAI - background service worker.
// Thin for Phase 1: seeds defaults and opens the welcome page on install.
// Becomes the home for the offscreen document + ML model RPC in later phases.

const DEFAULTS = {
  enabled: true,
  mode: 'interactive',
  defaultAction: 'tokenize',
  enabledCategories: null,
  allowlist: [],
};

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    const { piigSettings } = await chrome.storage.local.get('piigSettings');
    if (!piigSettings) {
      await chrome.storage.local.set({ piigSettings: DEFAULTS });
    }
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('options/options.html#welcome'),
      });
    } catch (_) { /* ignore */ }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'piig:openOptions') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }
});
