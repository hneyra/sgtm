// Contexto acotado `catastro` (ARQ-01 §3).
//
// Todavia sin funcionalidad de negocio —la primera esta bloqueada por D-01 y
// D-02—, pero ya con el catalogo vial: es el repositorio de ejemplo del patron
// de persistencia (issue #5), elegido porque no arrastra ninguna regla de
// calculo y si tiene municipalidad_id y politica RLS, que es lo que hay que
// demostrar.

plugins {
    id("sgtm.modulo")
    id("sgtm.pruebas-postgres")
}

dependencies {
    // La prueba del repositorio corre contra PostgreSQL de verdad: provisiona la
    // base como un ambiente real y se conecta como sgtm_app, no como el
    // superusuario que entrega Testcontainers (CAL-01 §3.2).
    testImplementation(testFixtures(project(":sgtm-esquema")))
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc")

    // El caso de uso se prueba envuelto en un proxy transaccional de verdad, para
    // que lo que se verifique sea la anotacion y no un TransactionTemplate escrito
    // por la propia prueba.
    testImplementation("org.springframework:spring-aop")

    // MockMvc para el endpoint: se prueba el transporte —forma del JSON, parametros,
    // traduccion de errores— sin base de datos. Lo que la base verifica ya tiene sus
    // pruebas aparte, y separarlas hace que cada fallo diga que se rompio.
    testImplementation("org.springframework:spring-test")
    testRuntimeOnly(libs.postgresql)
}
