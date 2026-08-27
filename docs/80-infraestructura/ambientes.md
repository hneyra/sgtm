# INF-03 — Ambientes

| Campo | Valor |
|---|---|
| Versión | 0.1 |
| Fecha | 2026-08-20 |
| Estado | Borrador |
| Decisión de origen | [`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §4 |
| RNF | RNF-076, RNF-077, RNF-079, RNF-090 |

## 1. Los tres ambientes

| Ambiente | Propósito | Topología | Datos | Despliegue |
|---|---|---|---|---|
| **local** | Desarrollo, y las nueve comprobaciones de CI | `docker compose`, un contenedor por pieza | Sintéticos, del repositorio | `docker compose up`, a mano |
| **`stg`** | **Ensayo de la restauración** y último paso antes de `prod` | Un VPS más pequeño, mismo `index.ts` | **Anonimizados**, y la municipalidad marcada como de demostración | `pulumi up` automático al integrar a `main` |
| **`prod`** | La municipalidad de verdad | El VPS (INF-01 §1) | Reales | `pulumi up` **con aprobación manual** |

**Local no es un stack de Pulumi**, y no por falta de ganas: sería una tercera forma de levantar el
sistema que no reemplaza a ninguna de las dos que ya hay
([`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §4). El compose sigue
siendo lo que un desarrollador levanta y lo que
[`despliegue.yml`](../../.github/workflows/despliegue.yml) verifica en cada PR.

**No hay `dev` ni `qa`.** Con un equipo de este tamaño, un ambiente que nadie mira es un ambiente que
se rompe sin que nadie se entere y que además cuesta dinero. `stg` hace de los dos.

## 2. `stg` es donde se ensaya la restauración

Es lo único que justifica pagar un segundo VPS, y es la partida que se recorta primero cuando hay
presión de presupuesto. El motivo para no recortarla es concreto:

**Con un solo nodo, la recuperación no es una promoción: es una restauración** (INF-01 §1.1). Un
procedimiento de restauración que nunca se ejecutó no se sabe si funciona, y el día que haga falta
no es el día de averiguarlo. `stg` es el único sitio donde se puede:

1. Levantar un VPS vacío y llegar a sistema utilizable **solo con `pulumi up`**, sin un paso manual
   que alguien recuerde. Si hace falta un paso manual, aparece aquí y se codifica.
2. Restaurar un respaldo real —anonimizado— **hasta un punto en el tiempo**, y comprobar que lo
   restaurado sirve: que la aplicación arranca contra él, que `verificarAislamiento` pasa como
   `sgtm_app`, y que las cifras del padrón cuadran con las del origen.
3. **Cronometrarlo.** El número que sale de aquí es contra el que se compara RNF-077. Sin él, el
   simulacro se puede declarar exitoso siempre.

> **Un `stg` que fuera un namespace más dentro del VPS de producción no serviría para nada de esto.**
> Lo que se ensaya es perder el nodo; ensayarlo dentro del nodo que se pierde es no ensayarlo.
> Si el segundo VPS no se aprueba, lo que corresponde no es recortar el simulacro y seguir: es
> **escribir que RNF-077 queda sin verificar** y que el RTO es una estimación. Lo que no es
> admisible es no tener `stg` y seguir afirmando un objetivo de recuperación.

RNF-079 dice lo mismo desde el otro lado: **un respaldo que no se ha restaurado no cuenta como
respaldo.** Es el requisito que convierte §2 en obligación y no en buena intención.

## 3. Datos por ambiente

| Ambiente | Origen | Reglas |
|---|---|---|
| local | Semillas sintéticas versionadas en el repositorio | Al menos **dos municipalidades**, o la prueba de aislamiento no verifica nada |
| **`stg`** | **Copia de `prod` anonimizada** | Ver §3.1 y §3.2 |
| `prod` | Reales | |

### 3.1 Nada del padrón real sale de producción sin anonimizar

RNF-090 y la Ley 29733: **datos personales solo anonimizados fuera de producción.** No es una
recomendación, y la tentación es concreta —copiar el volcado tal cual es una tarde menos de
trabajo—.

| Dato | Tratamiento |
|---|---|
| Nombres, apellidos y razón social | Reemplazo por datos ficticios **consistentes**: el mismo contribuyente se llama igual en todas las tablas |
| Documentos de identidad y RUC | Reemplazo manteniendo el formato y el dígito verificador válidos |
| Direcciones y domicilios fiscales | Reemplazo conservando vía, sector y manzana, para que la distribución territorial siga siendo realista |
| Teléfonos y correos | Reemplazo por valores no enrutables |
| Observaciones de auditoría | **Reemplazo**: son texto libre escrito por personas, y ahí acaba cualquier cosa |
| **Importes, áreas, alícuotas y deudas** | **Se conservan** |
| Fechas y estructura de relaciones | Se conservan |

**Por qué se conservan los importes:** son lo que hace útil el ambiente. Una anonimización que altere
los montos impide reproducir un defecto de cálculo y falsea la medición de la emisión masiva. Sin
identidad asociada, un importe no es dato personal.

**Por qué las observaciones sí se reemplazan:** la regla 10 del proyecto obliga a que toda
modificación lleve observación del usuario, así que hay millones de líneas de texto libre. Es el
campo que ninguna anonimización recuerda incluir y el que más probablemente contenga un nombre, un
teléfono o un número de expediente.

Reglas de proceso:

1. La anonimización corre **antes de que los datos salgan de `prod`**, no después de copiarlos. Si
   corre después, ya hubo una copia sin anonimizar en algún disco.
2. El proceso está automatizado y versionado. No es un guion que alguien tiene en su portátil.
3. **Se verifica:** una comprobación busca en `stg` los nombres y documentos de una muestra de `prod`
   y falla si encuentra alguno. Sin esa comprobación, una columna nueva sin anonimizar pasa
   inadvertida —y siempre hay una columna nueva—.
4. Cada refresco deja registro de quién lo ejecutó y cuándo.

El punto 3 es el que suele faltar: la anonimización se escribe una vez y el esquema sigue creciendo.

### 3.2 `stg` es una instalación de demostración, y lo dice en cada documento

La municipalidad de `stg` se da de alta con `es_demostracion = true`, igual que la marcha blanca del
compose. La consecuencia es que **todo documento que `stg` emita sale marcado en los tres formatos**
(issue #122), así que una constancia, un valor o un reporte impreso desde `stg` no se puede
confundir con uno de `prod` ni presentar como tal.

No es una cortesía: mientras D-02a esté abierta, cualquier cifra que el sistema calcule sale de
parámetros que nadie firmó. Que el papel lo diga es la diferencia entre una prueba y algo que
alguien puede intentar cobrar.

## 4. Aislamiento entre ambientes

| Regla | Motivo |
|---|---|
| **Credenciales distintas por ambiente**, sin reutilización de ninguna | Un secreto de `stg` comprometido no puede abrir `prod` |
| Las credenciales de `prod` **solo existen en CI** | [`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §6 |
| **Realm y emisor distintos**: `stg` tiene su propio Keycloak, en su propio dominio | Un token de `stg` no valida contra `prod`, porque el `iss` no cuadra. Es la separación más barata y la más efectiva |
| Cada ambiente tiene su propio motor de datos; ninguno alcanza al del otro por red | |
| **Ninguna salida al mundo real desde `stg`**: correo y notificaciones se registran, no se envían | Una prueba que notifica a contribuyentes reales es un incidente, no un error |
| El almacenamiento de objetos de respaldo es distinto por ambiente | Un `pulumi up` de `stg` mal configurado no puede escribir sobre los respaldos de `prod` |

La última fila es la que protege el escenario que da miedo de verdad: `stg` restaura **leyendo** de
donde `prod` escribe, así que la credencial con que `stg` accede a los respaldos de `prod` es de
**solo lectura**, y sus propios respaldos van a otro sitio.

## 5. Promoción

```
main ──► stg (automatico) ──► prod (aprobacion manual)
```

| Regla | Motivo |
|---|---|
| **Se promueve el mismo artefacto**, no se reconstruye | Reconstruir introduce diferencias que nadie eligió |
| La configuración cambia entre ambientes; **la imagen no** | Es lo que hace que probar en `stg` signifique algo |
| Las tres imágenes —aplicación, migrador e interfaz— se etiquetan por commit | Issue #148 |
| `prod` exige aprobación manual y ventana declarada | INF-01 §1.1: con un solo nodo, desplegar es una ventana |
| **Sin despliegues en ventanas de vencimiento tributario** | Es la regla que más fricción genera y la que más protege |
| Toda liberación tiene una reversión que no ejecuta `pulumi up` | [`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §5 |

## 6. Ciclo de vida y costo

| Ambiente | Disponibilidad | Notas |
|---|---|---|
| local | A demanda | Cuesta cero |
| `stg` | Permanente | Se puede apagar entre simulacros para reducir costo, **pero entonces el simulacro deja de ser periódico y pasa a ser algo que alguien tiene que acordarse de hacer** |
| `prod` | Permanente | |

⚠ Pendiente con el patrocinador: si el costo del segundo VPS es aceptable. La decisión tiene una
sola forma honesta de responderse que no sea «sí», y está en el recuadro de §2.

## 7. Pendientes

- [ ] Escribir y automatizar el proceso de anonimización, con su comprobación (§3.1, punto 3).
- [ ] Fijar la periodicidad del refresco de `stg` desde `prod`.
- [ ] Fijar la periodicidad del simulacro de restauración **contra `stg`** y dónde se anota el
      tiempo (§2). El simulacro del **procedimiento** ya corre en cada PR
      ([`INF-08`](respaldo-y-recuperacion.md) §5); lo que falta es el que mide el RTO con
      volumetría real, y ese necesita el segundo VPS.
- [ ] Confirmar el segundo VPS con el patrocinador (§6).
- [ ] Definir las ventanas de congelamiento del calendario tributario (§5).
- [ ] Decidir de dónde salen las semillas sintéticas de local ahora que el proxy de datos del
      frontend ya tiene un juego propio ([`ADR-0010`](../30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md)).

## 8. Documentos relacionados

[`arquitectura-de-infraestructura.md`](arquitectura-de-infraestructura.md) (INF-01) ·
[`respaldo-y-recuperacion.md`](respaldo-y-recuperacion.md) (INF-08) ·
[`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) ·
[`REQ-02 §Operación`](../20-requisitos/requisitos-no-funcionales.md) ·
[`GOB-04 — Plan de marcha blanca`](../00-gobierno/plan-de-marcha-blanca.md) ·
[Reconstruir el VPS desde cero](../B0-operacion/runbooks/reconstruir-el-vps-desde-cero.md)
— el runbook que se ensaya aquí, en `stg` ·
[`despliegue/README.md`](../../despliegue/README.md)
