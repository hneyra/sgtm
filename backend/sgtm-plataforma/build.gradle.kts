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
    implementation(project(":sgtm-dominio-compartido"))

    // spring-boot-starter-jdbc trae spring-jdbc y HikariCP. El pool es parte del
    // contrato aqui: la verificacion al devolver la conexion necesita poder
    // descartarla, no solo cerrarla.
    api("org.springframework.boot:spring-boot-starter-jdbc")

    // El filtro lee el claim del token ya validado (ADR-0005). Configurar el emisor
    // y el JWKS es trabajo de la iteracion de identidad; aqui solo se necesita el
    // tipo Jwt.
    api("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // La servlet API la aporta sgtm-aplicacion con starter-web. El perfil batch no
    // atiende HTTP, pero es el mismo artefacto, asi que la clase esta igualmente.
    compileOnly("jakarta.servlet:jakarta.servlet-api")

    testImplementation(testFixtures(project(":sgtm-esquema")))
    testImplementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly(libs.postgresql)
}
