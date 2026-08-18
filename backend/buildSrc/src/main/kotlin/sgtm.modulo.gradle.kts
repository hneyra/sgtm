// Convenciones de un contexto acotado (ARQ-01 §3): capas dominio / aplicacion /
// infraestructura dentro del mismo modulo Gradle (ARQ-04 §1).
//
// El BOM de Spring Boot se importa para alinear versiones, pero NO se aplica el
// plugin de Spring Boot: solo sgtm-aplicacion produce un artefacto ejecutable.
// La capa `dominio` no debe importar Spring; eso se verifica con analisis
// estatico, no con la ausencia de la dependencia.

import org.gradle.api.artifacts.VersionCatalogsExtension

plugins {
    id("sgtm.java-base")
    id("sgtm.pruebas")
}

val libs = extensions.getByType<VersionCatalogsExtension>().named("libs")

dependencies {
    "implementation"(platform(libs.findLibrary("spring-boot-bom").get()))
    "implementation"(project(":sgtm-dominio-compartido"))
}
