# SAS Garments Mobile App

Flutter mobile app for SAS Garments Management System. Connects to the existing Express/PostgreSQL backend — no duplicate backend.

## Architecture

```
mobile/
├── lib/
│   ├── core/
│   │   ├── api/            # Dio client + interceptors
│   │   ├── constants/      # App constants, storage keys
│   │   ├── errors/         # Exception types
│   │   ├── models/         # Shared models (ApiResponse, Pagination)
│   │   ├── router/         # go_router setup
│   │   ├── services/       # FCM, Bluetooth printer, offline sync
│   │   ├── storage/        # Hive + SecureStorage
│   │   ├── theme/          # Light/dark Material 3 themes
│   │   ├── utils/          # Currency/date formatters
│   │   └── widgets/        # Shared UI components
│   └── features/
│       ├── auth/           # Login, splash, JWT handling
│       ├── dashboard/      # Stats, charts, quick actions
│       ├── pos/            # Full POS with barcode, cart, checkout
│       ├── products/       # Product list, search, categories
│       ├── customers/      # Customer CRM, ledger
│       ├── sales/          # Sales history
│       ├── reports/        # Charts, summaries
│       ├── settings/       # Theme, printer, profile, logout
│       └── shell/          # Bottom nav / side rail
```

## Setup

### 1. Flutter
```bash
cd mobile
flutter pub get
```

### 2. Firebase
- Create a Firebase project
- Enable Cloud Messaging
- Download `google-services.json` → `android/app/`
- Download `GoogleService-Info.plist` → `ios/Runner/`

### 3. Android permissions
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.USE_BIOMETRIC"/>
<uses-permission android:name="android.permission.USE_FINGERPRINT"/>
```

### 4. iOS permissions
Add to `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Used for barcode and QR scanning</string>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Used to connect to Bluetooth receipt printers</string>
<key>NSFaceIDUsageDescription</key>
<string>Used for biometric login</string>
```

### 5. Run
```bash
flutter run
```

## API Configuration

The app connects to:
```
https://clothing-store-management-software.onrender.com/api
```

To use a custom server, change it in Settings → API URL.

## Features

| Feature | Status |
|---|---|
| JWT Login + Refresh | ✅ |
| Biometric / PIN | ✅ |
| Dashboard + Charts | ✅ |
| Full POS | ✅ |
| Barcode / QR Scanner | ✅ |
| Bluetooth Printing | ✅ |
| Offline Mode (Hive) | ✅ |
| Auto-sync on reconnect | ✅ |
| FCM Push Notifications | ✅ |
| Products | ✅ |
| Customers | ✅ |
| Sales History | ✅ |
| Reports + Charts | ✅ |
| Settings | ✅ |
| Dark Mode | ✅ |
| Tablet Layout | ✅ |

## Build

```bash
# Android APK
flutter build apk --release

# Android App Bundle (Play Store)
flutter build appbundle --release

# iOS
flutter build ipa --release
```
