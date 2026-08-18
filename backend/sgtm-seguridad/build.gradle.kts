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
