// SilhouetteAI - Microsoft Copilot adapter. Selectors verified against copilot.microsoft.com.
(function () {
  const SILH = (window.__SILH = window.__SILH || {});
  if (location.hostname !== 'copilot.microsoft.com') return;

  SILH.adapter = SILH.adapterBase.create({
    id: 'copilot',
    composer: [
      'textarea#userInput',
      'textarea[placeholder="Message Copilot"]',
    ],
    sendButton: [
      'button[data-testid="submit-button"]',
      'button[aria-label="Submit message"]',
    ],
    responseContainer: ['main', '#app'],
    conversationPattern: /\/(?:chats?|conversation)\/([a-z0-9-]+)/i,
  });
})();
