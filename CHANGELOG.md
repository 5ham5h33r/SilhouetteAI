# Changelog

## 1.0.0 - 2026-09-16

- Add adapters for Claude, Gemini, Perplexity, and Microsoft Copilot alongside ChatGPT.
- Add a shared editor adapter with native textarea and contenteditable support.
- Fail closed when a site editor cannot be rewritten or submitted.
- Prevent token reverse-mapping from touching active composers.
- Validate IBAN checksums and calendar dates, and reduce bare-number phone false positives.
- Ignore fenced and inline code by default, with an option to scan it.
- Add extension icons, an MIT license, security guidance, manifest validation, and tests.
