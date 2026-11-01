// Canonical privacy runtime bridge.
// The browser-safe implementation in assets/ is the single source of truth for
// both the Cloudflare Worker and the public standalone bot. Keeping this bridge
// browser-compatible also preserves legacy cached clients that still request
// /src/chat-privacy.js.
export {
  detectConfidentialCasePrompt,
  redactConfidentialCasePrompt
} from "../assets/chat-privacy-browser.js";
