// SilhouetteAI - Perplexity adapter. Selectors verified against perplexity.ai.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});
  if (!/(^|\.)perplexity\.ai$/.test(location.hostname)) return;

  SILH.adapter = SILH.adapterBase.create({
    id: 'perplexity',
    composer: [
      '#ask-input[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
    ],
    sendButton: [
      'button[aria-label="Submit"]',
      'button[type="submit"]',
    ],
    responseContainer: ['main', '[data-testid="answer"]'],
    conversationPattern: /\/(?:search|page)\/[^/]*-([a-z0-9]+)$/i,
  });
})();
