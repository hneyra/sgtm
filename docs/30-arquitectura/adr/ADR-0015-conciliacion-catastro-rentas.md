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

Lo que sí existe es el enlace en la otra dirección, y son **dos** columnas distintas:
`declaracion_jurada.predio_id` (V2) —de qué predio es la declaración— y
`declaracion_jurada.ficha_catastral_id` (V19) —qué **versión** de ficha se declaró, para que
reimprimir una DJ de 2024 en 2030 no lea la ficha actual (RNF-075)—. La segunda es detalle de la
primera, y confundirlas es el defecto que este ADR corrige más abajo.

Y el propio código ya definió qué significa el filtro: `ConsultaController` rechaza
`conciliadaConRentas` con 422, con la justificación que `FiltroDeFichas` escribe en su javadoc —
«compara el catastro con la declaración jurada del padrón de rentas. Ese contexto todavía no
existe, y responderlo leyendo su tabla desde aquí sería el acoplamiento que ARQ-01 §4 evita, con
el agravante de ser invisible para Spring Modulith».

La restricción decisiva es estructural: `sgtm-rentas` depende de `sgtm-catastro`; catastro **no**
depende de rentas. Cualquier operación alojada en catastro que necesite mirar rentas cierra un
ciclo que `verificarArquitectura` rechaza.

## Decisión

1. **«Conciliada» es un derivado, no un estado, y lleva su ejercicio.** No se agrega ninguna
   columna — ni a `ficha_catastral`, cuyo invariante es versionarse y no sobrescribirse
   (ARQ-01 §3.2), ni a `predio`. No había columna que modelar porque no hay estado que guardar.

   El predicado, escrito entero:

   > un predio está **conciliado a un ejercicio** cuando existe una `declaracion_jurada` de ese
   > ejercicio, con `predio_id` igual al del predio, en estado `PRESENTADA` u `OBSERVADA`.

   **La pertenencia al padrón afecto se deriva de `declaracion_jurada.predio_id`, no de
   `ficha_catastral_id`.** Este ADR decía lo segundo, y producía falsos omisos: la columna de V19
   es *nullable* y su propio javadoc lo dice —«nulo si el predio no tiene ficha registrada
   todavía, o si el tipo no es predial», `DeclaracionJurada:30-32`—, su clave foránea va
   `NOT VALID` (DAT-01 §0, cuarto hallazgo) y **toda fila anterior a V19 la tiene nula**. Una DJ
   válida presentada antes de que el predio tuviera ficha —el caso corriente en ventanilla, y
   todas las filas migradas— saldría «no conciliada», que es acusar de omiso a quien declaró.
   `predio_id` es el ligado directo, existe desde V2 y su FK contra `predio` sí está en la tabla
   original. `ficha_catastral_id` contesta otra pregunta —«qué versión declaró»—, que es detalle
   de la declaración y no predicado de pertenencia.

   **Qué estados cuentan**, sobre los cuatro que admite `declaracion_jurada_estado_check` (V2) y
   enumera `EstadoDeDeclaracion`. «Vigente» no es una noción del dominio, así que se enumera:

   | Estado | ¿Concilia? | Por qué |
   |---|---|---|
   | `PRESENTADA` | **sí** | el contribuyente declaró; el predio está en el padrón afecto |
   | `OBSERVADA` | **sí** | la administración objetó **el contenido** de una declaración que existe y fue presentada. Observarla no la retira: negarle la conciliación diría «este predio no genera deuda predial» de un predio que sí la genera, y es el falso omiso otra vez |
   | `SUSTITUIDA` | **no por sí sola** | cuenta **a través de su sustituta**. `rectificadaPor` deja dos filas —la anterior `SUSTITUIDA`, la nueva `PRESENTADA`— sobre el mismo `predio_id`, así que el predicado ya la recoge por la segunda. Contar también la primera duplicaría la misma declaración |
   | `ANULADA` | **no** | la declaración dejó de sustentar nada |

   **Y lleva su dimensión temporal** (regla 9, RNF-075): no existe «conciliado», existe
   `conciliadoA(ejercicio)`. La DJ de 2024 no concilia 2026 —el padrón afecto se rehace cada
   ejercicio—, y `declaracion_jurada.ejercicio` es `NOT NULL` desde V2, así que el dato para
   decirlo ya está. La columna de la pantalla se rotula con el ejercicio al que responde, como
   toda cifra que se muestra indica su fecha.

2. **La lectura la publica rentas.** La columna «Conciliada», el filtro `conciliadaConRentas` y
   el «desde cuándo» los sirve una operación del contexto `rentas` que compone catastro y
   rentas por sus APIs públicas — el patrón exacto de `ConsultaPrediosController`, que ya
   combina `catastro` y `cuentacorriente` en una lectura y explica por qué vive donde vive.
   Cuando esa operación exista, el 422 deliberado de `ConsultaController` se retira; hasta
   entonces la interfaz muestra «—», que es la verdad.

   **La frontera de datos y de permiso se fija aquí, y no cuando se escriba el controlador.**
   La conciliación es un cruce entre dos padrones, y ese cruce es exactamente el punto donde
   una lectura de catastro empieza a publicar información de rentas sin que nadie lo decida:

   1. **El `acceso` es el de la pantalla que se está mirando.** La operación se declara
      `@RequiereAcceso(acceso = "consulta_fichas", privilegio = Privilegio.LECTURA)`, aunque
      viva en `sgtm-rentas`: es el precedente de `ConsultaPrediosController`, que sirve
      `consulta_predios` desde rentas y declara ese acceso y no otro. El permiso sigue a la
      opción del catálogo, no al módulo Gradle donde acabó el código; si siguiera al módulo,
      ver la consulta de fichas exigiría permiso de rentas y quien atiende catastro se
      quedaría fuera de su propia pantalla.

   2. **Lo que cruza la frontera es el derivado y su ejercicio. Nada de la declaración
      jurada.** La respuesta lleva, por predio, si concilia y a qué ejercicio (y, si se
      publica el «desde cuándo», la fecha de presentación de la declaración que lo sostiene).
      **No** viajan el número de la DJ, ni su tipo, ni sus importes, ni el contribuyente que
      la presentó, ni su identificador. Quien tiene permiso de mirar el catastro no adquiere
      con eso permiso de mirar las declaraciones de nadie: para eso está `declaracion_jurada`,
      con su propio acceso. Es la misma línea que `ConsultaDeDeudaPublica` traza para la deuda
      —el importe, no los asientos—.

   3. **`conciliadaConRentas=No` va detrás de un permiso de fiscalización, y deja rastro.**
      Ese filtro no es un filtro más: **es la lista de los predios que no generan deuda
      predial**, ordenada y paginada. Es el producto de trabajo de la fiscalización de omisos
      (`fisc_omisos`), y en manos equivocadas es también el mapa de a quién no le va a llegar
      recibo. Se sirve solo a quien tenga privilegio de lectura sobre la fiscalización, y cada
      consulta que lo use se registra en la bitácora con operación `ACCESO` —el valor ya
      existe en `auditoria_operacion_check` (V5) y la pantalla `auditoria` ya lo muestra—.
      `Sí` y «Todas» no lo necesitan: dicen quién está dentro, no quién falta.

   4. **Publicar `titularId` o el código de contribuyente en una respuesta de catastro sería
      una decisión aparte, y hoy no está tomada.** Aparece como tentación por un motivo
      legítimo —`FichaEncontradaResource` publica el nombre del titular y no su código, así
      que la fila de la consulta no puede enlazar a su ficha de contribuyente (#322)—, y la
      solución cómoda es añadir el código a esa respuesta «de paso», dentro de este trabajo.
      No se hace así: convierte una consulta de catastro en un extractor de identificadores
      del padrón de contribuyentes para todo el que pueda listar fichas, que son muchos más.
      Si se decide, se decide con su propio issue, diciendo qué permiso lo cubre.

3. **El acto que concilia es registrar la declaración jurada, y hoy el sistema no lo publica.**
   Conciliar no es escribir un código en la ficha —el código ya lo tiene— sino incorporar el
   predio al padrón afecto. Dicho con el estado real, porque la versión anterior de este párrafo
   afirmaba que ese acto «ya tiene opción propia» y mandaba a buscar una puerta que no existe:

   - la opción `declaracion_jurada` es, hoy, **solo `GET`**: el contrato declara
     `GET /rentas/declaraciones/{djNro}` y `DeclaracionJuradaController` publica ese único
     método. Consulta la DJ ya presentada; no la registra;
   - el caso de uso que sí registra —`RegistrarDeclaracionJurada`, con su observación
     obligatoria (regla 10)— **existe en el backend y ningún controlador lo expone**;
   - así que el acto se sigue haciendo **por el procedimiento actual**, fuera del sistema. Es lo
     que dice la franja de la acción apagada («Registra el acto por el procedimiento actual»,
     causa `sin-backend`), y es lo que tiene que decir la interfaz mientras siga siendo cierto.

   «Conciliar seleccionadas», la acción masiva a ciegas del prototipo, no se implementa. El
   patrón `acto` de la composición —la acción primaria lleva a la otra opción **con el predio
   puesto**, como «Actualizar catastro»— **queda pendiente de que exista esa escritura**:
   declararlo ahora llevaría a una pantalla de consulta con un código en la ruta que no sabe qué
   hacer con él. La emisión masiva ya trata al predio sin declaración como *observado*, que es el
   comportamiento correcto.

4. **Nadie escribe en catastro salvo catastro.** ARQ-01 §4 regla 4, entera: «Nadie escribe en
   `catastro` salvo `catastro` y la transferencia de `rentas`, y esa escritura va por el puerto
   público `GestorDeTitularidad` del paquete raíz de catastro». Si algún acto de conciliación
   necesitara tocar el padrón, iría por un puerto así, nunca por SQL directo ni por dependencia
   inversa.

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
  cómo se hace hoy ese acto; la insignia, cuando llegue el dato, lleva texto y nunca solo color
  (FRO-02 §2.1). La franja de actos honestos ya cubre «Conciliar seleccionadas», y el filtro
  `conciliadaConRentas` se dibuja **bloqueado**: vivo garantiza el 422, con cualquier valor.
- **Backend, pendiente** ([#344](https://github.com/hneyra/sgtm/issues/344)): la lectura
  compuesta en `sgtm-rentas` —paginado de fichas con `conciliadoA(ejercicio)` derivado de
  `declaracion_jurada.predio_id` sobre los estados de §1, el filtro, y la frontera de datos y
  permiso de §2—, y retirar el 422 de `ConsultaController` redirigiendo la consulta o
  documentando la operación nueva en `sgtm-v1.yaml`. Ninguna migración.
- **El contrato compartido no se toca hasta que el backend publique**: declarar la ruta sin
  servidor pondría en rojo la prueba de las dos direcciones, a propósito.
