plugins {
    id("com.android.library")
    kotlin("plugin.compose")
    kotlin("plugin.serialization")
}

android {
    namespace = "com.vercel.jsonrender.compose"
    compileSdk {
        version = release(37) { minorApiLevel = 1 }
    }
    defaultConfig {
        minSdk = 23
    }
    sourceSets.getByName("test").resources.srcDir(
        "../../swift/JSONRender/Tests/JSONRenderCoreTests/Fixtures",
    )
    sourceSets.getByName("test").resources.srcDir(
        "../../swift/JSONRender/Sources/JSONRenderStreamingDemo/Resources",
    )
    buildFeatures {
        compose = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    api("androidx.compose.ui:ui:1.10.5")
    api("androidx.compose.runtime:runtime:1.10.5")
    implementation("androidx.compose.foundation:foundation:1.10.5")
    api("org.jetbrains.kotlinx:kotlinx-serialization-json:1.10.0")
    testImplementation(kotlin("test-junit", "2.4.21"))
}
