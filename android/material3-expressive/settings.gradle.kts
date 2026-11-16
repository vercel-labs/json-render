pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "json-render-material3-expressive"

val composeBuild = file(providers.gradleProperty("jsonRenderAndroidDir").getOrElse(".."))
check(composeBuild.resolve("compose/build.gradle.kts").isFile) {
    "Set -PjsonRenderAndroidDir to the Android renderer project's android directory."
}
includeBuild(composeBuild) {
    dependencySubstitution {
        substitute(module("com.vercel.jsonrender:compose")).using(project(":compose"))
    }
}
