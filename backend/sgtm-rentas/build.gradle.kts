// Contexto acotado `rentas` (ARQ-01 §3).
//
// Primera funcionalidad de negocio: beneficios y exoneraciones (issue #27), registro
// puro que no depende de D-02. La determinacion y las demas opciones siguen
// bloqueadas por D-01 y D-02.

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
    testImplementation("org.springframework:spring-test")
    testRuntimeOnly(libs.postgresql)
}
