rootProject.name = "sgtm-backend"

// Compartido: objetos de valor y contexto de tenant. No depende de ningun
// contexto acotado (ARQ-01 §4 regla 6).
include("sgtm-dominio-compartido")

// Esquema: migraciones Flyway y la prueba de aislamiento multi-tenant.
// No es un contexto acotado; es infraestructura de datos comun a todos.
include("sgtm-esquema")

// Plataforma: lleva el contexto de tenant hasta la transaccion (ARQ-03 §2).
// Tampoco es un contexto acotado.
include("sgtm-plataforma")

// Indicadores: el panel de recaudacion (#56, RF-130). Tampoco es un contexto
// acotado —ARQ-01 §3 fija doce y este no es el trece—: no tiene modelo, no tiene
// tablas y no decide nada. Agrega lo que cuentacorriente y tesoreria ya publican,
// y su build declara que solo puede ver esos dos.
include("sgtm-indicadores")

// Los doce contextos acotados de ARQ-01 §3. Nacieron vacios —la estructura fijo
// los limites antes de que hubiera codigo que los cruzara— y hoy los doce tienen
// codigo de negocio; el estado por contexto esta en ARQ-01 §5.
include("sgtm-contribuyentes")
include("sgtm-catastro")
include("sgtm-rentas")
include("sgtm-parametros")
include("sgtm-fiscalizacion")
include("sgtm-sanciones")
include("sgtm-cuentacorriente")
include("sgtm-tesoreria")
include("sgtm-valores")
include("sgtm-coactiva")
include("sgtm-licencias")
include("sgtm-seguridad")

// Ensambla el artefacto unico, en perfiles web y batch (ADR-0003).
include("sgtm-aplicacion")

dependencyResolutionManagement {
    repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS
    repositories {
        mavenCentral()
    }
}
