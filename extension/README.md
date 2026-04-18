# SilhouetteAI — Phase 1 MVP

Browser extension that intercepts prompts to AI chat tools (currently ChatGPT), detects personally identifiable information locally, and redacts it before the prompt is sent.

This is the Phase 1 MVP from [../PLAN.md](../PLAN.md): **regex-based Layer A detection, interactive interstitial, tokenization with reverse-mapping, ChatGPT adapter only.** The on-device NER model (Layer B) is not included yet — the architecture is wired so it can be dropped into an offscreen document later without touching the content scripts.

## Features in this build

- Intercepts `Enter` keydown and Send-button clicks in ChatGPT.
- Detects: **email, phone, SSN, credit card (Luhn-validated), API keys, JWT, IBAN, IP address, DOB**.
- Interstitial UI with live preview and per-finding **Mask / Tokenize / Synthesize / Keep** actions.
- Per-conversation token map with **reverse-mapping**: tokens like `[PERSON_1_a7f3]` in responses are rewritten back to the real values *in the DOM only*. The provider never sees the mapping.
- Three modes: **Interactive** (default), **Auto-redact**, **Warn only**.
- Options page: category toggles, allowlist, activity log, test panel, data reset.
- All data stays on-device. No network requests originate from the extension itself.

## Install (unpacked, for local testing)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**, select this `extension/` folder.
4. Visit <https://chatgpt.com>.
5. Type a prompt containing PII, e.g.:

   > My email is jane.doe@example.com, my card is 4111 1111 1111 1111, and my phone is +1 (555) 123-4567.

6. Press `Enter`. The interstitial should appear. Choose actions and click **Send redacted**.

Keyboard shortcuts in the interstitial: **Esc** cancels, **Ctrl/Cmd+Enter** sends.

## Repository layout

```
extension/
├── manifest.json
├── background/
│   └── service-worker.js         # install handler, RPC stub
├── content/
│   ├── detection.js              # Layer A regex pack + fusion (pure)
│   ├── redaction.js              # token map + apply/reverse
│   ├── interstitial.js           # modal UI + toasts
│   ├── interstitial.css
│   ├── adapter-chatgpt.js        # site-specific DOM glue
│   └── content.js                # orchestrator
├── popup/                        # toolbar popup (enable/mode/action)
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── options/                      # full settings + test + log
    ├── options.html
    ├── options.js
    └── options.css
```

## How a submission flows

1. User presses `Enter` or clicks Send.
2. `content.js` captures the event in the capture phase.
3. `detection.detect()` runs the regex pack + Luhn + fusion.
4. If findings exist, the event is cancelled and the interstitial opens (or in auto mode, runs headlessly).
5. User decisions are applied right-to-left so span offsets stay valid.
6. `adapter.setPromptText()` writes the redacted prompt back into the composer (via execCommand on ProseMirror, or the native value setter on a textarea).
7. `adapter.triggerSend()` clicks Send; our `_lastSubmitted` flag bypasses the handler on the echo.
8. A `MutationObserver` on the response container rewrites any tokens back to originals as they stream in.

## Known MVP limitations

- **ChatGPT only.** Adapter pattern is in place for Claude/Gemini/Perplexity/Copilot; they just need their own `adapter-*.js` files.
- **Regex only** — no ML NER yet. Free-form names, addresses, and organizations are **not** caught. The plan's Layer B integration point is the background service worker's offscreen document.
- **DOM interception only.** No page-world `fetch` shim yet. If ChatGPT changes its DOM and our adapter misses the send event, the original prompt could go through. This is fixable by adding `content/page-world.js` and a `web_accessible_resources` entry; see PLAN §3.2.
- **No icons bundled.** Chrome shows the default puzzle-piece. Add PNGs (16/48/128) and reference them via an `icons` field in `manifest.json` before publishing.
- **Short prompts** can false-positive on PHONE (any 10-digit number). Adjust the category toggle or allowlist as needed.
- **ProseMirror re-insert** uses `document.execCommand('insertText')`. It's deprecated but still works in ChatGPT. If OpenAI changes the editor, this may need the ProseMirror API directly.

## What to test

- Happy path: email detection, interstitial, tokenize, send.
- Reverse-map: ask a follow-up and verify the LLM's echo of `[EMAIL_1_xxxx]` is rewritten back to the real address in the rendered text (but stays a token if you copy the raw network body).
- Category disable: turn off `CREDIT_CARD` in options and verify no card detection fires.
- Allowlist: add your own email, verify it stops being flagged.
- Mode switches: set mode to `auto`, verify no interstitial appears, toast shows count.
- Cancel path: click Cancel in the interstitial, the original prompt stays in the composer and nothing is sent.
- Data reset: click **Reset everything**, extension should behave like a fresh install.

## Next slices (Phase 1 → Phase 2)

In roughly this order:

1. Page-world `fetch`/`XMLHttpRequest`/`WebSocket.send` shim to make interception robust against adapter breakage.
2. Adapters for Claude, Gemini, Perplexity, Copilot Chat. Extract the two-layer interception into a base class.
3. Offscreen document with `onnxruntime-web` running a distilled multilingual NER model (PERSON / ORG / ADDRESS). Wire RPC from content → background → offscreen.
4. Firefox port (manifest v3 + offscreen equivalent).
5. Code-block awareness: skip detection inside fenced code by default, toggleable per category.
6. Live highlighting as the user types, debounced.

## Development notes

- Vanilla JS, no build step, no dependencies. All modules are IIFEs that register on `window.__SILH`.
- Content scripts share the isolated-world `window`, so registration order in `manifest.json` matters (`detection.js` → `redaction.js` → `interstitial.js` → `adapter-chatgpt.js` → `content.js`).
- Storage keys:
  - `piigSettings` — user preferences
  - `piigLog` — audit log (last 100 events)
  - `tokmap:<site>::<conversationId>` — per-conversation token maps
  - `__silh_salt` — per-install salt used in token names

## Privacy posture

- No outbound network calls.
- No telemetry.
- Logs never include prompt contents — only timestamps, site id, finding count, and chosen actions.
- Permissions requested: `storage`, plus host permissions for `chatgpt.com` and `chat.openai.com` only.
