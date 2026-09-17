// SilhouetteAI - Gemini adapter. Selectors verified against gemini.google.com.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});
  if (location.hostname !== 'gemini.google.com') return;

  SILH.adapter = SILH.adapterBase.create({
    id: 'gemini',
    composer: [
      '[contenteditable="true"][aria-label="Enter a prompt for Gemini"]',
      'rich-textarea .ql-editor[contenteditable="true"]',
    ],
    sendButton: [
      'button[aria-label="Send message"]',
      'button.send-button',
    ],
    responseContainer: ['main', 'chat-window'],
    conversationPattern: /\/app\/([a-z0-9]+)/i,
  });
})();
