// Ensambla el artefacto unico, desplegado en los perfiles web y batch (ADR-0003).
//
// Es tambien donde corren las verificaciones que necesitan ver todo el sistema a la
// vez: las reglas de ArchUnit de ARQ-04 §2 y los limites de modulo de Spring
// Modulith. Ningun otro modulo tiene en su classpath a todos los demas.

plugins {
    id("sgtm.java-base")
    id("sgtm.pruebas")
    alias(libs.plugins.spring.boot)
}

dependencies {
    implementation(platform(libs.spring.boot.bom))
    implementation(platform(libs.spring.modulith.bom))

    implementation(project(":sgtm-dominio-compartido"))
    implementation(project(":sgtm-plataforma"))

    // El panel de recaudacion (#56). No es un contexto acotado: agrega las APIs
    // publicas de cuentacorriente y tesoreria y no tiene tablas propias.
    implementation(project(":sgtm-indicadores"))

    // Los doce contextos acotados de ARQ-01 §3.
    implementation(project(":sgtm-contribuyentes"))
    implementation(project(":sgtm-catastro"))
    implementation(project(":sgtm-rentas"))
    implementation(project(":sgtm-parametros"))
    implementation(project(":sgtm-fiscalizacion"))
    implementation(project(":sgtm-sanciones"))
    implementation(project(":sgtm-cuentacorriente"))
    implementation(project(":sgtm-tesoreria"))
    implementation(project(":sgtm-valores"))
    implementation(project(":sgtm-coactiva"))
    implementation(project(":sgtm-licencias"))
    implementation(project(":sgtm-seguridad"))

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.modulith:spring-modulith-starter-core")

    // Actuator entra por dos razones: la sonda de vida y las metricas (issue #156).
    // Sin un endpoint que diga si el proceso esta arriba Y llega a la base,
    // `depends_on: service_healthy` del compose no puede significar nada, y el
    // despliegue se queda esperando a un contenedor que quiza nunca sirva una
    // peticion. Se exponen `health` y `prometheus`, y nada mas (application.yaml,
    // SeguridadWeb).
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    // El registro de Prometheus. Sin el, `/actuator/prometheus` no existe aunque
    // este en la lista de exposicion: Micrometer necesita SABER en que formato
    // escribir, y este es el que Prometheus sabe leer.
    implementation("io.micrometer:micrometer-registry-prometheus")

    // Las migraciones viven en sgtm-esquema y las ejecuta el proceso de despliegue
    // como sgtm_owner. La aplicacion NO migra al arrancar: se conecta como
    // sgtm_app, que no tiene DDL (ARQ-03 §4).
    runtimeOnly(libs.postgresql)

    testImplementation(libs.archunit)

    // La muestra de caso de uso que viola la regla 10 lleva @Transactional: sin
    // spring-tx no compilaria, y sin ella la regla no tendria como demostrarse.
    testImplementation("org.springframework:spring-tx")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
}

// Nombre fijo del artefacto ejecutable. La imagen lo copia por nombre y no por
// comodin: `*.jar` casaria tambien con el `-plain.jar` que produce el plugin de
// java-library, y cual de los dos acaba en el contenedor dependeria del orden
// alfabetico.
tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName.set("sgtm.jar")
}
