// Contexto acotado `rentas` (ARQ-01 §3.3).
//
// El padron vehicular (#26) y beneficios y exoneraciones (#27): registro puro, sin una
// sola cifra. La determinacion —predial, arbitrios, vehicular, alcabala— sigue bloqueada
// por D-02, y lo que falta no es la estructura sino los valores normativos.

plugins {
    id("sgtm.modulo")
    id("sgtm.pruebas-postgres")
}

dependencies {
    // La UNICA dependencia a otro contexto acotado, y esta aqui para que se vea.
    //
    // Los valores referenciales de vehiculos son datos normativos: cuelgan de un conjunto sellado,
    // no de un ejercicio. Traducir «ejercicio» a «conjunto» es cosa de `parametros` —es quien sabe
    // que significa sellado y cual es la version vigente— y se importa solo su paquete raiz, que es
    // la API publica (ARQ-01 §4.1).
    //
    // La alternativa era resolver el conjunto en el SQL de rentas. Mas corto, invisible para
    // Modulith, y el dia que alguien olvide el `AND estado = 'SELLADO'` se lee un conjunto abierto
    // sin que nada falle.
    implementation(project(":sgtm-parametros"))

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
