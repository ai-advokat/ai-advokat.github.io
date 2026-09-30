# Android / Google Play

Recommended packaging: **Trusted Web Activity (TWA)** for `https://ai-advokat.github.io/`.

Google's Android documentation describes TWA as a way for an Android app to launch owned PWA content fullscreen, with ownership verified through Digital Asset Links.

## App identity

- App name: AI Advokat
- Proposed application ID: `mk.aiadvokat.app`
- Start URL: `https://ai-advokat.github.io/`
- Host: `ai-advokat.github.io`
- Display mode: standalone/fullscreen through TWA

## Build path

Use Bubblewrap or Android Studio after the Play signing identity is available.

The final `.well-known/assetlinks.json` MUST be generated from the actual Google Play signing certificate SHA-256 fingerprint. Do not publish the template as if it were verified.

See `twa-manifest.json` and `assetlinks.template.json`.
