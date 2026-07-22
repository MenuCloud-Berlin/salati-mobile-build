# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# llama.rn (native On-Device-KI, siehe src/features/ki) — von der README
# empfohlene Regel, verhindert dass R8 die JNI-Bridge-Klassen wegoptimiert.
# HINWEIS: diese Datei wird von `npx expo prebuild` beim naechsten Clean-
# Regenerate ueberschrieben — nach jedem Prebuild pruefen/neu einfuegen.
-keep class com.rnllama.** { *; }

# Add any project specific keep options here:
