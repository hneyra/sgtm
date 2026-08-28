// Contexto acotado `licencias` (ARQ-01 §3.11).
//
// La licencia municipal de funcionamiento, sus giros CIIU, sus duplicados y su
// cancelacion (#44, RF-110, RF-111, RF-112).
//
// NO DETERMINA DEUDA, Y HOY NO GENERA NINGUNA. El derecho de tramite se paga en
// caja de tasas ANTES de emitir —por eso este modulo lee recibos— y un derecho
// de tramite no es deuda tributaria: no se determina, no devenga interes y no
// prescribe. Lo unico que una licencia podria generar es la deuda de arbitrios
// del establecimiento, que la determina `rentas` con tablas de ordenanza
// bloqueadas por D-02b; cuando llegue, entrara por
// `cuentacorriente.GeneradorDeCargos` como todo cargo de otro contexto (ARQ-01
// §4 regla 2). Mientras tanto este modulo NO depende de `cuentacorriente`, y
// declarar la dependencia «por si acaso» seria abrir el limite sin usarlo.

plugins {
    id("sgtm.modulo")
    id("sgtm.pruebas-postgres")
}

dependencies {
    // Las tres APIs publicas que la licencia consume. Nunca sus tablas: Spring
    // Modulith verifica que no se cruce el limite (ARQ-01 §4).
    //
    //  - tesoreria.RecibosDeTramite: comprobar que el derecho esta pagado, sin
    //    leer `recibo` (AC 1 de #44).
    //  - contribuyentes.DirectorioDeContribuyentes: resolver el titular que llega
    //    por HTTP y su nombre para el papel.
    //  - catastro.LectorDeFichasEconomicas: la ficha economica del predio donde
    //    esta el establecimiento (#19, AC 3 de #44).
    implementation(project(":sgtm-tesoreria"))
    implementation(project(":sgtm-contribuyentes"))
    implementation(project(":sgtm-catastro"))

    // Y la cuarta: parametros.LectorDeParametros. De ahi sale QUE concepto del
    // TUPA cobra el derecho de tramite. El importe no: ese vive en la tabla
    // `tasa` desde V3, con su ordenanza y su vigencia, y copiarlo al conjunto
    // sellado dejaria dos sitios donde vive la misma tarifa (regla 5).
    implementation(project(":sgtm-parametros"))

    // Las pruebas de repositorio y del ciclo completo corren contra PostgreSQL de
    // verdad, conectadas como sgtm_app y no como el superusuario que entrega
    // Testcontainers (CAL-01 §3.2). Contra un doble no se puede demostrar ni el
    // REVOKE UPDATE de V37, ni que dos duplicados simultaneos no compartan
    // ordinal, ni que RLS aisle la licencia.
    testImplementation(testFixtures(project(":sgtm-esquema")))
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc")

    // El caso de uso se prueba envuelto en un proxy transaccional de verdad, para
    // que lo que se verifique sea la anotacion y no un TransactionTemplate de la
    // prueba.
    testImplementation("org.springframework:spring-aop")

    // MockMvc para el endpoint: transporte sin base de datos.
    testImplementation("org.springframework:spring-test")
    testRuntimeOnly(libs.postgresql)
}
