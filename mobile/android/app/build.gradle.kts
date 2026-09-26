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

// NOTE: CameraX 1.2.3 forcing was REMOVED.
// Reason: forcing 1.2.3 allowed camera Preview to bind (gray screen visible)
// but silently broke the ImageAnalysis use-case pipeline — ML Kit never
// received frames, so no barcodes were ever detected.
// mobile_scanner 6.0.11 targets CameraX 1.5.0; its ImageAnalysis API
// requires at least 1.3.0. The actual fix for bindToLifecycle() on this
// device is cameraResolution: Size(640, 480) set in the Dart layer, which
// reduces use-case complexity so CameraX 1.5.0 binds successfully.
