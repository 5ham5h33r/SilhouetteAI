# SilhouetteAI

**SilhouetteAI** is a privacy-preserving browser extension that intercepts prompts destined for LLM chat interfaces (ChatGPT, Claude, Gemini, Perplexity, Copilot, etc.), detects personally identifiable information (PII) using an on-device model, and redacts, masks, or pseudonymizes it before the prompt leaves the user's machine.

---

## 🛡️ Key Features

- **Prevent Accidental Data Leakage:** Detects and obscures sensitive data (PII) before submission to third-party LLMs.
- **100% Local Inference:** All PII detection runs entirely on-device. Prompt contents never leave your machine for analysis.
- **Reversible Tokenization:** The extension substitutes sensitive data with localized tokens (e.g. `[PERSON_1]`). When the LLM responds, tokens are seamlessly translated back into the original text exclusively in the rendered DOM.
- **Non-Disruptive Pre-flight Review:** Overlays a lightweight pre-send interstitial, allowing you to optionally Mask, Edit, or Keep flagged PII without slowing down your workflow.
- **Multi-Site Support:** Designed to work across major LLM platforms via a pluggable site adapter system.

## ⚙️ How It Works

SilhouetteAI employs a robust multi-layered detection pipeline:
1. **Layer A (Deterministic Regex & Dictionaries):** Captures structured data like emails, phone numbers, credit card numbers, and SSNs.
2. **Layer B (On-device NER Model):** Transformer-based token classification (running via WASM + SIMD) detects unstructured entities such as people, organizations, locations, and dates.
3. **Layer C (Fusion & Resolution):** Resolves overlapping predictions, applies confidence thresholds, and handles custom allowlists/denylists.

## 🛠️ Architecture Overview

- **Content Scripts (Site Adapters):** Intercept prompt submissions at both the DOM and network (`fetch`/`XMLHttpRequest`) layers.
- **Background Service Worker:** Orchestrates the offscreen detection engine to ensure background performance constraints.
- **Detection Engine:** Harnesses `onnxruntime-web` to execute the local NER model entirely within the browser.
- **Storage:** Employs secure, local IndexedDB and `chrome.storage.local` to manage per-conversation mappings and settings.

## 🚀 Roadmap

- **Phase 0 - Prototyping:** Threat modeling, baseline capability testing, and throwaway proof of concept.
- **Phase 1 - MVP:** Core ChatGPT adapter, Layer A + Layer B pipelines, standard interactive mode, and token map features.
- **Phase 2 - Breadth & Polish:** Support for Claude, Gemini, Copilot. Auto-redacting mode, multilingual support, and Firefox compatibility.
- **Phase 3 - Accuracy & Robustness:** Introduce zero-shot models, improve code-aware detection, multi-turn contexts.
- **Phase 4 - Enterprise Tier:** Implement policy profiles, audit logs, and SSO features tailored for organizational oversight.

---

*This project is currently in the active planning and early prototyping phase.*
