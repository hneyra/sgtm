# Valores normativos transcritos

Un archivo por norma. **Aquí no se decide nada: se busca, se transcribe y se firma.**

Es el entregable de [#200](https://github.com/hneyra/sgtm/issues/200) (paquete E-3 de
[GOB-03](../../00-gobierno/plan-de-desbloqueo-D-02.md)), y lo que cierra `D-02a` —los valores de
norma nacional— fila a fila del mapa de [NEG-02 §2](../marco-normativo.md).

Lo comprueba `node docs/10-negocio/verificar-valores-normativos.mjs`, que corre en CI. **No es
documentación: es una comprobación que se pone roja.**

## Por qué un archivo antes que una fila en la base

La doble verificación de [ADR-0007](../../30-arquitectura/adr/ADR-0007-parametros-versionados.md)
empieza en el documento, **antes de que el dato exista como fila**. Un `INSERT` no lleva quién lo
transcribió, quién lo verificó ni de qué página de El Peruano salió; un archivo sí, y queda en el
historial de git con su revisión.

Por eso **este directorio no carga nada**. Cargar es un paso posterior y de otro actor: el proceso
batch de publicación, con la credencial de `rol_carga_parametros` y el derivado de
[`publicacion/`](publicacion/) delante (#188,
[ADR-0017](../../30-arquitectura/adr/ADR-0017-tablas-de-valuacion-nacionales.md)). La comprobación lo
vigila: si aparece un `INSERT` de valores normativos en una migración, se pone roja.

## La cabecera obligatoria

Los ocho campos, todos:

| Campo | Qué lleva |
|---|---|
| `Norma` | El nombre completo, como se cita |
| `Artículo` | El artículo o anexo exacto. Sin artículo no hay cifra |
| `Publicada` | `AAAA-MM-DD`, y dónde |
| `Ejercicios que rige` | `desde–hasta`, o `desde–` si sigue vigente |
| `Filas de NEG-02 §2` | Los números de fila del mapa que este archivo cierra |
| `Transcribió` | `Nombre, AAAA-MM-DD` |
| `Verificó` | `Nombre distinto, AAAA-MM-DD`, o `—` mientras no se haya verificado |
| `Estado` | `TRANSCRITO` o `VERIFICADO` |

**`Transcribió` y `Verificó` no pueden ser la misma persona.** Es la única regla de este directorio
que no protege contra un descuido sino contra un atajo: quien transcribe ya leyó la norma con una
expectativa, y releerse a uno mismo no es verificar. `VERIFICADO` con un solo nombre se rechaza.

**`Filas de NEG-02 §2` es lo que hace comprobable el tercer criterio de #200.** Sin ella, «toda fila
asignada a `D-02a` apunta al archivo que la cierra» habría que creérselo; con ella se comprueba en
las dos direcciones, como el mapa y como el contrato de la API: una fila que no existe, o que ya
reclamó otro archivo, pone esto en rojo.

## Las tres secciones fijas

1. **La tabla tal como está en la norma.** Sin reordenar, sin convertir unidades, sin «arreglar» un
   encabezado raro. Si la norma pone el porcentaje en una columna que se llama `%`, aquí se llama
   `%`. Lo que se transcribe es la norma, no la interpretación de la norma.
2. **Cómo entra al sistema.** El `tipo` y la `clave` de `parametro_tributario`, o la tabla
   específica. Es lo que convierte el documento en la fila del derivado de [`publicacion/`](publicacion/)
   que el proceso batch publica.
3. **Qué no cabe hoy.** Donde se anota lo que el esquema todavía no puede guardar. Sigue habiendo
   dos casos vivos, y los dos salieron de intentar la carga: a `depreciacion` le falta el **uso de
   la edificación** —el Anexo I publica cuatro tablas— y al cuadro de valores unitarios le faltan la
   segunda firma y las otras tres regiones (GOB-03, H-14 y H-15). Lo de confirmar sus cifras contra
   el Anexo I.2 real ya se hizo, el 2026-08-28, y el cotejo cambió el cuadro entero: **la norma tiene
   3 partidas, no las 7 que el archivo transcribía**. Una sección vacía se escribe «Nada», no se
   borra: que esté vacía es información.

## El libro mayor

La comprobación imprime cuántas filas del mapa siguen **sin archivo**, por parte:

```
Valores normativos: 0 archivos, 29 filas del mapa sin archivo
  D-02a: 14 sin archivo — bajar este numero es D-02a cerrandose
  ...
```

Bajar el número de `D-02a` **es** el progreso de #200. Subirlo sin querer se ve.

## Qué hacer al añadir un archivo

Copiar `_plantilla.md`, rellenarlo entero y correr la comprobación. Los archivos que empiezan por
`_` no se escanean: la plantilla y las muestras viven ahí a propósito.

Y **una cifra no se carga en la base porque el archivo exista**. El archivo cierra la búsqueda; la
carga es otro acto, con otra credencial, y su entrada es el derivado de
[`publicacion/`](publicacion/), no este archivo.
