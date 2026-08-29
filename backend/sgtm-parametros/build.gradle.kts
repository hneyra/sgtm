// Contexto acotado `parametros` (ARQ-01 §3.4).
//
// Los demas contextos SOLO leen de aqui. Escribir es un acto administrativo con
// doble verificacion, no una operacion de negocio.

plugins {
    id("sgtm.modulo")
    id("sgtm.pruebas-postgres")
}

dependencies {
    testImplementation(testFixtures(project(":sgtm-esquema")))
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc")
    testImplementation("org.springframework:spring-aop")
    testRuntimeOnly(libs.postgresql)
}

// Las pruebas del derivado publicable y del manifiesto de cuadros leen archivos del
// repositorio que viven FUERA del modulo (#192, #188). Sin declararlos como entrada, editar
// uno deja a `test` en UP-TO-DATE y la rotura pasa en verde rancio en local; en CI corre
// fresco y muerde, pero el sintoma local mentiria —y se comprobo: cambiarle el orden de
// columnas al manifiesto dio BUILD SUCCESSFUL sin correr una sola prueba—.
tasks.test {
    val delCorpus = rootProject.file("../docs/10-negocio/valores-normativos")
    inputs
        .file(delCorpus.resolve("publicacion/parametros-2026.csv"))
        .withPathSensitivity(PathSensitivity.RELATIVE)
    inputs
        .file(delCorpus.resolve("publicacion/cuadros-2026.csv"))
        .withPathSensitivity(PathSensitivity.RELATIVE)
    inputs
        .file(delCorpus.resolve("fuentes/depreciacion-rnt-2016/depreciacion.csv"))
        .withPathSensitivity(PathSensitivity.RELATIVE)
}
