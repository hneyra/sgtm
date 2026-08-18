// sgtm-esquema no es un contexto acotado: contiene las migraciones Flyway y la
// prueba de aislamiento multi-tenant, que es bloqueante.
//
// Deliberadamente NO depende de Spring. La prueba verifica el motor de base de
// datos, no la aplicacion; levantar un contexto de Spring solo agregaria formas
// de que pase en verde por el motivo equivocado.
//
// El arranque de la base (roles + migraciones) se publica como test fixtures: lo
// reutiliza sgtm-plataforma para su prueba con el pool real. Un segundo arranque
// copiado seria un segundo sitio donde olvidar que el rol no puede ser superusuario.

plugins {
    id("sgtm.java-base")
    id("sgtm.pruebas-postgres")
    `java-test-fixtures`
}

dependencies {
    // El BOM va en `api` y no en `implementation`: quien consuma los fixtures
    // recibe testcontainers en su classpath y necesita tambien sus versiones.
    testFixturesApi(platform(libs.testcontainers.bom))
    testFixturesApi(libs.testcontainers.postgresql)
    testFixturesImplementation(libs.flyway.core)
    testFixturesRuntimeOnly(libs.flyway.postgresql)
    testFixturesRuntimeOnly(libs.postgresql)

    testRuntimeOnly(libs.postgresql)
}

tasks.test {
    // Sin esto, un fallo de aislamiento podria quedar oculto por el cache de Gradle
    // cuando cambia solo el motor de base de datos y no las fuentes.
    outputs.upToDateWhen { false }
}
