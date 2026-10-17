# iOS home screen widget — one-time Xcode setup

The Android widget builds and runs from this repo as-is. The iOS one needs a
Widget Extension target, which has to be created through Xcode's own target
wizard — that step touches `Runner.xcodeproj/project.pbxproj`, a format
fragile enough that it's safer done by Xcode itself than hand-edited blind
with no Mac to verify it opens afterward. Everything Xcode would otherwise
generate for you is already written and sitting in this repo:

- `ios/TodaySalesWidget/TodaySalesWidget.swift` — the widget itself
  (timeline provider + SwiftUI view).
- `ios/TodaySalesWidget/Info.plist` — the extension's Info.plist.
- `ios/TodaySalesWidget/TodaySalesWidget.entitlements` — its App Group.
- `ios/Runner/Runner.entitlements` — the same App Group for the main app.
- `ios/Runner/Info.plist` already has `UIBackgroundModes` (`fetch`) and
  `BGTaskSchedulerPermittedIdentifiers` (`pbc-widget-refresh`) added, so the
  periodic background refresh job needs no Xcode capability step — that
  part's done.

This needs a Mac with Xcode and your Apple Developer Team ID. None of it
touches the Android build or anything already working.

## 1. Create the Widget Extension target

1. Open `ios/Runner.xcworkspace` in Xcode (not the `.xcodeproj`).
2. **File → New → Target…**, choose **Widget Extension**, Next.
3. Product Name: `TodaySalesWidget` (must match exactly — it's the folder
   name above and the `kind` string in the Swift file).
4. Uncheck "Include Configuration Intent" (this widget has no user-facing
   settings). Uncheck "Include Live Activity" too.
5. Team: your Apple Developer team. Finish.
6. When Xcode asks to "Activate" the new scheme, choose **Cancel** — keep
   building/running the `Runner` scheme as usual; the widget ships inside it.

This leaves you with a new `TodaySalesWidget` group/target containing its own
placeholder `TodaySalesWidget.swift` and `Info.plist` — delete both (and the
`Assets.xcassets` Xcode adds for it, not needed) and instead **drag the four
files above from Finder into that group**, making sure "Copy items if
needed" is unchecked (they should stay at their existing repo paths) and
**Target Membership** is checked for `TodaySalesWidget` only.

## 2. Add the App Group to both targets

1. Select the **Runner** target → **Signing & Capabilities** → **+
   Capability** → **App Groups** → **+** → add
   `group.com.probusinesscloud.app` (the identifier already baked
   into `Runner.entitlements` and the widget's Swift code).
2. Select the **TodaySalesWidget** target → same steps → tick the *same*
   group (don't create a second one — it must be the identical string on
   both targets, or they read from different storage and the widget shows
   nothing).
3. If Xcode generated its own `TodaySalesWidget.entitlements` in step 1,
   replace its contents with the one from this repo (or just confirm the App
   Group checkbox ends up checked in the one shown here).

## 3. Set the deployment target

The app targets iOS 16 (`ios/Podfile`). Set the same on the
`TodaySalesWidget` target: **Build Settings → iOS Deployment Target → 16.0**.
The widget's own code already branches on iOS 17 vs. earlier for the one API
(`containerBackground`) that needs it.

## 4. Build

Build the `Runner` scheme as usual (`flutter build ios`, or Xcode's Run).
The widget extension builds as part of it — there's no separate build step.

## 5. Try it

On a device or simulator: long-press the home screen → **+** → search
"Today's Sales" (or your app's name) → add it. It shows "Open the app to
sign in" until the app has logged in once and pushed real data — open the
app, log in, and the widget should pick up the numbers within a few seconds
to a minute (WidgetKit doesn't guarantee instant redraws).

## What to expect, since this hasn't been run or built yet

This is a complete, from-scratch WidgetKit implementation, written without a
Mac to open Xcode and build it — unlike the Android widget (which did build
and run in this repo). The design follows Apple's documented, standard
pattern (`TimelineProvider`, `WidgetBundle`, App Group `UserDefaults`), but
the usual small Xcode-specific snags — a typo'd bundle identifier, a missing
Signing Team on the new target, Xcode regenerating its own placeholder files
over these during target creation — are the kind of thing that's easiest to
just fix on first build rather than guess blind. If it doesn't build cleanly
first try, the error Xcode shows will almost always point straight at one of
steps 1–3 above.
