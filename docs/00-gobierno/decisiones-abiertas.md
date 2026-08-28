# GOB-02 — Decisiones abiertas

Lo que falta decidir, quién decide y qué queda bloqueado mientras tanto. Una decisión cerrada
sale de esta tabla y entra como ADR o como cambio en el documento que corresponda.

| # | Decisión | Decide | Bloquea | Estado |
|---|---|---|---|---|
| **D-01** | Municipalidad piloto y validador funcional de reglas tributarias. **Municipalidad piloto: Municipalidad Distrital de Catacaos** (decidido 2026-08-24 por Dirección del proyecto, en reemplazo de la Municipalidad Distrital de Chala que se había decidido el 2026-08-23). El validador funcional de reglas tributarias sigue sin nombrarse | Dirección del proyecto | La primera iteración de negocio completa | Abierta — **la municipalidad ya no bloquea** D-02b/E-6 (#202); el validador funcional, pendiente |
| **D-02b** | **Lo que fija una ordenanza de la municipalidad en materia tributaria**, con su **acuerdo de ratificación provincial** cuando la emite una distrital: filas 11-14, 18, 19, 25, 28 y 29 del mapa —arbitrios y sus criterios de distribución, descuento por pago adelantado, inafectaciones, anuncios, TIM, CUIS, interés y máximo de cuotas del fraccionamiento, y derecho de trámite del TUPA—. Sin ratificación no habilita emisión (ARQ-09 §2.4, riesgo R-04) | Rentas del piloto | #189, #191, #196, #197, #199 | Abierta — **la municipalidad ya está elegida (Catacaos, D-01)**; falta su ordenanza y la ratificación provincial (E-6, #202 sigue abierto por eso). **#33 la deja acotada en caja**: la cobranza registra qué campaña se declaró en `recibo.campania_beneficio` y cobra el importe **íntegro**; el día que la ordenanza se firme, el descuento se aplica sin cambiar la selección de deudas ni el recibo. **#35 la deja acotada en el fraccionamiento por el mismo camino**: el interés y el máximo de cuotas entran como **parámetro** desde el conjunto sellado (`INTERES_FRACCIONAMIENTO`, `CUOTAS_MAXIMAS_FRACCIONAMIENTO`), el convenio guarda de qué conjunto salieron, y **falta el parámetro ⇒ falla la operación** nombrando la llave; el gasto administrativo de la cuota queda en cero con su columna esperando. El mecanismo entero —preconvenio, formalización, acogimiento, quiebre— está construido y probado sin ninguna cifra dentro. **#72 la deja acotada en la simulación del acogimiento a una campaña de beneficio** (`consulta_deudas_beneficio`): la campaña, el porcentaje que condona, **sobre qué parte de la deuda se aplica** y con qué escala y modo se redondea el descuento entran como parámetro del conjunto sellado —`BENEFICIO:‹CAMPAÑA›` (valor numérico = alícuota, valor texto = base) y `BENEFICIO_REDONDEO:‹CAMPAÑA›` (valor numérico = escala, valor texto = modo)—; **el catálogo de campañas es el propio dato**, así que sin ninguna publicada la lista sale vacía y simular contra una responde **422 nombrando la llave que falta** |
| **D-02c** | **Lo que fija un acto propio de la municipalidad que no es ordenanza tributaria ratificada**: filas 23 y 26 del mapa —arancel de costas coactivas ‹confirmar quién lo aprueba› y descuentos por pronto pago de papeletas—. Ni se busca en El Peruano ni se ratifica: hay que producirlo | Rentas + asesoría legal | #193, #195, #196 | Abierta — la municipalidad ya está elegida (Catacaos, D-01); falta producir el acto propio. **#72 la deja acotada por el mismo camino que D-02b**: un descuento por pronto pago se publica como una campaña más del conjunto sellado (`BENEFICIO:‹CAMPAÑA›`), y mientras el acto no exista la pantalla lo dice en vez de suponer un porcentaje |
| **D-03a** | **Escala de cálculo intermedio.** Casi decidida de hecho: `../srtm/docs/40-datos/ddl/esquema-verificado.sql` ya define `monto_calc numeric(18,6)` frente a `dinero numeric(15,2)`. Falta **ratificarlo**, no inventarlo | Arquitectura + contabilidad | La primera regla de cálculo | Abierta — trámite |
| **D-03b** | **Modo de redondeo**: `HALF_UP` frente a `HALF_EVEN` | Rentas + contabilidad | La primera regla de cálculo | Abierta — decisión limpia |
| **D-03c** | **Los puntos donde se redondea.** <b>No es una decisión: es ingeniería inversa.</b> M02 reveló el «metrado redondeado» de obras complementarias, es decir que el SRTM del MEF **redondea en pasos intermedios**, no solo al cierre de cada regla como asumía ARQ-09 §1.4. Nadie puede decidir en qué puntos redondea un sistema ajeno: hay que inventariarlo observándolo. Ver §Cómo se cierra D-03c | Rentas, con acceso al SRTM del MEF | `CAL-02` y la primera regla de cálculo | Abierta — **es la que bloquea**. El tipo que puede expresar la respuesta ya existe (`PuntoDeRedondeo`, `PoliticasDeRedondeo`): catorce puntos candidatos, ninguno con política, y el cálculo que pida uno sin parametrizar **falla** en vez de no redondear |
| **D-03d** | **Redondeo del importe a pagar en el cierre de caja**, que puede no ser el del cálculo | Tesorería + contabilidad | El cierre de caja | Abierta |
| **D-04** | Estrategia de migración desde la base SQL Server del sistema actual: alcance, corte, conciliación de saldos | Dirección + TI municipal | Implantación | Abierta |
| **D-05** | Régimen de firma digital de valores, resoluciones y constancias | Asesoría legal | La capa de generación de documentos | Abierta — **no bloquea la emisión**. `PuntoDeFirma` (sgtm-plataforma) es el enganche, entre generar los bytes y entregarlos, y `GeneradorDeDocumentos.generarFirmado` pasa por él en cada emisión; su implementación por omisión devuelve el documento sin tocar. #41 lo estrena con la REC-1 y la REC-2: salen **sin firma digital** y son imprimibles igual, con el bloque de firmas manuscritas del ejecutor y del auxiliar en el pie. Cerrar D-05 será dar una implementación de esa interfaz, no repasar los sitios que emiten |
| **D-06** | Nombre del claim que lleva la lista de municipalidades autorizadas de un usuario con acceso a varias | Arquitectura + operación de identidad | La verificación de pertenencia en `TenantContextFilter` | Abierta |
| **D-07** | Camino del portal del contribuyente: su token no lleva municipalidad y el contexto sale del objeto consultado | Arquitectura | El portal ciudadano (opción `portal`) | Abierta |
| **D-08** | Retención de la auditoría y del histórico de fichas: años en línea, política de archivado | Rentas + TI | El plan de particionado a largo plazo | Abierta |
| **D-09** | Numeración de valores y expedientes: correlativo por municipalidad y ejercicio, con qué formato y qué reinicio | Rentas del piloto | La emisión de valores | Abierta — **no bloquea**, porque el formato está afuera. `valor_correlativo` (V26), `convenio_correlativo` (V31) y `expediente_correlativo` (V33) garantizan que el correlativo no se repita ni salte; la **composición** del número del expediente coactivo es un parámetro (`PlantillaDeNumeroDeExpediente`, #40), con `EXP-{ejercicio}-{correlativo:6}` por omisión y el correlativo desnudo guardado aparte, de modo que cerrar D-09 sea cambiar la plantilla y no migrar la columna. Mismo precedente que D-10 con `ComposicionCatastral` |
| **D-10** | **Longitud exacta del código de referencia catastral.** La plantilla del manual (`DDPPddSSMMMLLLEEeeppUUU`) da 23 posiciones; los ejemplos del prototipo de interfaz traen 21 | Catastro del piloto | La validación del código y la carga de fichas | Abierta |
| **D-11** | **Origen y valor de los cuatro factores sin fuente** que reveló el manual M02 del MEF (`../srtm` NEG-05 §0.1): deducción de Amazonía, `% actualización`, incremento del 5 % sobre el valor unitario **antes** de depreciar, y factor de oficialización de obras complementarias. Los cuatro multiplican o restan sobre importes | Rentas del piloto + asesoría legal | `RT-002`, `RT-005` y `RT-011`; se suma a D-02a | Abierta |
| **D-12** | **Qué pasa con el autovalúo cuya titularidad no llega a 100 %.** El esquema ya admite titularidad parcial —valida «no excede 100», como el SRTM del MEF—; falta decidir si la porción sin titular identificado se determina a alguien o simplemente no se cobra | Rentas + asesoría legal | La base imponible del predial (`RT-011`) | Abierta |
| **D-14** | **La regla de imputación de un pago parcial**: qué parte de la deuda extingue —insoluto, reajuste, interés o gasto, y en qué orden entre obligaciones—. Es normativa (TUO del Código Tributario, art. 31), no una decisión de diseño: hay que transcribirla y firmarla, no elegirla. **#33 la declinó** para `A_CUENTA` y **#35 la vuelve a declinar** para `CUOTA_CONVENIO`, con la consecuencia que hace segura la omisión: mientras la caja rechace los dos tipos, ningún pago parcial entra, y por eso el quiebre de un convenio nunca tiene que repartir nada —devuelve lo pendiente entero, que es exactamente lo acogido— | Rentas + asesoría legal | `TipoDePago.A_CUENTA` y `TipoDePago.CUOTA_CONVENIO`; con ellos, el cobro de cuotas del convenio y su seguimiento real | Abierta — no bloquea el ciclo de vida del convenio, que está completo y probado sin ella |
| **D-13** | **Ámbito de las tres tablas de dato nacional — dos argumentos en tensión real, ninguno descartable a la ligera.** `valor_unitario_edificacion`, `depreciacion` y `valor_referencial_vehiculo` llevan hoy `municipalidad_id NOT NULL`, y desde H-5 (GOB-03) cuelgan además de `conjunto_id` (V17 #141, V18 #17): cada municipalidad posee su propia copia dentro de su propio conjunto sellado. (a) ARQ-09 §2.1 clasifica valores unitarios y tabla vehicular como **Nacional → `municipalidad_id` nulo, cargado una vez para todas** —como ya hace `parametro_tributario`—, y cargar el cuadro del MEF una vez por municipalidad admite que dos tenants tengan copias divergentes del mismo cuadro (H-5). (b) Pero `LectorDeParametros` —la abstracción que ya construyeron V17/V18, y que **no** se rediseña sin más— defiende explícitamente el modelo actual en su propio javadoc: nombra `valor_referencial_vehiculo` junto a `arancel` como «datos normativos que no caben en `ParametrosSellados`... esa tabla cuelga del conjunto, no del ejercicio», agrupándolo con `arancel`, que sí es correctamente municipal. No es deriva accidental: es una simplificación deliberada y ya escrita, en tensión real con §2.1. Intentar «plegar en `parametro_tributario`» (2026-08-25) exige además construir desde cero la conexión de `rol_carga_parametros` —no existe para ninguna tabla, ni siquiera UIT— y retirar código probado de #17 (`TablasDeValuacion.cargarValorUnitario`/`cargarDepreciacion`, 5 pruebas verdes). Se paró ahí a propósito: revisar ARQ-09 §2.1 contra el javadoc de `LectorDeParametros` con más calma antes de tocar el esquema | Arquitectura | La **carga** de lo que E-3 (#200) transcriba, no su transcripción | Abierta — no bloquea empezar E-3 |

## Por qué D-02 bloquea de verdad

No es cautela burocrática. El manual documenta el sistema **como se usa**, no las cifras con que
calcula: las capturas muestran importes de un contribuyente concreto de 2010, no la tabla de
tramos. Implementar el predial con un tramo inventado produce deuda mal determinada en **todo el
padrón**, y su corrección exige anular los valores emitidos y devolver lo cobrado de más.

Mientras D-02 esté abierta —cualquiera de sus tres partes—:

- Se puede construir el **modelo de datos** de los parámetros (existe: `parametro_tributario`,
  `tabla_valor_unitario`, `arancel`, `depreciacion`, `valor_referencial_vehiculo`).
- Se puede construir el **motor** que los lee, los sella por ejercicio y los aplica (existe).
- **No** se puede escribir ninguna función que devuelva un importe determinado.

### Por qué está partida en tres

Era una sola fila que cubría ~27 datos de siete tributos, y por eso bloqueaba en bloque. Pero los
tres grupos tienen responsables y bloqueos distintos:

- **D-02a** son normas nacionales publicadas. **Cerrada el 2026-08-25** ([#200](https://github.com/hneyra/sgtm/issues/200)):
  los 14 archivos de [`valores-normativos/`](../10-negocio/valores-normativos/) están `VERIFICADO`,
  con segunda firma distinta cada uno. Cerrar la firma no habilita todavía escribir una regla con
  cifra real: la carga a la base sigue esperando D-13 (para las tres tablas de valuación)
  —el mecanismo que invoca `AdministrarParametros.abrirVersion` contra un ambiente real ya existe
  desde [#247](https://github.com/hneyra/sgtm/issues/247) §2: el proceso batch
  `AbrirConjuntoDeParametros` y su guion `infra/carga-de-datos/abrir-conjunto-parametros.sh`—, y casi toda
  regla del predial sigue esperando además D-03c y D-11 (H-12, [GOB-03](plan-de-desbloqueo-D-02.md) §0.6).
- **D-02b** exige la ordenanza del piloto *y* su ratificación provincial. No se puede empezar.
- **D-02c** está en medio.

Mientras fueran la misma decisión, lo que se podía hacer esperaba por lo que no. La partición no
cierra nada: hace visible qué está esperando a qué.

**La partición ya es una función**, y no lo era: el criterio no es el tributo sino **quién produce
el valor**, y está escrito en [NEG-02 §2.1](../10-negocio/marco-normativo.md) con las 29 filas
asignadas una por una. Al construir el mapa, cuatro datos cambiaron de parte —espectáculos,
prescripción y plazos, y la tabla de infracciones de tránsito pasaron de `D-02c` a `D-02a`; los
anuncios y la TIM, a `D-02b`— y dos que no tenían fila la ganaron. El saldo práctico: **cuatro
datos más se pueden buscar hoy, sin piloto**, y `#192` deja de esperar a D-01.

Las etiquetas del tablero salen de ahí, y `docs/10-negocio/verificar-mapa-normativo.mjs` comprueba
en las dos direcciones que sigan diciendo lo mismo.

**Lo único de D-02 que no se resuelve buscando es D-11**, los cuatro factores sin fuente. Ahí sí
hay una decisión: si la fuente no aparece, ¿se implementan igual, se omiten, o se bloquea la
emisión? Los cuatro multiplican o restan sobre importes, así que omitir uno **no es neutro**.

## Cómo se cierra D-03c

Hay una circularidad que conviene ver antes de planificarlo. ARQ-09 §7 dice que esta decisión
bloquea `CAL-02`, y `CAL-02` es precisamente el contraste contra el SRTM del MEF:

> Toda diferencia en el contraste contra el SRTM será indistinguible de un error de regla.

No se puede usar el mismo contraste para **descubrir** los puntos de redondeo y para **validar**
las reglas. Se rompe en dos pasos:

1. Obtener determinaciones del SRTM del MEF **con su desarrollo intermedio visible** —M02 muestra
   que la pantalla de determinación lo trae— y ajustar los puntos contra ese desarrollo.
2. Correr `CAL-02` como validación, **sobre un juego de predios distinto**.

## Dos casillas que M02 ya cerró

`../srtm` NEG-05 §6 las sigue listando como pendientes de confirmar, y ya no lo están:

- **La base del predial es por contribuyente y no por predio.** NEG-05 §0.1: «Deja de ser
  hipótesis». La grilla «detalle de los predios» del SRTM vive dentro de una única determinación.
- **La fecha de referencia** son las características del predio vigentes al 1 de enero.

Las dos están implementadas: `ReglaDeAgregacion` y `RangoDeEjercicios` en `sgtm-parametros`.

## Cómo se cierra una decisión

1. Se documenta la decisión con su fuente (norma, ordenanza, acta) en el documento que
   corresponda; si cambia la arquitectura, como ADR.
2. Se quita la fila de esta tabla, en el mismo PR.
3. Si desbloquea trabajo, se dice en el PR qué queda desbloqueado.
