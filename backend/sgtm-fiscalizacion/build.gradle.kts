// Contexto acotado `fiscalizacion` (ARQ-01 §3).
//
// Programacion y actas (#45): registro puro sobre copias, sin una sola cifra
// tributaria. Resultados, omisos, liquidacion y reliquidacion (#49) siguen
// bloqueados por D-02a.

plugins {
    id("sgtm.modulo")
    id("sgtm.pruebas-postgres")
}

dependencies {
    // El acta predial referencia la version de ficha catastral vigente a la
    // fecha de la visita (RNF-075), igual que declaracion_jurada en rentas
    // (#28). Solo se importa el paquete raiz de catastro, que es su API
    // publica: LectorDeFichas (ARQ-01 §2 catastro ──► fiscalizacion).
    implementation(project(":sgtm-catastro"))

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
