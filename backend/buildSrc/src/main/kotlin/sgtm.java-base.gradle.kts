// Convenciones comunes a todo modulo Java del backend.
// Aqui no se declara ninguna dependencia de framework: eso decide cada capa.

import org.gradle.api.artifacts.VersionCatalogsExtension

plugins {
    `java-library`
}

group = "pe.gob.sgtm"
version = "0.1.0-SNAPSHOT"

// ADR-0001 fija Java 25. La propiedad permite construir en un entorno que
// todavia no lo tiene; CI usa siempre el valor por omision de gradle.properties.
val versionDeJava = providers.gradleProperty("sgtm.java.version").getOrElse("25").toInt()

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(versionDeJava))
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf("-Xlint:all", "-parameters"))
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = false
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}

// ---------------------------------------------------------------------------
// Tomcat por encima de lo que el BOM trae — correccion TEMPORAL (#744).
//
// ## Por que esto NO contradice la primera linea de este archivo
//
// Una restriccion no es una dependencia: no pone nada en el classpath de nadie.
// Solo dice «si algo trae tomcat-embed-core, que sea al menos esta version». Un
// modulo que no lo traiga —el dominio, por ejemplo— no gana nada por esto.
//
// ## Por que hace falta
//
// El 2026-09-03 la base de Trivy publico tres CVE CRITICAL contra
// `tomcat-embed-core 11.0.22`, que es lo que fija el BOM de Spring Boot 4.1.0:
// CVE-2026-65182 (bypass de restriccion de seguridad), CVE-2026-65905 (bypass de
// autenticacion en el autenticador DIGEST) y CVE-2026-68525 (bypass de la
// autenticacion FORM). Dos de los tres son bypass de AUTENTICACION sobre un
// sistema cuya barrera principal es el token y el aislamiento por municipalidad.
// Los tres estan arreglados en 11.0.25.
//
// ## Por que una restriccion y no subir el BOM
//
// Porque subir el BOM NO lo arregla, medido contra Maven Central el 2026-09-03:
//
//     spring-boot 4.1.0    -> tomcat.version 11.0.22   (lo que corria)
//     spring-boot 4.1.1    -> tomcat.version 11.0.24   <- sigue por debajo
//     spring-boot 4.2.0-M1 -> tomcat.version 11.0.24   <- y ademas es un hito
//
// Ninguna version publicada del BOM llega a 11.0.25, asi que subirlo cambiaria el
// framework entero —con lo que eso mueve en el borde HTTP— sin cerrar el agujero.
//
// ## Por que una restriccion y no `ext["tomcat.version"]`
//
// Esa propiedad es del plugin `io.spring.dependency-management`, y aqui el BOM
// entra como `platform(...)` de Gradle: se lee el POM ya resuelto, con la
// propiedad sustituida, asi que fijarla no cambiaria nada. Lo que Gradle si hace
// es preferir la version mas alta, porque el BOM no declara `strictly`.
//
// ## Por que AQUI y no en sgtm-aplicacion, que es quien empaqueta
//
// Porque el BOM se importa en TRES sitios —`sgtm.modulo` (los trece contextos),
// `sgtm-plataforma` y `sgtm-aplicacion`—, y repetir la restriccion en los tres es
// el segundo, tercer y cuarto sitio donde olvidarse de ella. La raiz del build
// prohibe a proposito el bloque `subprojects {}`, asi que el unico lugar que
// alcanza a todos es este convenio, que todo modulo aplica.
//
// **Y no es solo elegancia: ponerla solo en `sgtm-aplicacion` deja las pruebas del
// borde HTTP corriendo contra la version VIEJA.** Los 405 con `Allow` (#556), los
// 422 del borde (#486) y el `GuardiaDeParametros` (#539) viven en
// `sgtm-plataforma`, asi que medirian un Tomcat que no es el que se empaqueta —y
// pasarian en verde aunque 11.0.25 moviera algo—. Medido: con la restriccion solo
// en `sgtm-aplicacion`, `:sgtm-plataforma:test` sale UP-TO-DATE.
//
// ## Cuando se retira
//
// En cuanto el BOM traiga 11.0.25 o posterior — y eso NO hay que recordarlo: la
// prueba `VersionDeTomcatTest` compara lo que resuelve el classpath contra su
// MINIMO, asi que el dia que el BOM ya lo cubra, quitar esto la deja en verde.
// Mientras el BOM se quede corto, quitarlo la pone roja.
// ---------------------------------------------------------------------------
val libs = extensions.getByType<VersionCatalogsExtension>().named("libs")

//
// ## Y por que `constraints.add(...)` y no `constraints { "implementation"(...) }`
//
// Porque lo segundo NO declara una restriccion: **anade una dependencia**, medido.
// Dentro de `constraints {}` el receptor de fuera —el `DependencyHandler`— sigue en
// alcance, y Kotlin resuelve ahi el `String.invoke(...)`. El sintoma es silencioso y
// serio: `sgtm-dominio-compartido` y `sgtm-esquema` pasaban de «NO lo trae» a cargar
// Tomcat en su classpath, o sea la capa que la regla 7 quiere sin Spring. Y ArchUnit
// no lo habria dicho, porque mira los IMPORTS y no el classpath: paso en verde con el
// defecto dentro. Se compara contra el arbol sin el cambio y se ve entero.
dependencies.constraints.add(
    "implementation", libs.findLibrary("tomcat-embed-core").get().get()) {
        because("tres CVE CRITICAL en 11.0.22 que el BOM todavia no cubre (#744)")
    }
