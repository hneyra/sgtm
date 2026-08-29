# FRO-05 — Superficies unificadas

**Decisión de origen:** [`ADR-0014`](../30-arquitectura/adr/ADR-0014-navegacion-centrada-en-la-atencion.md) §4 y §5
**RNF:** RNF-080, RNF-082, RNF-083, RNF-084
**Estrenado en:** Catastro, issue [#391](https://github.com/hneyra/sgtm/issues/391) (PR #404, #405, #406, #408, #409)

Cómo se unifica un módulo cuyas opciones hablan del mismo objeto: qué se hace, qué **no**, y cómo se
demuestra que no se perdió nada. Está escrito para que otro módulo lo siga sin releer el diff de
Catastro.

## 0. Cuándo aplica, y cómo se sabe

No todo módulo lo necesita. El síntoma se mide sobre el catálogo portado, no se intuye: cuenta por
opción su **forma** (pestañas, secciones planas, tabla, hoja), sus **filtros**, sus **campos** y sus
**acciones**. Catastro daba esto:

| | Forma | Filtros | Pestañas | Campos | Acciones |
|---|---|---|---|---|---|
| `ficha_urbana` | pestañas + tabla | 4 | **11** | ~110 | 5 |
| `ficha_economica` | 1 sección plana | 3 | — | 10 | 3 |
| `ficha_bienes` | 1 sección + tabla | 2 | — | 9 | 2 |
| `ficha_rural` | 2 secciones planas | 3 | — | 14 | 3 |

**Cuatro pantallas del mismo objeto con cuatro formas** es el síntoma. Los otros dos que lo
acompañan: varias barras de filtros para buscar lo mismo, y una acción primaria que significa cosas
distintas en dos pantallas seguidas.

Si las opciones de un módulo son objetos distintos —una papeleta y un internamiento no son lo
mismo—, unificarlas es forzar un parecido que no existe. Este documento no es una meta.

## 1. El patrón

**Un componente propio, registrado en `COMPONENTES_PROPIOS` de `Pantalla.tsx` para varias opciones a
la vez.** No una pantalla que absorba a las otras: composición, como el centro de reportes.

```ts
// pantallas/Pantalla.tsx
const COMPONENTES_PROPIOS = {
  sectores: Territorio,          // las dos opciones del territorio
  calles: Territorio,            // caen en el mismo componente
  aranceles: CuadroDeValuacion,  // y las tres de valuación,
  valores_unitarios: CuadroDeValuacion,
  depreciacion: CuadroDeValuacion,
};
```

Las cuatro reglas que lo sostienen, y ninguna es negociable:

1. **Cada opción conserva su id, su ruta y su permiso.** Un enlace guardado sigue cayendo donde
   caía, y el guardia de `Pantalla` decide igual que antes. Las 134 siguen siendo 134.
2. **La hoja activa la decide la ruta, no un `useState`.** Entrar por `/catastro/calles` abre la
   hoja de vías; entrar por `/catastro/sectores`, la del territorio.
3. **Las pestañas son enlaces (`<Link>`), no botones.** Con estado local, quien no tiene permiso
   sobre una hoja llegaría a ella sin pasar por ningún guardia — el servidor contestaría 403, pero
   la pantalla ya habría dibujado su estructura, que es lo que REQ-03 §5 prohíbe. Y el enlace de lo
   que se está mirando se puede compartir.
4. **Una pestaña cuya opción el perfil no puede ver no se dibuja.** Ni apagada: una chip apagada
   dice «esto existe y aquí no se puede», que es información que no se le debe a quien no tiene el
   permiso.

El componente entra por `lazy()`. El presupuesto de arranque es estrecho y una superficie es grande.

## 2. La anatomía: el orden y las ranuras

**Uniformar no es poner los mismos bloques en todas las pantallas.** Es que el orden sea el mismo y
que cada superficie llene las ranuras que tiene. Forzar un bloque donde el backend no publica su
dato obliga a inventarlo, que es lo que [`ADR-0010`](../30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md) §4 prohíbe.

El orden lo impone ya `Pantalla.tsx` (FRO-03 §5):

```
aviso → cabecera-resumen → versionado → filtros → tabla → totales → índice + formulario → acciones
```

- **Cabecera-resumen** — `bloques/CabeceraDeRegistro.tsx`. Toda superficie con un registro abierto
  lo resume arriba: identificador en monoespaciada, insignias con texto, rejilla de datos. El bloque
  no lleva dominio dentro; `catastro/ResumenDeFicha.tsx` es un ejemplo de cómo se construye encima.
- **Versionado** — sólo donde el backend versiona. En el territorio no aplica: `SectorResource` y
  `ViaResource` publican el registro tal como está. En los cuadros de valuación tampoco: no se
  versionan por fecha, se **sellan por conjunto** (ADR-0007), y de eso no publica nada el contrato.
- **Índice de secciones** — toda superficie con secciones declaradas en el catálogo. Una sin
  ninguna no lo lleva, y se comprueba contra el catálogo, no contra una lista escrita a mano.

**Donde una ranura no aplica, se escribe por qué**, opción por opción, en la composición del módulo.
El hueco documentado es la mitad del valor: sin él, el siguiente que pase creerá que se olvidó.

## 3. El vocabulario de acción

> Una primaria por pantalla, **siempre la última, y siempre la que escribe**. Lo que no escribe es
> secundario y va a su izquierda. Una pantalla sin ninguna acción que escriba **no tiene primaria**.

El renderizador toma la última acción del catálogo como primaria (FRO-03 §5), así que sin esta regla
el botón navy acaba siendo «Imprimir» en una pantalla y «Guardar» en la siguiente.

**Los rótulos no se reescriben (RNF-080).** El mecanismo es clasificar y ordenar, en
`pantallas/actos.ts`:

| Familia | Qué es | Qué se hace con ella |
|---|---|---|
| `DE_SALIDA` | imprimir, exportar, limpiar, abrir | secundaria; nunca primaria |
| `DE_MODO` | modificar, editar, deshacer, quitar | **no son actos**: salen de la barra |
| `DE_ALTA` | nuevo | sólo si la opción declara el formulario que abre |
| `DE_CALCULO` | calcular, recalcular, simular, distribuir | secundaria: enseña un resultado antes de escribir |

**Es opt-in por opción** (`VOCABULARIO_UNIFORME`). Reordenar las 134 barras a la vez cambiaría el
botón navy de medio sistema en un solo diff; hay una prueba que exige que las opciones no declaradas
reciban su lista del catálogo intacta.

Y el censo de `actos-honestos.test.tsx` cuenta **la barra que se dibuja**, no la lista cruda del
catálogo: `impedimentoDelActo` promete explicar «la última acción, la misma que dibuja
`BarraDeAcciones`», y con la lista cruda explicaría un botón que ya no existe.

## 4. Un solo buscador

> Se busca en **un** sitio; un registro se **abre** por su ruta.

Cuando cada pantalla del módulo trae su propia barra de filtros, hay tantas formas de buscar el
mismo objeto como pantallas, y ninguna es la evidente. Lo que queda:

- **Sin registro abierto**: el campo que abre el registro y ninguno más, con su control propio donde
  la opción lo declare, y un enlace a la consulta del módulo para lo demás.
- **Con registro abierto**: ninguna barra de búsqueda. El registro está en la ruta.

Antes de quitar filtros, **comprueba si viajaban**. En Catastro no lo hacían: la conexión de las
cuatro fichas mandaba el identificador de la ruta, `historico` y `fecha`, y nada más. Los demás
siguen en el catálogo generado, sin tocar, y así se dice en el javadoc — no se borran de lo
generado ni se finge que se aplican.

## 5. Los grupos, y el plegado del menú

Los grupos por tarea (ADR-0014 §4) se declaran en `frontend/scripts/grupos-por-tarea.mjs`. **Un
grupo por superficie** es el objetivo: un menú que agrupa de una manera y una interfaz que agrupa de
otra son dos mapas del mismo sitio.

Un grupo de **una** opción no agrupa nada. Si te salen, junta.

El plegado tiene **dos marcas, y no significan lo mismo**:

```js
{ plegado: true }   // el menú enseña una entrada, que abre la primera opción visible
{ centro: true }    // pliega igual **y además** dibuja el carril del centro de reportes
```

> Un grupo se pliega cuando **su superficie ya sabe navegar entre sus opciones**. Si además sus
> opciones no tienen otra forma de alcanzarse entre sí, el pliegue lleva carril. Lo primero puede
> darse varias veces en un módulo; lo segundo, una sola: dos carriles serían dos formas de navegar
> lo mismo.

**Antes de plegar, comprueba que la superficie lleva a todas las opciones del grupo.** Plegar las
esconde del menú; si alguna no se alcanza desde dentro, se pierde. En Catastro eso dejó «Predio»
sin plegar, y el motivo no era de interfaz: el reporte de ficha se abre por el código del
contribuyente y ninguna superficie del módulo lo tiene, porque `FichaResource` no lo publica.

**Esa comprobación se recorre, no se afirma:** un BFS que monta cada opción del bloque, recoge los
enlaces descontando la barra lateral, y sigue los nuevos hasta cerrar. Ver
`pantallas/menu-plegado.test.tsx`.

## 6. Cómo se verifica

Además de `yarn verificar`, `yarn comprobar-compilaciones` y `yarn e2e`, **cada propiedad se
demuestra con la mutación que la rompe**: se aplica, se cuenta cuántas pruebas se ponen rojas, y se
restaura por reemplazo de texto. Una mutación que no pone nada rojo es la prueba que falta, no una
prueba de más.

Las que este patrón pide siempre:

| Mutación | Qué defiende |
|---|---|
| La pestaña pasa a `useState` en vez de `<Link>` | Regla 3: el permiso y el enlace compartible |
| Quitar la guarda de permiso de las pestañas | Regla 4 |
| Devolver el orden del catálogo a la barra | §3: la primaria vuelve a ser «Imprimir» |
| Dejar un acto de modo detrás del verbo que guarda | §3: le robaría la primaria |
| La barra de filtros, también con registro abierto | §4 |
| Un bloque de la anatomía con datos que la API no publica | §2 |
| Plegar un grupo cuya superficie no lleva a todas sus opciones | §5 |
| Habilitar la primaria sin observación | Regla 10, RNF-052 |

**Dos avisos que salieron de hacerlo, y ahorran una tarde:**

- Las guardas del portador de catálogo (opción sin grupo, opción en dos grupos) corren **al portar**,
  no en una prueba. Mutar la tabla sin regenerar deja el suite en verde, porque lee el generado.
- Mutar `habilitada` en `BarraDeAcciones` para probar la observación **no muerde**: `apagadaConMotivo`
  gana antes. La guarda real vive en `useEscritura`.

## 7. Lo que Catastro consiguió, en cifras

| | Antes | Después |
|---|---|---|
| Opciones | 12 | 12 (ninguna se pierde) |
| Superficies | 12 | **4** |
| Grupos | 5 | **3** |
| Entradas de menú | 12 | **9** |
| Formas distintas para el mismo objeto | 4 | **1** |
| Vocabularios de acción | 8 | **1** |
| Barras de búsqueda del predio | 5 | **1** |

Y dos defectos que la unificación cerró por construcción, no por revisión: el vocabulario divergente
entre la ficha urbana y su actualización —`03 — ADOBE` frente a `03 — ADOBE / TAPIA`, acabados de
texto libre frente a un desplegable—, y las construcciones dibujadas bajo las cabeceras de la tabla
de direcciones del predio.

---

[`arquitectura-frontend.md`](arquitectura-frontend.md) (FRO-01) ·
[`design-system.md`](design-system.md) (FRO-02) ·
[`mapa-de-pantallas.md`](mapa-de-pantallas.md) (FRO-03) ·
[`estandares-de-codigo-frontend.md`](estandares-de-codigo-frontend.md) (FRO-04)
