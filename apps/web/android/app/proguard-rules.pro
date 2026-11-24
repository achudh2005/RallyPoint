# ProGuard / R8 Configuration for RallyPoint

# Keep Capacitor Core & Plugins
-keep public class * extends com.getcapacitor.Plugin
-keep public class com.getcapacitor.** { *; }

# Keep JavaScript Interface Methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AndroidX Core Splashscreen
-keep class androidx.core.splashscreen.** { *; }

# Keep WebKit classes
-keep class android.webkit.** { *; }
-keepattributes JavascriptInterface

# Preserve line numbers and file names for crash analytics
-keepattributes SourceFile,LineNumberTable
