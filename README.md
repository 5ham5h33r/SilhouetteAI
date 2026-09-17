# SilhouetteAI

SilhouetteAI is a local-first Chrome extension that catches sensitive data in AI
chat prompts and lets you protect it before sending.

Detection, redaction, token maps, and the activity log stay in the browser. The
extension has no telemetry, remote inference, or network client of its own.

## Supported sites

- ChatGPT (`chatgpt.com`, `chat.openai.com`)
- Claude (`claude.ai`)
- Gemini (`gemini.google.com`)
- Perplexity (`perplexity.ai`)
- Microsoft Copilot (`copilot.microsoft.com`)

The adapters use the live composer and send-control contracts verified for v1.0.0.
If SilhouetteAI captures a submission but cannot safely rewrite or submit it, it
fails closed and leaves the prompt unsent.

## Protection

The deterministic detector recognizes:

- Email addresses
- Phone numbers
- US Social Security numbers
- Credit card numbers with Luhn validation
- API keys and JSON Web Tokens
- IBANs with checksum validation
- IPv4 addresses
- Calendar-valid dates of birth

Interactive mode presents every finding before sending. Each finding can be masked,
replaced with a stable reversible token, replaced with synthetic data, or kept.
Auto-redact applies the configured default action without opening the review dialog.
Warn-only records the finding and sends the original text.

Fenced and inline code are skipped by default to reduce false positives. This is
configurable in Settings.

## Install for development

1. Clone the repository.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked** and select the `extension/` directory.
5. Open a supported AI chat and submit a prompt containing synthetic PII.

Example:

```text
Email me at jane.doe@example.com or call +1 (415) 555-0132.
```

The review dialog should appear before the provider receives the prompt. Press
`Escape` to cancel or `Ctrl`/`Cmd` + `Enter` to send the protected version.

## How it works

1. A provider adapter captures Enter, Send-button clicks, and native form submissions
   in the browser's capture phase.
2. The local detector returns non-overlapping findings after category, allowlist,
   checksum, date, and code-block rules are applied.
3. The selected actions are applied from right to left so source offsets remain valid.
4. The adapter writes the protected text back through the site's native editor events.
5. A salted per-conversation token map restores tokenized values only in rendered
   response text. Active composers are explicitly excluded.

Audit records contain only the timestamp, provider, finding count, and actions. They
never contain prompt text or detected values.

## Development

SilhouetteAI uses vanilla JavaScript and Manifest V3. It has no runtime dependencies
or build step. Node.js 20 or newer is used only for validation and tests.

```bash
npm test
npm run check
```

`npm run check` verifies every manifest asset and then runs the detector and redaction
test suites. Regenerate the committed PNG icon sizes with:

```powershell
.\scripts\generate-icons.ps1
```

Create a versioned ZIP with `npm run package`. The archive is written to `dist/`
with `manifest.json` at its root.

## Security boundary

SilhouetteAI v1 inspects DOM submission events. Browser extensions cannot promise
protection against every provider UI change: if a provider replaces its composer or
submission mechanism, update the matching adapter before relying on it. Test with
synthetic data after browser or provider updates.

The v1 detector is deterministic. It does not claim to identify free-form names,
organizations, or street addresses. An on-device NER model is intentionally deferred
until its model provenance, package size, latency, and false-positive behavior can be
evaluated without weakening the no-network guarantee.

See [SECURITY.md](SECURITY.md) for responsible reporting.

## License

MIT
