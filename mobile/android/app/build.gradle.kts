import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

// Release signing key (android/key.properties, android/app/upload-keystore.jks).
// Both are gitignored — never commit them. Falls back to the debug key only when
// key.properties is missing, so a plain checkout can still `flutter run --release`.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.probusinesscloud.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // flutter_local_notifications' AAR declares this as a hard requirement
        // at build time (checkDebugAarMetadata fails without it) — it's what
        // lets its Java code use newer java.time/stream APIs back to minSdk.
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.probusinesscloud.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
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

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

// NOTE: CameraX 1.2.3 forcing was REMOVED.
// Reason: forcing 1.2.3 allowed camera Preview to bind (gray screen visible)
// but silently broke the ImageAnalysis use-case pipeline — ML Kit never
// received frames, so no barcodes were ever detected.
// mobile_scanner 6.0.11 targets CameraX 1.5.0; its ImageAnalysis API
// requires at least 1.3.0. The actual fix for bindToLifecycle() on this
// device is cameraResolution: Size(640, 480) set in the Dart layer, which
// reduces use-case complexity so CameraX 1.5.0 binds successfully.
