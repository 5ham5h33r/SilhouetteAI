// SilhouetteAI - Claude adapter. Selectors verified against claude.ai.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});
  if (location.hostname !== 'claude.ai') return;

  SILH.adapter = SILH.adapterBase.create({
    id: 'claude',
    composer: [
      'div.ProseMirror[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"][aria-label*="prompt" i]',
    ],
    sendButton: [
      'button[data-testid="chat-input-send"]',
      'button[aria-label="Send message"]',
    ],
    responseContainer: ['main'],
    conversationPattern: /\/(?:chat|cowork)\/([a-z0-9_-]+)/i,
  });
})();
