# iOS build → TestFlight — one-time account setup + build steps

Everything code-side is ready (bundle id `com.probusinesscloud.app`, version
`1.0.0+1`, background-push plist key already set). What's left needs your
Mac, your Apple Developer account, and your Firebase console — none of
which this Windows machine can touch. Do these in order; each one blocks
the next.

## 1. Firebase: add the iOS app, get GoogleService-Info.plist

The Android app is already wired to a Firebase project (that's what makes
push notifications work there) — add iOS to the *same* project, don't
create a new one.

1. https://console.firebase.google.com → your project → ⚙️ **Project
   settings** → **Add app** → iOS.
2. Bundle ID: `com.probusinesscloud.app` (must match exactly).
3. Download **GoogleService-Info.plist**.
4. Open `ios/Runner.xcworkspace` in Xcode. Drag that file into the
   **Runner** group in the project navigator (not the top-level `ios/`
   folder on disk — into the Xcode group). In the dialog: check **"Copy
   items if needed"** and make sure **Target Membership → Runner** is
   ticked.

Without this file the app builds fine but crashes immediately on launch —
`Firebase.initializeApp()` in `main.dart` throws if it's missing. This is
gitignored on purpose (same as Android's `google-services.json`), so it
has to be added locally on your Mac.

## 2. Apple Developer: create an APNs key

This is what actually lets Firebase deliver push to iOS devices — separate
from the plist above.

1. https://developer.apple.com/account → **Certificates, IDs & Profiles**
   → **Keys** → **+**.
2. Name it anything (e.g. "PBC Push"), check **Apple Push Notifications
   service (APNs)**, Continue, Register.
3. **Download the .p8 file now — Apple only lets you download it once.**
   Note the **Key ID** shown, and your **Team ID** (top right of the
   Apple Developer account page).

## 3. Firebase: upload the APNs key

1. Firebase console → ⚙️ **Project settings** → **Cloud Messaging** tab.
2. Under **Apple app configuration** → **APNs Authentication Key** →
   Upload → pick the `.p8` from step 2, enter its Key ID and your Team ID.

## 4. Xcode: signing + Push Notifications capability

1. Still in `Runner.xcworkspace`: select the **Runner** target →
   **Signing & Capabilities**.
2. Set **Team** to your Apple Developer team. Leave "Automatically manage
   signing" checked — Xcode will register the App ID and provisioning
   profile for `com.probusinesscloud.app` itself on first build.
3. **+ Capability** → **Push Notifications**. This writes the
   `aps-environment` entitlement — it has to happen in Xcode because it
   touches code signing, a plain `.entitlements` file edit isn't enough.
4. `Runner.entitlements` already has an App Groups entry
   (`group.com.probusinesscloud.app`) for the home-screen widget. If you're
   not setting up the widget in this same session, leave it as-is — an
   unused App Group capability is harmless. If you *are* doing the widget
   too, follow `WIDGET_SETUP.md` in this same folder for that target.

## 5. Build and archive

```
flutter pub get
flutter build ipa
```

If that completes, Xcode isn't even needed for the build step — it produces
a signed `.ipa` under `build/ios/ipa/`. If it fails on signing (more likely
on a first-ever build of this project), fall back to Xcode directly:
**Product → Archive** on the `Runner` scheme, then
**Window → Organizer → Distribute App → App Store Connect → Upload**,
accepting automatic signing at each step.

## 6. TestFlight

1. https://appstoreconnect.apple.com → your app (Xcode's upload creates it
   automatically if it doesn't exist yet) → **TestFlight** tab.
2. First upload asks an **export compliance** question — standard HTTPS-only
   apps answer **No** (not using non-standard encryption).
3. Processing takes anywhere from a few minutes to ~an hour on a first
   build. Once it shows under Builds, add yourself (or testers) under
   **Internal Testing** → they get an email + TestFlight app invite.

## If something fails

Bring back the exact error text (from `flutter build ipa` or Xcode's
Organizer) — most first-build failures are signing/provisioning-profile
mismatches tied to one of steps 1–4 above, and the error usually names
which one.
