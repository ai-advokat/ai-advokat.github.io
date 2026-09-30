# AI Advokat Store Readiness

## Google Play
- PWA manifest: implemented
- Service worker: implemented, fail-closed for legal APIs
- App identity: proposed `mk.aiadvokat.app`
- TWA config: prepared
- Digital Asset Links: template only; requires final Play signing SHA-256
- Store signing/upload: owner credentials required

## Apple App Store
- Native SwiftUI/WKWebView wrapper source: prepared
- Native toolbar/share/offline affordances: prepared
- Bundle ID: proposed `mk.aiadvokat.app`
- Final Xcode signing: owner Apple Developer Team required
- TestFlight/App Review: owner App Store Connect access required

## Desktop / laptop / PC
The PWA can be installed in compatible desktop browsers and launches in standalone mode. Windows/macOS/ChromeOS users can pin it as an app without waiting for the mobile-store release.

## Do not cache law
No store build or PWA release may introduce offline caching of `/api/articles`, `/api/assistant`, legal-version metadata, or other current-law responses unless a future signed versioning protocol explicitly proves freshness.
