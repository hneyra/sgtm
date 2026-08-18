// Contexto acotado `seguridad` (ARQ-01 §3.12).
//
// Transversal: todos dependen de el y el de ninguno. La autenticacion vive
// fuera (ADR-0005); aqui esta la autorizacion, que es la del manual.
//
// De momento solo el camino de escritura de permisos que el issue #7 necesita
// para demostrar que un cambio de configuracion deja auditoria. El
// mantenimiento completo es de #9 y #12; el guardia que los comprueba, de #8.

plugins {
    id("sgtm.modulo")
    id("sgtm.pruebas-postgres")
}

dependencies {
    testImplementation(testFixtures(project(":sgtm-esquema")))
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc")
    testImplementation("org.springframework:spring-aop")
    testRuntimeOnly(libs.postgresql)
}

// RF-122: la lista de opciones tiene una sola fuente, el catalogo de NEG-03, que a
// su vez se genera del prototipo de interfaz. El build la copia a los recursos de
// este modulo para que la siembra de accesos la lea del jar.
//
// Copiarla en lugar de mantener una segunda lista es lo que hace cierta la promesa
// del manual: una opcion nueva en el catalogo aparece como acceso configurable en
// el siguiente arranque, sin que nadie tenga que acordarse de nada.
val catalogoDeOpciones = tasks.register<Copy>("copiarCatalogoDeOpciones") {
    description = "Copia el catalogo de opciones (NEG-03) a los recursos de seguridad."
    from(rootProject.layout.projectDirectory.file("../docs/10-negocio/catalogo-de-opciones.md"))
    into(layout.buildDirectory.dir("generated/recursos/seguridad"))
}

sourceSets {
    named("main") {
        resources.srcDir(catalogoDeOpciones.map { it.destinationDir.parentFile })
    }
}
