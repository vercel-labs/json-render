plugins {
    id("com.android.library") version "9.5.1"
    kotlin("plugin.compose") version "2.4.21"
}

group = "com.vercel.jsonrender"

android {
    namespace = "com.vercel.jsonrender.material3"
    compileSdk {
        version = release(37) { minorApiLevel = 1 }
    }

    defaultConfig {
        minSdk = 24
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    api("com.vercel.jsonrender:compose")
    api("androidx.compose.material3:material3:1.5.0-rc01")
    implementation("androidx.compose.foundation:foundation:1.13.0-rc01")
    implementation("androidx.compose.material:material-icons-core:1.7.8")
    implementation("io.coil-kt.coil3:coil-compose:3.6.3")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.6.3")
    testImplementation(kotlin("test-junit", "2.4.21"))
}
