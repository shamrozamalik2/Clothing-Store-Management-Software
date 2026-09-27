# Keep MLKit GMS internal implementation classes.
# R8 removes kotlinx.coroutines.JobKt__JobKt (used by MLKit barcode scanner
# initialization), causing NPE in BarcodeScanning.getClient() on release builds.
-keep class com.google.mlkit.** { *; }
-keepclassmembers class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode.** { *; }
-keepclassmembers class com.google.android.gms.internal.mlkit_vision_barcode.** { *; }

# Keep Kotlin coroutines classes used internally by MLKit.
# R8 was removing JobKt__JobKt causing NPE during barcode scanner init.
-keep class kotlinx.coroutines.** { *; }
-keepclassmembers class kotlinx.coroutines.** { *; }

# Keep CameraX lifecycle classes to prevent R8 from breaking ProcessCameraProvider.
-keep class androidx.camera.** { *; }
-keepclassmembers class androidx.camera.** { *; }
