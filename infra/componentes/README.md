# `componentes/` — vacía a propósito

El issue #146 entrega **el andamio**: el árbol de Pulumi, la configuración leída y
validada en un solo sitio, y el `pulumi preview` que comenta en cada PR. Todavía no
crea ni un recurso.

Mientras esta carpeta esté vacía, `pulumi preview` **no necesita alcanzar el clúster**,
que es lo que permite correrlo en CI sin credenciales de escritura sobre el nodo.

Lo que entra aquí, cada uno en su issue:

| Componente | Qué despliega | Issue |
|---|---|---|
| `BaseDeDatos.ts` | PostgreSQL con los cuatro roles, y `verificarAislamiento` contra esa instancia | #149 |
| `Migracion.ts` | Migración e implantación como Jobs; `sgtm_owner` no entra en el Deployment | #150 |
| `Identidad.ts` | Keycloak en modo producción, con su base y su realm como código | #151 |
| `Aplicacion.ts` | La aplicación y la interfaz: perfiles `web` y `batch`, sondas y límites | #152 |
| `Ingreso.ts` | Traefik, TLS y el fin de los puertos publicados en claro | #153 |

Reglas para todo componente que se agregue:

1. Es un `ComponentResource` con interfaz tipada, y **recibe** la configuración; no la
   lee. Una regla de ESLint lo impide, con su muestra que la viola.
2. Describe infraestructura. La lógica condicional compleja es la forma en que
   TypeScript en infraestructura se vuelve un segundo sistema que mantener.
3. Nombra con `resourceName()` y etiqueta con `commonLabels()`.
4. Toda sonda declara `timeoutSeconds` explícito, y todo despliegue con estado y una
   sola réplica usa `strategy: Recreate`
   ([`INF-01` §4](../../docs/80-infraestructura/arquitectura-de-infraestructura.md)).
