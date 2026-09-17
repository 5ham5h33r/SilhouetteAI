// SilhouetteAI - ChatGPT site adapter.
// Knows how to read/write the composer, find the send button, and get the conversation id.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});
  if (!/^(chatgpt\.com|chat\.openai\.com)$/.test(location.hostname)) return;

  SILH.adapter = SILH.adapterBase.create({
    id: 'chatgpt',
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
    conversationPattern: /\/c\/([a-z0-9-]+)/i,
  });
})();
