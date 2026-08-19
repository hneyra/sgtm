# GOB-02 — Decisiones abiertas

Lo que falta decidir, quién decide y qué queda bloqueado mientras tanto. Una decisión cerrada
sale de esta tabla y entra como ADR o como cambio en el documento que corresponda.

| # | Decisión | Decide | Bloquea | Estado |
|---|---|---|---|---|
| **D-01** | Municipalidad piloto y validador funcional de reglas tributarias | Dirección del proyecto | La primera iteración de negocio completa | Abierta |
| **D-02a** | **Valores normativos de norma nacional**: UIT, tramos y alícuotas del predial (TUO LTM art. 13), mínimo imponible, deducción del pensionista (art. 19), adulto mayor no pensionista (Ley 30490), inafectaciones (art. 17), deducciones por uso (art. 18), plazos de pago (art. 15), cuadro de valores unitarios, tabla de depreciación, valores referenciales vehiculares. **No se decide: se busca, se transcribe y se firma** | Asesoría legal | El predial, el vehicular y la alcabala | Abierta — **no depende de D-01** |
| **D-02b** | **Valores de ordenanza local**: tasas de arbitrios por sector y uso, criterios de distribución del costo, calendario de vencimientos, derecho de emisión, descuento por pago adelantado, CUIS, inafectaciones de arbitrios. Cada uno **con su acuerdo de ratificación provincial**: sin ratificación no habilita emisión (ARQ-09 §2.4, riesgo R-04) | Rentas del piloto | Arbitrios y sanciones administrativas | Abierta — **bloqueada por D-01** |
| **D-02c** | **Valores del resto de tributos y del procedimiento**: espectáculos, anuncios, interés moratorio, reajuste, prescripción, costas y gastos coactivos, tabla de infracciones de tránsito, multa tributaria | Rentas + asesoría legal | Espectáculos, anuncios, cobranza y coactiva | Abierta — parcialmente bloqueada por D-01 |
| **D-03a** | **Escala de cálculo intermedio.** Casi decidida de hecho: `../srtm/docs/40-datos/ddl/esquema-verificado.sql` ya define `monto_calc numeric(18,6)` frente a `dinero numeric(15,2)`. Falta **ratificarlo**, no inventarlo | Arquitectura + contabilidad | La primera regla de cálculo | Abierta — trámite |
| **D-03b** | **Modo de redondeo**: `HALF_UP` frente a `HALF_EVEN` | Rentas + contabilidad | La primera regla de cálculo | Abierta — decisión limpia |
| **D-03c** | **Los puntos donde se redondea.** <b>No es una decisión: es ingeniería inversa.</b> M02 reveló el «metrado redondeado» de obras complementarias, es decir que el SRTM del MEF **redondea en pasos intermedios**, no solo al cierre de cada regla como asumía ARQ-09 §1.4. Nadie puede decidir en qué puntos redondea un sistema ajeno: hay que inventariarlo observándolo. Ver §Cómo se cierra D-03c | Rentas, con acceso al SRTM del MEF | `CAL-02` y la primera regla de cálculo | Abierta — **es la que bloquea** |
| **D-03d** | **Redondeo del importe a pagar en el cierre de caja**, que puede no ser el del cálculo | Tesorería + contabilidad | El cierre de caja | Abierta |
| **D-04** | Estrategia de migración desde la base SQL Server del sistema actual: alcance, corte, conciliación de saldos | Dirección + TI municipal | Implantación | Abierta |
| **D-05** | Régimen de firma digital de valores, resoluciones y constancias | Asesoría legal | La capa de generación de documentos | Abierta |
| **D-06** | Nombre del claim que lleva la lista de municipalidades autorizadas de un usuario con acceso a varias | Arquitectura + operación de identidad | La verificación de pertenencia en `TenantContextFilter` | Abierta |
| **D-07** | Camino del portal del contribuyente: su token no lleva municipalidad y el contexto sale del objeto consultado | Arquitectura | El portal ciudadano (opción `portal`) | Abierta |
| **D-08** | Retención de la auditoría y del histórico de fichas: años en línea, política de archivado | Rentas + TI | El plan de particionado a largo plazo | Abierta |
| **D-09** | Numeración de valores y expedientes: correlativo por municipalidad y ejercicio, con qué formato y qué reinicio | Rentas del piloto | La emisión de valores | Abierta |
| **D-10** | **Longitud exacta del código de referencia catastral.** La plantilla del manual (`DDPPddSSMMMLLLEEeeppUUU`) da 23 posiciones; los ejemplos del prototipo de interfaz traen 21 | Catastro del piloto | La validación del código y la carga de fichas | Abierta |
| **D-11** | **Origen y valor de los cuatro factores sin fuente** que reveló el manual M02 del MEF (`../srtm` NEG-05 §0.1): deducción de Amazonía, `% actualización`, incremento del 5 % sobre el valor unitario **antes** de depreciar, y factor de oficialización de obras complementarias. Los cuatro multiplican o restan sobre importes | Rentas del piloto + asesoría legal | `RT-002`, `RT-005` y `RT-011`; se suma a D-02a | Abierta |
| **D-12** | **Qué pasa con el autovalúo cuya titularidad no llega a 100 %.** El esquema ya admite titularidad parcial —valida «no excede 100», como el SRTM del MEF—; falta decidir si la porción sin titular identificado se determina a alguien o simplemente no se cobra | Rentas + asesoría legal | La base imponible del predial (`RT-011`) | Abierta |

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

- **D-02a** son normas nacionales publicadas. **Se pueden cerrar hoy**, sin municipalidad piloto.
- **D-02b** exige la ordenanza del piloto *y* su ratificación provincial. No se puede empezar.
- **D-02c** está en medio.

Mientras fueran la misma decisión, lo que se podía hacer esperaba por lo que no. La partición no
cierra nada: hace visible qué está esperando a qué.

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
