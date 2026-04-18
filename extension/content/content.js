// SilhouetteAI - content script orchestrator.
// Intercepts submission, runs detection, shows interstitial, applies redaction,
// and reverse-maps tokens in incoming responses.
(function () {
  const SILH = window.__SILH;
  if (!SILH || !SILH.detection || !SILH.adapter || !SILH.interstitial || !SILH.redaction) {
    console.warn('[SilhouetteAI] Required modules missing. Aborting.');
    return;
  }

  const state = {
    enabled: true,
    mode: 'interactive',      // interactive | auto | warn
    defaultAction: 'tokenize', // mask | tokenize | synthesize
    enabledCategories: null,   // null = all
    allowlist: [],
    _inProgress: false,
    _lastSubmitted: null,      // text we've just re-submitted; skip one pass
  };

  async function loadSettings() {
    const { piigSettings = {} } = await chrome.storage.local.get('piigSettings');
    Object.assign(state, {
      enabled: piigSettings.enabled !== false,
      mode: piigSettings.mode || 'interactive',
      defaultAction: piigSettings.defaultAction || 'tokenize',
      enabledCategories: piigSettings.enabledCategories || null,
      allowlist: piigSettings.allowlist || [],
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.piigSettings && changes.piigSettings.newValue) {
      const s = changes.piigSettings.newValue;
      state.enabled = s.enabled !== false;
      state.mode = s.mode || 'interactive';
      state.defaultAction = s.defaultAction || 'tokenize';
      state.enabledCategories = s.enabledCategories || null;
      state.allowlist = s.allowlist || [];
    }
  });

  // ---------- Event interception ----------

  async function handleSubmitAttempt(event) {
    if (!state.enabled || state._inProgress) return;

    const text = SILH.adapter.getPromptText();
    if (!text || text.trim().length < 3) return;

    // If this is our own re-submission, let it through.
    if (state._lastSubmitted !== null && text === state._lastSubmitted) {
      state._lastSubmitted = null;
      return;
    }

    const findings = SILH.detection.detect(text, {
      enabledCategories: state.enabledCategories,
      allowlist: state.allowlist,
    });
    if (findings.length === 0) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    state._inProgress = true;
    try {
      let decisions;

      if (state.mode === 'warn') {
        SILH.interstitial.toast(
          'SilhouetteAI: ' + findings.length + ' item(s) detected. Sent without redaction.'
        );
        await logEvent({ type: 'warn-only', findings: findings.length, decisions: [] });
        state._lastSubmitted = text;
        SILH.adapter.triggerSend();
        return;
      }

      if (state.mode === 'auto') {
        decisions = findings.map((f) => ({ finding: f, action: state.defaultAction }));
      } else {
        const result = await SILH.interstitial.show(text, findings, {
          defaultAction: state.defaultAction,
        });
        if (result.action === 'cancel') {
          await logEvent({ type: 'cancelled', findings: findings.length, decisions: [] });
          return;
        }
        decisions = result.decisions;
      }

      const convKey = SILH.redaction.conversationKey(
        SILH.adapter.id,
        SILH.adapter.getConversationId()
      );
      const redacted = await SILH.redaction.applyDecisions(text, decisions, convKey);

      if (redacted !== text) {
        SILH.adapter.setPromptText(redacted);
        // Give the framework a tick to re-render / enable the send button.
        await new Promise((r) => setTimeout(r, 30));
      }

      state._lastSubmitted = redacted;
      await logEvent({
        type: state.mode === 'auto' ? 'auto-redact' : 'interactive',
        findings: findings.length,
        decisions: decisions.map((d) => d.action),
      });
      SILH.adapter.triggerSend();

      if (state.mode === 'auto') {
        SILH.interstitial.toast('SilhouetteAI redacted ' + findings.length + ' item(s).');
      }
    } catch (err) {
      console.error('[SilhouetteAI] Submit handler failed:', err);
    } finally {
      state._inProgress = false;
    }
  }

  async function logEvent(ev) {
    try {
      const { piigLog = [] } = await chrome.storage.local.get('piigLog');
      piigLog.unshift({ ...ev, ts: Date.now(), site: SILH.adapter.id });
      if (piigLog.length > 100) piigLog.length = 100;
      await chrome.storage.local.set({ piigLog });
    } catch (_) { /* best-effort */ }
  }

  // Capture Enter in the composer (before React handlers).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const composer = SILH.adapter.getComposer();
    if (!composer || !composer.contains(e.target)) return;
    handleSubmitAttempt(e);
  }, true);

  // Capture clicks on the send button.
  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('button') : null;
    if (!btn) return;
    const sendBtn = SILH.adapter.getSendButton();
    if (!sendBtn || sendBtn !== btn) return;
    handleSubmitAttempt(e);
  }, true);

  // ---------- Response reverse-mapping ----------

  // Regex matches tokens that include our salt shape.
  const TOKEN_RE = /\[[A-Z_]+_\d+_[a-f0-9]+\]/;

  async function reverseMapTextNode(node) {
    if (!node || !node.textContent || !TOKEN_RE.test(node.textContent)) return;
    const convKey = SILH.redaction.conversationKey(
      SILH.adapter.id, SILH.adapter.getConversationId()
    );
    const mapped = await SILH.redaction.reverseMap(node.textContent, convKey);
    if (mapped !== node.textContent) node.textContent = mapped;
  }

  function reverseMapSubtree(root) {
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) reverseMapTextNode(n);
    } catch (_) { /* some nodes can't be walked */ }
  }

  const observer = new MutationObserver((mutations) => {
    if (!state.enabled) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) reverseMapSubtree(node);
        else if (node.nodeType === 3) reverseMapTextNode(node);
      }
      if (m.type === 'characterData') reverseMapTextNode(m.target);
    }
  });

  function startObserver() {
    const container = SILH.adapter.responseContainer() || document.body;
    observer.observe(container, { childList: true, subtree: true, characterData: true });
  }

  // ---------- Popup/options RPC ----------

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'piig:getState') {
      sendResponse({
        enabled: state.enabled, mode: state.mode, defaultAction: state.defaultAction,
        enabledCategories: state.enabledCategories, allowlist: state.allowlist,
      });
      return true;
    }
    if (msg.type === 'piig:testDetect') {
      try {
        const findings = SILH.detection.detect(msg.text || '', {
          enabledCategories: state.enabledCategories,
          allowlist: state.allowlist,
        });
        sendResponse({ findings });
      } catch (e) {
        sendResponse({ error: String(e) });
      }
      return true;
    }
  });

  // ---------- Bootstrap ----------

  (async () => {
    await loadSettings();
    startObserver();
    console.log('[SilhouetteAI] Active on', location.hostname, 'mode:', state.mode);
  })();
})();
