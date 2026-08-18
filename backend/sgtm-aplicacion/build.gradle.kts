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

    // Las migraciones viven en sgtm-esquema y las ejecuta el proceso de despliegue
    // como sgtm_owner. La aplicacion NO migra al arrancar: se conecta como
    // sgtm_app, que no tiene DDL (ARQ-03 §4).
    runtimeOnly(libs.postgresql)

    testImplementation(libs.archunit)
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
}
