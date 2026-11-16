plugins {
    id("com.android.library") version "8.13.2"
    kotlin("android") version "2.3.21"
    kotlin("plugin.compose") version "2.3.21"
}

group = "com.vercel.jsonrender"

android {
    namespace = "com.vercel.jsonrender.material3"
    compileSdk = 36

    defaultConfig {
        minSdk = 23
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    api("com.vercel.jsonrender:compose")
    api("androidx.compose.material3:material3:1.5.0-alpha18")
    implementation("androidx.compose.foundation:foundation:1.11.0-beta02")
    implementation("androidx.compose.material:material-icons-core:1.7.8")
    implementation("io.coil-kt.coil3:coil-compose:3.5.0")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.5.0")
    testImplementation(kotlin("test-junit"))
}
