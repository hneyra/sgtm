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
