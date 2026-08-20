// sgtm-plataforma no es un contexto acotado: es la infraestructura tecnica que
// lleva el contexto de tenant desde TenantContext hasta la transaccion de base de
// datos (ARQ-03 §2). Ningun contexto de negocio la llama; la usa Spring.
//
// Vive fuera de sgtm-aplicacion porque ese modulo ensambla y nada mas (ADR-0003),
// y fuera de sgtm-dominio-compartido porque depende de Spring y el dominio no
// puede depender de Spring.

plugins {
    id("sgtm.java-base")
    id("sgtm.pruebas-postgres")
}

dependencies {
    implementation(platform(libs.spring.boot.bom))
    api(project(":sgtm-dominio-compartido"))

    // spring-boot-starter-jdbc trae spring-jdbc y HikariCP. El pool es parte del
    // contrato aqui: la verificacion al devolver la conexion necesita poder
    // descartarla, no solo cerrarla.
    api("org.springframework.boot:spring-boot-starter-jdbc")

    // El servidor de recursos entero: la cadena de SeguridadWeb valida la firma y el
    // emisor del token, y TenantContextFilter lee despues su claim (ADR-0005).
    api("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // La capa web comun —contrato, errores, paginacion— vive aqui, en
    // pe.gob.sgtm.web, y la usan los controladores de los doce contextos: por eso
    // starter-web es `api` y no `implementation`. Trae ademas la servlet API que
    // necesita TenantContextFilter.
    //
    // El perfil batch no atiende HTTP, pero es el mismo artefacto (ADR-0003), asi
    // que las clases estan igualmente y no arrancan ningun servidor por existir.
    api("org.springframework.boot:spring-boot-starter-web")

    testImplementation(testFixtures(project(":sgtm-esquema")))

    // Solo para la prueba de la cadena de identidad: verifica que /actuator/health
    // sigue siendo lo unico publico. El actuator de produccion lo trae
    // sgtm-aplicacion, que es quien lo despliega.
    testImplementation("org.springframework.boot:spring-boot-starter-actuator")
    testImplementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly(libs.postgresql)
}
