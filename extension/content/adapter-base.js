// SilhouetteAI - shared DOM adapter utilities for supported AI chat sites.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});

  function findOne(selectors) {
    let fallback = null;
    for (const selector of selectors || []) {
      const elements = Array.from(document.querySelectorAll(selector));
      const visible = elements.find((element) =>
        element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true'
      );
      if (visible) return visible;
      fallback = fallback || elements[0] || null;
    }
    return fallback;
  }

  function readEditor(element) {
    if (!element) return '';
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return element.value;
    }
    return (element.innerText || element.textContent || '').replace(/\u00a0/g, ' ');
  }

  function writeEditor(element, text) {
    if (!element) return false;

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (!setter) return false;
      setter.call(element, text);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return element.value === text;
    }

    element.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);

    const inserted = document.execCommand?.('insertText', false, text);
    if (!inserted || readEditor(element) !== text) {
      element.textContent = text;
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: text,
      }));
    }
    return readEditor(element) === text;
  }

  function create(config) {
    const getComposer = () => findOne(config.composer);
    const getSendButton = () => findOne(config.sendButton);

    return {
      id: config.id,
      getComposer,
      getSendButton,
      getPromptText: () => readEditor(getComposer()),
      setPromptText: (text) => writeEditor(getComposer(), text),
      responseContainer: () => findOne(config.responseContainer) || document.querySelector('main'),
      getConversationId: () => {
        const match = location.pathname.match(config.conversationPattern);
        return match?.[1] || 'new';
      },
      triggerSend: () => {
        const button = getSendButton();
        if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') {
          button.click();
          return true;
        }

        const composer = getComposer();
        if (!composer) return false;
        composer.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        }));
        return true;
      },
    };
  }

  SILH.adapterBase = { create, findOne, readEditor, writeEditor };
})();
