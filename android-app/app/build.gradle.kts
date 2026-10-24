import java.util.Properties

plugins {
    id("com.android.application")
}

val signingProperties = Properties().apply {
    val file = rootProject.file("signing.properties")
    if (file.exists()) {
        file.inputStream().use { load(it) }
    }
}

android {
    namespace = "com.tangtang.motionwallpaper"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.tangtang.motionwallpaper"
        minSdk = 28
        targetSdk = 34
        versionCode = 12
        versionName = "0.5.3"
    }

    signingConfigs {
        create("release") {
            val storePath = signingProperties.getProperty("storeFile")
            if (storePath != null) {
                storeFile = rootProject.file(storePath)
                storePassword = signingProperties.getProperty("storePassword")
                keyAlias = signingProperties.getProperty("keyAlias")
                keyPassword = signingProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("release")
                .takeIf { signingProperties.getProperty("storeFile") != null }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}
