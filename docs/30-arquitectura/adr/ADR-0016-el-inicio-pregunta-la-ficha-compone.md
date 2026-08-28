# ADR-0016 — El inicio pregunta y la ficha compone: las fases 3–5 de ADR-0014, sin el agregador que no hacía falta

**Estado:** aceptada · 2026-08-28
**Decide:** los tres contratos que #296, #297 y #298 exigían decidir antes de implementar, y
corrige la premisa con que ADR-0014 los dejó «bloqueados por backend».

## Contexto

ADR-0014 §1 dejó la búsqueda transversal y la ficha 360° «bloqueadas por un endpoint agregador
del padrón que el backend aún no publica». El inventario contra el código dice otra cosa, en las
dos direcciones:

- **Lo que se esperaba ya existe.** `GET /consultas/unificada` (#25) es un agregador real:
  `@Transactional(readOnly = true)`, un solo `SET LOCAL` y un solo instante de lectura para
  deuda, pagos, altas y bajas, fraccionamientos, valores y declaraciones juradas, compuesto por
  cinco puertos ajenos solo por API pública, con `resumenDeSaldos` **sumado por el servidor** y
  cada cifra como `ImporteActualizado` con su fecha. El comentario del frontend que lo daba por
  inexistente estaba rancio.
- **Lo que había que «conservar» nunca existió.** El panel de recaudación del inicio apunta a
  `GET /indicadores/recaudacion`, que ningún controller sirve: solo el proxy. La premisa
  temporal estaba invertida.
- **La búsqueda no necesita backend nuevo.** `GET /rentas/contribuyentes` busca por código, por
  nombre **con aproximación** (`CriterioDeBusqueda`: sin tildes, apellidos invertidos, una letra
  de menos), por DNI y por RUC; `GET /consultas/vehiculos?placa=` y
  `GET /catastro/fichas?codRefCatastral=` cubren la placa y el predio. Tres lecturas, tres
  permisos distintos.

## Decisión

1. **La búsqueda transversal del inicio (#296) es un abanico de las tres lecturas publicadas,
   no un agregador.** El inicio pregunta a quién se atiende y consulta en paralelo
   `contribuyentes`, `consulta_vehiculos` y `consulta_fichas` — **cada una solo si el catálogo
   visible la ofrece** (`useCatalogoVisible`, ADR-0013). Es una decisión de fondo, no de
   conveniencia: con un agregador único, el cajero sin permiso de vehículos recibiría un 403
   que rompe la búsqueda entera o vehículos que no debe ver; con el abanico, cada resultado
   llega por el permiso que lo cubre y la ausencia de un permiso solo apaga su franja. Un
   endpoint unificado del backend queda como **optimización posible, no como requisito**, y si
   algún día existe deberá conservar esta semántica por permiso.

   El panel de recaudación no desaparece: deja de ser el inicio y queda como la opción que
   siempre fue, para quien dirige, vía lanzador — exactamente lo que ADR-0014 §1 prometía. Su
   backend sigue sin existir y su pantalla lo seguirá diciendo con el mecanismo de actos
   honestos.

2. **La ficha 360° (#297) compone opciones publicadas, pestaña a pestaña, con
   `consulta_unificada` como su columna financiera.** Cada pestaña declara de qué opción
   compone y viaja con **su** operación y **su** permiso (ADR-0014 §1 ya lo exigía; este ADR
   solo constata que las lecturas existen):

   | Pestaña | Opción / operación | Clave |
   |---|---|---|
   | Cabecera e identidad | `contribuyentes` | código, DNI, RUC, nombre aproximado |
   | Deuda, pagos, valores, convenios, DJ | `consulta_unificada` — y su `resumenDeSaldos` es **el único total consolidado con su fecha que el sistema publica**: es la cifra de la cabecera (regla 9) | código |
   | Predios (con deuda por predio) | `consulta_predios` | código |
   | Vehículos | `consulta_vehiculos` | código o placa |
   | Papeletas de tránsito | `papeletas` | **documento** del contribuyente (`documentoDelInfractor`) — la identidad la da `ContribuyenteResource.numeroDocumento` |
   | Papeletas administrativas | `adm_estado_cuenta` | código |
   | Coactiva | expedientes coactivos | código |

   **Fronteras que se dicen, no se puentean:** las licencias solo se buscan por *nombre*
   (`nombreDelContribuyente`), y componer por nombre abre al homónimo — esa pestaña no se
   compone hasta que licencias publique búsqueda por código o documento (trabajo backend, con
   su issue). Las declaraciones juradas no tienen listado propio por contribuyente; llegan por
   la unificada, y eso basta.

   Las **acciones con el contexto puesto** usan el patrón `acto` del registro de composición
   (llevar a otra de las 134 con el registro en la ruta): nada nuevo que permisar, ninguna
   escritura fuera de `useEscritura`.

3. **El portal (#298) se separa, porque esta composición cumple el criterio de ADR-0009 — y su
   autenticación es la frontera.** ADR-0009 fijó tres condiciones y hoy la primera se cumple
   por diseño: «la misma composición, en solo lectura» convierte el portal de una pantalla
   estática en un recorrido con estado. La separación es la barata que ADR-0009 §final
   describió: `apps/portal` consume los mismos paquetes, **sin el shell ni el catálogo de
   navegación** — los ~11,5 KB de doce módulos que el ciudadano descarga para no usarlos
   nunca —, con su presupuesto propio medido y fijado a la baja. Lo que **no** se puede
   implementar todavía es el acceso del ciudadano: hoy el portal vive tras la puerta de sesión
   del realm de funcionarios, no existe realm ciudadano (ADR-0005, condición 2 de ADR-0009) ni
   ninguna lectura anónima. Esa frontera es backend y queda con su issue; mientras, el portal
   separado se sirve tras la misma sesión —la marcha blanca del funcionario que lo previsualiza—
   y **ninguna lectura se abre al público por el camino**.

## Consecuencias

- ADR-0014 §1 queda corregido en su premisa: la búsqueda y la ficha no estaban bloqueadas por
  backend; estaban bloqueadas por esta decisión. El panel de recaudación pasa de «inicio
  provisional» a opción del lanzador.
- El frontend corrige el comentario rancio de `consultas/index.ts` y conecta
  `consulta_unificada`, `consulta_resumen_predial` y `consulta_valores`, que ya tienen
  controller.
- Backend pendiente, cada uno con su issue: búsqueda de licencias por código o documento;
  realm y lecturas del ciudadano para el portal público; y, si la operación diaria lo pide, el
  endpoint unificado de búsqueda del padrón como optimización — nunca como sustituto de la
  semántica por permiso.
