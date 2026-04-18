// SilhouetteAI - ChatGPT site adapter.
// Knows how to read/write the composer, find the send button, and get the conversation id.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});

  const SELECTORS = {
    composer: [
      '#prompt-textarea',
      'div.ProseMirror[contenteditable="true"]',
      'textarea[data-id="root"]',
      'main textarea',
    ],
    sendButton: [
      'button[data-testid="send-button"]',
      'button[data-testid="fruitjuice-send-button"]',
      'button[aria-label*="Send" i]:not([aria-label*="stop" i])',
      'form button[type="submit"]',
    ],
    responseContainer: [
      'main',
      'div[role="presentation"]',
    ],
  };

  function findOne(list) {
    for (const sel of list) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getComposer() { return findOne(SELECTORS.composer); }
  function getSendButton() { return findOne(SELECTORS.sendButton); }
  function responseContainer() { return findOne(SELECTORS.responseContainer); }

  function getPromptText() {
    const el = getComposer();
    if (!el) return '';
    if (el.tagName === 'TEXTAREA') return el.value;
    return (el.innerText || el.textContent || '').replace(/\u00a0/g, ' ');
  }

  function setPromptText(text) {
    const el = getComposer();
    if (!el) return false;

    if (el.tagName === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // contenteditable / ProseMirror
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);

    // execCommand is deprecated but ProseMirror (ChatGPT) honors it and emits the
    // proper beforeinput/input events React expects. If it fails, fall back to
    // direct DOM replacement + input dispatch.
    const ok = document.execCommand && document.execCommand('insertText', false, text);
    if (!ok) {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
    return true;
  }

  function triggerSend() {
    const btn = getSendButton();
    if (btn && !btn.disabled) { btn.click(); return true; }
    const el = getComposer();
    if (!el) return false;
    const ev = new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true,
    });
    el.dispatchEvent(ev);
    return true;
  }

  function getConversationId() {
    const m = location.pathname.match(/\/c\/([a-z0-9-]+)/i);
    return m ? m[1] : 'new';
  }

  SILH.adapter = {
    id: 'chatgpt',
    getComposer,
    getSendButton,
    responseContainer,
    getPromptText,
    setPromptText,
    triggerSend,
    getConversationId,
  };
})();
