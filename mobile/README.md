# AI Advokat App Distribution v1

This layer turns the AI Advokat web portal into an installable cross-device application and prepares native store distribution.

## Distribution targets

1. **PWA** — installable on Android, Windows, macOS, ChromeOS and supported browsers.
2. **Google Play** — Android Trusted Web Activity packaging is prepared under `mobile/android/`.
3. **Apple App Store** — iOS SwiftUI/WKWebView wrapper source is prepared under `mobile/ios/`.

## Legal-data safety

The service worker deliberately does **not** cache `/api/*`. Legal text, current-version status and AI answers always require a live request. Offline mode shows a fail-closed notice instead of stale law.

## Store publication gates

Actual Play Store/App Store publication cannot be completed from source control alone. It requires:
- the owner's Google Play Console developer account;
- the owner's Apple Developer/App Store Connect account;
- signing keys/certificates controlled by the owner;
- final store screenshots, privacy declarations and review metadata;
- Android Digital Asset Links generated from the final Play signing certificate;
- Apple review testing on a signed build.

No signing secret belongs in GitHub.
