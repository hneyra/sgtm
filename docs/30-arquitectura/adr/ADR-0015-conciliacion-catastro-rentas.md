# ADR-0015 — La conciliación catastro↔rentas: un derivado que publica rentas, no un estado que guarda catastro

**Estado:** aceptada · 2026-08-28
**Decide:** el contrato de la conciliación que #322 exige diseñar antes de cablear pantalla alguna.

## Contexto

El prototipo dibuja la conciliación como si hubiera dos padrones: la consulta de fichas trae las
columnas «Cod. Predial Rentas» y «Conciliada», un filtro `conciliadaConRentas`, la acción masiva
«Conciliar seleccionadas», y la ficha urbana un campo capturable «Código Predial de Rentas». Su
nota lo justifica: *las fichas no conciliadas no generan deuda predial*.

El esquema dice otra cosa, y lo dice desde V1:

- **Hay un solo padrón de predios.** `predio` vive en la sección de catastro
  (`V1__nucleo_y_catastro.sql`) y **todo** rentas cuelga de él: `declaracion_jurada.predio_id`,
  `determinacion.predio_id`, `cuenta_corriente_asiento.predio_id`. No existe un «predio de
  rentas» aparte al que asignarle nada.
- **La ficha nace con su predio.** `ficha_catastral.predio_id` es `NOT NULL`, e `InscribirFicha`
  crea predio y ficha en el mismo acto (#290). Una ficha sin predio es irrepresentable.
- **El «código predial de rentas» ya es el código de referencia catastral.** `sgtm-rentas` los
  trata como sinónimos por escrito: `CriterioDeArbitrio` documenta `codigoPredial` como «el
  código de referencia catastral del predio» y su repositorio lo traduce a
  `p.codigo_ref_catastral`.
- **«Conciliada» no existe como columna ni concepto en el DDL.** No hay estado, ni fecha, ni
  quien concilió.

Lo que sí existe es el enlace en la otra dirección: `declaracion_jurada.ficha_catastral_id`
(V19) — rentas apunta a la versión de ficha que declaró. Y el propio código ya definió qué
significa el filtro: `FiltroDeFichas` rechaza `conciliadaConRentas` con 422 explicando que
«compara el catastro con la declaración jurada, y ese contexto aún no publica su lado» — y que
responderlo con un `JOIN` desde catastro «sería el acoplamiento que ARQ-01 §4 evita, con el
agravante de ser invisible para Spring Modulith».

La restricción decisiva es estructural: `sgtm-rentas` depende de `sgtm-catastro`; catastro **no**
depende de rentas. Cualquier operación alojada en catastro que necesite mirar rentas cierra un
ciclo que `verificarArquitectura` rechaza.

## Decisión

1. **«Conciliada» es un derivado, no un estado.** Un predio está conciliado cuando rentas lo
   reconoce como afecto: existe una declaración jurada vigente que apunta a una versión de su
   ficha (`declaracion_jurada.ficha_catastral_id`, V19). No se agrega ninguna columna — ni a
   `ficha_catastral`, cuyo invariante es versionarse y no sobrescribirse (ARQ-01 §3.2), ni a
   `predio`. No había columna que modelar porque no hay estado que guardar.

2. **La lectura la publica rentas.** La columna «Conciliada», el filtro `conciliadaConRentas` y
   el «desde cuándo» los sirve una operación del contexto `rentas` que compone catastro y
   rentas por sus APIs públicas — el patrón exacto de `ConsultaPrediosController`, que ya
   combina `catastro` y `cuentacorriente` en una lectura y explica por qué vive donde vive.
   Cuando esa operación exista, el 422 deliberado de `ConsultaController` se retira; hasta
   entonces la interfaz muestra «—», que es la verdad.

3. **El acto que concilia es registrar la declaración jurada.** Conciliar no es escribir un
   código en la ficha —el código ya lo tiene— sino incorporar el predio al padrón afecto, y eso
   **ya tiene opción propia** (`declaracion_jurada`), con su permiso y su observación (regla
   10). «Conciliar seleccionadas», la acción masiva a ciegas del prototipo, no se implementa:
   desde la ficha o la consulta, la acción lleva a la declaración jurada **con el predio
   puesto** (el patrón `acto` de la composición, como «Actualizar catastro»). La emisión masiva
   ya trata al predio sin declaración como *observado*, que es el comportamiento correcto.

4. **Nadie escribe en catastro salvo catastro** (ARQ-01 §4 regla 4). Si algún acto de
   conciliación necesitara tocar el padrón, iría por un puerto público del paquete raíz de
   catastro — el precedente es `GestorDeTitularidad`, por el que la transferencia de rentas
   escribe titularidad —, nunca por SQL directo ni por dependencia inversa.

5. **El caso del código heredado es migración, no operación.** Si la implantación encuentra
   códigos prediales del sistema anterior que no casan con el catastral (el `codigoAnterior` de
   solo lectura del prototipo), ese emparejamiento pertenece a D-04 (migración desde SQL
   Server), con su propia herramienta y su propia auditoría. No se le da botón en la operación
   diaria.

## Lo descartado, y por qué

- **`PUT` sobre la ficha en catastro** (opción A del issue): exigiría que catastro consulte
  rentas (ciclo prohibido) o una columna en una tabla cuyo invariante es no sobrescribirse; y el
  dato no es de la versión de la ficha sino del predio — y ni siquiera del predio: es de la
  relación con rentas, que rentas conoce.
- **Parte de la transferencia** (opción C): la transferencia cambia quién es titular, no si el
  predio está afecto; un predio recién fichado sin transferencia alguna es justamente el caso
  que la conciliación describe. `RegistrarTransferencia` documenta además que no genera efectos
  de deuda por sí sola.

## Consecuencias

- **Frontend, hoy** (#322): la columna «Conciliada» y «Cod. Predial Rentas» conservan sus
  rótulos (RNF-080) con contenido honesto — «—» mientras la lectura no exista; el aviso de
  dominio dice la consecuencia («un predio sin declaración jurada no genera deuda predial») y
  qué acto la resuelve; la insignia, cuando llegue el dato, lleva texto y nunca solo color
  (FRO-02 §2.1). La franja de actos honestos ya cubre «Conciliar seleccionadas».
- **Backend, pendiente** (issue de seguimiento): la lectura compuesta en `sgtm-rentas`
  (paginado de fichas con su estado derivado y el filtro), y retirar el 422 de
  `ConsultaController` redirigiendo la consulta o documentando la operación nueva en
  `sgtm-v1.yaml`. Ninguna migración.
- **El contrato compartido no se toca hasta que el backend publique**: declarar la ruta sin
  servidor pondría en rojo la prueba de las dos direcciones, a propósito.
