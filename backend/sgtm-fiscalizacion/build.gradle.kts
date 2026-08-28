// Contexto acotado `fiscalizacion` (ARQ-01 §3).
//
// Programacion y actas (#45): registro puro sobre copias, sin una sola cifra
// tributaria. Liquidacion, reliquidacion, omisos y subvaluadores (#49): la
// ESTRUCTURA del contraste hallado/declarado, tambien sin una sola cifra —los
// importes liquidados y las multas viven en #198, con `bloqueado:D-02a`—.

plugins {
    id("sgtm.modulo")
    id("sgtm.pruebas-postgres")
}

dependencies {
    // El acta predial referencia la version de ficha catastral vigente a la
    // fecha de la visita (RNF-075), igual que declaracion_jurada en rentas
    // (#28). Solo se importa el paquete raiz de catastro, que es su API
    // publica: LectorDeFichas, LectorDeCaracteristicas y —desde #49—
    // PadronDePredios (ARQ-01 §2 catastro ──► fiscalizacion).
    implementation(project(":sgtm-catastro"))

    // La deteccion de omisos cruza el padron de predios con las declaraciones
    // juradas del ejercicio (RF-055). La segunda mitad de ese cruce solo la
    // puede contestar `rentas`, y se pregunta por su paquete raiz:
    // DeclaracionesDelEjercicio. La alternativa era leer `declaracion_jurada`
    // desde aqui, que es cruzar el limite del contexto.
    implementation(project(":sgtm-rentas"))

    // La liquidacion fija el conjunto SELLADO del ejercicio de cada linea
    // (AC 1 de #49) y lo recupera por identificador, nunca por ejercicio.
    // Traducir «ejercicio» a «conjunto» es cosa de `parametros`.
    implementation(project(":sgtm-parametros"))

    // El estado de cuenta de fiscalizacion (RF-056) pregunta cuanto se debe a
    // una fecha, y la unica fuente de eso es el libro. Arista al reves de las
    // otras: es la excepcion que preve ARQ-01 §4 regla 2.
    implementation(project(":sgtm-cuentacorriente"))

    // Las pantallas hablan del contribuyente por su codigo, no por su
    // identificador interno: DirectorioDeContribuyentes lo traduce.
    implementation(project(":sgtm-contribuyentes"))

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
