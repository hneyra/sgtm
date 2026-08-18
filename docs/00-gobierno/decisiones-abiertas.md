# GOB-02 — Decisiones abiertas

Lo que falta decidir, quién decide y qué queda bloqueado mientras tanto. Una decisión cerrada
sale de esta tabla y entra como ADR o como cambio en el documento que corresponda.

| # | Decisión | Decide | Bloquea | Estado |
|---|---|---|---|---|
| **D-01** | Municipalidad piloto y validador funcional de reglas tributarias | Dirección del proyecto | La primera iteración de negocio completa | Abierta |
| **D-02** | **Valores normativos verificados**: UIT, tramos y alícuotas del predial, deducción del pensionista, tasas de arbitrios, valores unitarios, aranceles, depreciación, valores referenciales vehiculares, porcentajes de multa | Unidad de Rentas del piloto + asesoría legal | **Toda regla de cálculo** | Abierta |
| **D-03** | Escala y modo de redondeo de importes (`numeric(15,2)` provisional; redondeo por céntimo y punto de aplicación) | Rentas + contabilidad | La primera regla de cálculo y el cierre de caja | Abierta |
| **D-04** | Estrategia de migración desde la base SQL Server del sistema actual: alcance, corte, conciliación de saldos | Dirección + TI municipal | Implantación | Abierta |
| **D-05** | Régimen de firma digital de valores, resoluciones y constancias | Asesoría legal | La capa de generación de documentos | Abierta |
| **D-06** | Nombre del claim que lleva la lista de municipalidades autorizadas de un usuario con acceso a varias | Arquitectura + operación de identidad | La verificación de pertenencia en `TenantContextFilter` | Abierta |
| **D-07** | Camino del portal del contribuyente: su token no lleva municipalidad y el contexto sale del objeto consultado | Arquitectura | El portal ciudadano (opción `portal`) | Abierta |
| **D-08** | Retención de la auditoría y del histórico de fichas: años en línea, política de archivado | Rentas + TI | El plan de particionado a largo plazo | Abierta |
| **D-09** | Numeración de valores y expedientes: correlativo por municipalidad y ejercicio, con qué formato y qué reinicio | Rentas del piloto | La emisión de valores | Abierta |
| **D-10** | **Longitud exacta del código de referencia catastral.** La plantilla del manual (`DDPPddSSMMMLLLEEeeppUUU`) da 23 posiciones; los ejemplos del prototipo de interfaz traen 21 | Catastro del piloto | La validación del código y la carga de fichas | Abierta |

## Por qué D-02 bloquea de verdad

No es cautela burocrática. El manual documenta el sistema **como se usa**, no las cifras con que
calcula: las capturas muestran importes de un contribuyente concreto de 2010, no la tabla de
tramos. Implementar el predial con un tramo inventado produce deuda mal determinada en **todo el
padrón**, y su corrección exige anular los valores emitidos y devolver lo cobrado de más.

Mientras D-02 esté abierta:

- Se puede construir el **modelo de datos** de los parámetros (existe: `parametro_tributario`,
  `tabla_valor_unitario`, `arancel`, `depreciacion`, `valor_referencial_vehiculo`).
- Se puede construir el **motor** que los lee, los sella por ejercicio y los aplica.
- **No** se puede escribir ninguna función que devuelva un importe determinado.

## Cómo se cierra una decisión

1. Se documenta la decisión con su fuente (norma, ordenanza, acta) en el documento que
   corresponda; si cambia la arquitectura, como ADR.
2. Se quita la fila de esta tabla, en el mismo PR.
3. Si desbloquea trabajo, se dice en el PR qué queda desbloqueado.
