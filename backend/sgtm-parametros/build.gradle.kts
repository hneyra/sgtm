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

// Las pruebas del derivado publicable leen el CSV del repositorio (#192). Sin declararlo
// como entrada, editar el CSV deja a `test` en UP-TO-DATE y una rotura del derivado pasa
// en verde rancio en local; en CI corre fresco y muerde, pero el sintoma local mentiria.
tasks.test {
    inputs
        .file(rootProject.file("../docs/10-negocio/valores-normativos/publicacion/parametros-2026.csv"))
        .withPathSensitivity(PathSensitivity.RELATIVE)
}
