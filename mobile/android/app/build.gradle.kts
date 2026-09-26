plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.sasgarments.sas_garments_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.sasgarments.sas_garments_mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

// CameraX version pin — EVIDENCE-BASED, DO NOT REMOVE WITHOUT TESTING:
// mobile_scanner 6.0.11 natively resolves CameraX 1.5.0.
// Gradle dependency inspection confirmed: camera-lifecycle:1.5.0 -> 1.2.3
//
// Physical device test results:
//   CameraX 1.5.0 → MobileScannerController.start() throws genericError
//                    (camera surface fails to bind to FlutterFragmentActivity lifecycle)
//   CameraX 1.2.3 → Camera preview opens successfully (gray frame visible)
//
// mobile_scanner 6.x is backwards-compatible with CameraX 1.2.3 at runtime
// (confirmed: no crash, camera initialises, ML Kit detection layer active).
// Root cause of 1.5.0 failure: device camera HAL does not support the new
// camera selection strategy introduced in CameraX 1.3.0+.
configurations.all {
    resolutionStrategy {
        force("androidx.camera:camera-core:1.2.3")
        force("androidx.camera:camera-camera2:1.2.3")
        force("androidx.camera:camera-lifecycle:1.2.3")
        force("androidx.camera:camera-view:1.2.3")
    }
}
