// El panel de recaudacion (#56, RF-130). NO es un contexto acotado.
//
// ARQ-01 §3 fija doce contextos y este no es el trece: no tiene modelo, no tiene
// tablas y no decide nada. Es una LECTURA TRANSVERSAL que agrega lo que otros ya
// publican, y por eso vive junto a `sgtm-esquema` y `sgtm-plataforma` en la lista
// de modulos que no son contextos.
//
// Lo que este archivo declara es la frontera del panel, y es su mitad mas util:
// solo ve `cuentacorriente` y `tesoreria`. Sumar un tercer contexto al panel
// cuesta una linea aqui, y esa linea la escribe alguien que tiene que decidir
// —y dejar escrito— por que el panel necesita mirar ahi. Spring Modulith vigila
// que no se cruce el limite por dentro (AC 3); Gradle vigila que ni siquiera este
// en el classpath.

plugins {
    id("sgtm.modulo")
}

dependencies {
    // Lo recaudado, lo cargado y la cartera pendiente: RecaudacionDelLibro y
    // CarteraDelLibro, las dos del paquete raiz. Ninguna tabla (ARQ-01 §4 regla 1).
    implementation(project(":sgtm-cuentacorriente"))
    // El avance del dia, por AvanceDeCaja. Reutiliza #36 en vez de volver a sumar
    // recibos: si el panel los sumara por su cuenta, la pantalla de inicio y la de
    // recaudacion podrian decir cifras distintas del mismo dia.
    implementation(project(":sgtm-tesoreria"))

    // MockMvc para el endpoint: transporte sin base de datos. El panel no persiste
    // nada, asi que no hay una sola prueba contra PostgreSQL en este modulo; las que
    // demuestran que las cifras cuadran con el libro y que RLS las separa viven donde
    // vive el SQL, en sgtm-cuentacorriente.
    testImplementation("org.springframework:spring-test")
    testImplementation("org.springframework.boot:spring-boot-starter-web")
}
