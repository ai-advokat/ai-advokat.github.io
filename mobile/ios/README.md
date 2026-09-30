# iOS / Apple App Store

The iOS wrapper is intentionally more than a passive website shell. Apple App Review guideline 4.2 requires an app to provide utility beyond a repackaged website.

The source in this folder defines a SwiftUI app with:
- WKWebView for the owned AI Advokat experience;
- native Home / Laws / AI navigation;
- native reload and Share controls;
- visible offline state;
- external links handed to the system browser;
- no tracking SDK embedded in the native wrapper.

## App identity

- App name: AI Advokat
- Proposed bundle ID: `mk.aiadvokat.app`
- Minimum target recommendation: iOS 17+
- Primary URL: `https://ai-advokat.github.io/`

## Remaining owner-controlled steps

Create/sign the Xcode project in the owner's Apple Developer Team, add the supplied Swift files, generate final AppIcon PNG assets from `/assets/app-icon.svg`, test on-device, complete App Privacy metadata, then submit through App Store Connect/TestFlight.

No Apple certificate or private signing key should be committed to GitHub.
