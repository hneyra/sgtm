// Contexto acotado `sanciones` (ARQ-01 §3).
//
// El catalogo de codigos de infraccion (#43) es la primera funcionalidad: registro puro,
// sin ningun literal tributario (regla 5) y sin una sola cifra de multa. Calcular la multa
// sigue bloqueado por D-02.

plugins {
    id("sgtm.modulo")
    id("sgtm.pruebas-postgres")
}

dependencies {
    // La papeleta asienta su cargo por referencia externa, sin depender de
    // ninguna clase interna de cuentacorriente (#46, ARQ-01 §4 regla 2): solo se
    // importa el paquete raiz, que es su API publica: GeneradorDeCargos.
    implementation(project(":sgtm-cuentacorriente"))

    // La prueba del repositorio corre contra PostgreSQL de verdad: provisiona la
    // base como un ambiente real y se conecta como sgtm_app, no como el
    // superusuario que entrega Testcontainers (CAL-01 §3.2).
    testImplementation(testFixtures(project(":sgtm-esquema")))
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc")

    // El caso de uso se prueba envuelto en un proxy transaccional de verdad, para
    // que lo que se verifique sea la anotacion y no un TransactionTemplate escrito
    // por la propia prueba.
    testImplementation("org.springframework:spring-aop")

    // MockMvc para el endpoint: transporte sin base de datos.
    testImplementation("org.springframework:spring-test")
    testRuntimeOnly(libs.postgresql)
}
