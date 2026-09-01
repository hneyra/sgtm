# Cómo se porta un artboard a este frontend

El diseño vive en `design/design-sgtm/SGTM Redesign/*.dc.html`. **Ese archivo es la
especificación.** No se interpreta, no se «mejora», no se resume: se porta.

Cada `.dc.html` es un componente con `state`, `props` y un `renderVals()` que devuelve
los enlaces de una plantilla HTML con estilos **en línea**. Eso mapea casi 1:1 a React.

## Reglas de la portada

1. **Los estilos en línea del artboard se copian tal cual**, traducidos a `style={{}}`
   de React (`font-size:13.5px` → `fontSize: 13.5`). Ni un valor redondeado, ni un
   `padding` «que queda mejor». Si el artboard dice `padding:15px 16px 17px`, va así.
2. **Los textos se copian letra por letra**, con sus tildes, sus comillas angulares
   «» y sus rayas —. La prosa del rediseño es parte del diseño.
3. **Los datos de muestra se copian enteros**, con todas sus filas. Si el artboard
   declara 18 papeletas, van las 18. Van a `src/datos/<modulo>.ts`.
4. **Las cifras derivadas se derivan**, no se copian. Si el artboard suma una columna
   o calcula un porcentaje, el port hace la misma cuenta.
5. **Todos los destinos se implementan.** Un destino que el panel lista y la pantalla
   no dibuja es la mitad del trabajo.
6. `sc-if` → `{cond && ...}` · `sc-for` → `.map()` · `onClick="{{ f }}"` → `onClick={f}`
   · `style-hover="background:var(--accent-soft)"` → `className="hov-acento"`.
7. **Nada se conecta a ningún backend.** No hay `fetch`. Los datos son del módulo.
   Las acciones que escribirían llaman a `toast('…')` con el mismo texto del artboard.

## Lo que ya está hecho y se reutiliza

```
src/shell/Shell.tsx        El riel, el panel de destinos, la cabecera, la barra de
                           contexto, la paleta de comandos (Ctrl-K) y el toast.
src/shell/modulos.ts       El registro: destinos, pastillas, acción primaria, sesión.
src/shell/preferencias.ts  usarPreferencias() → { pref, fijar, toast, ir }
                           soles(n) · miles(n) · pct(n)
src/ds/Icono.tsx           <Icono d={ICO.lupa} tam={15} />
src/ds/iconos.ts           ICONOS (riel) e ICO (surtido común, ~40 trazos).
src/ds/componentes.tsx     Insignia · tonoDe · Seccion · Boton · Campo · Entrada ·
                           Selector · AreaDeTexto · Rejilla · Tabla · Entradilla ·
                           Kpi · Barra · FilaDeLista · Aviso · Pestanias · Dato ·
                           Codigo · Eyebrow · Nota · Esqueleto
src/ds/global.css          Los estilos globales y las clases `hov-*`.
```

**El shell no se reescribe.** Un módulo devuelve:

```tsx
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';

export default function Catastro({ dest, onDest }: PantallaProps) {
  return (
    <Shell modulo="catastro" dest={dest} onDest={onDest}
           miga={['Catastro', 'Predios']} titulo="Padrón de predios"
           contexto={ficha ? { volver: {...}, codigo, titular, ubic, estado } : undefined}
           paleta={ENTRADAS_DE_PALETA}>
      {dest === 'panel' && <Panel />}
      {dest === 'predios' && <Predios />}
      …
    </Shell>
  );
}
```

`miga` y `titulo` cambian con el destino: se calculan igual que en el artboard.

## Si un primitivo compartido no encaja

Se escribe el bloque a mano con estilos en línea, como en el artboard. **Antes se
prefiere lo literal que lo abstracto**: el objetivo es que la pantalla se vea idéntica,
no que el código sea corto. Un primitivo nuevo se añade a `componentes.tsx` solo si
tres pantallas lo repiten.

## Idioma

Español en el dominio, inglés en lo técnico. **Sin tildes en identificadores**:
`alicuota`, nunca `alícuota`. Comentarios en español, y solo donde expliquen un porqué
que el código no dice.

## Comprobar antes de dar por hecho

```bash
cd frontend
npx tsc -b --noEmit      # tiene que salir limpio
npx vite build           # tiene que construir
```

## La entidad es Catacaos, no Sullana

El artboard escribe «Municipalidad Provincial de Sullana» y su acrónimo `MPS` en los
números de documento y de ordenanza. **En el port es la Municipalidad Distrital de
Catacaos** —la municipalidad piloto—, así que:

- `Municipalidad Provincial de Sullana` → `Municipalidad Distrital de Catacaos`
  (y el nombre lo pone el shell desde `pref.entidad`: no se escribe a mano).
- El acrónimo `MPS` de un número —`MPS-2026-041182`, `Ordenanza 012-2026-MPS`— pasa a
  `MDC`. Es el mismo cambio en todos los módulos y hay que hacerlo en los datos.
- «Sullana» suelto en una dirección o en prosa pasa a «Catacaos».

## Ver lo que se dibuja, no suponerlo

```bash
yarn dev                                        # deja la vista previa levantada
SGTM_BASE=http://localhost:5181 yarn mirar catastro   # solo un módulo
```

Recorre cada destino del módulo en Chromium, guarda una captura en `.capturas/` y
**falla si alguna pantalla deja el `<main>` prácticamente vacío**, que es como falla de
verdad una pantalla a medio portar: en silencio, sin un solo error de consola.

Mirar las capturas es parte del trabajo. Una pantalla que compila y no se parece al
artboard no está portada.

## Dos ranuras del shell que quizá necesites

Salieron de portar Tesorería y Licencias, y las usan cinco artboards:

```tsx
<Shell …
  tarjeta={<TarjetaDelTurno />}          // el bloque entre la cabecera del panel
                                          // y el botón de acción: turno de caja,
                                          // cartera del ejecutor, aviso de plazo
  contexto={{ volver: {…}, codigo, titular,
              derecha: <>…</> }}          // acciones o una segunda pastilla a la
                                          // derecha de la barra de contexto
>
```

Las dos son opcionales y aditivas: lo que ya funcionaba sigue igual. **Si tu artboard
dibuja una tarjeta en el panel o algo a la derecha de la barra de contexto, ahora se
puede portar literal** — no lo dejes fuera.

## Un defecto que solo aparece al integrar

**La ruta de la aplicación vive en el hash** (`#/transito/padron`), así que un
`<a href="#intervencion">` del artboard —el índice lateral de un expediente, por
ejemplo— **saca del módulo y cae en Inicio, sin ningún error**. Lo encontró el port de
Tránsito.

En un ancla interna: `onClick` con `preventDefault()` y `scrollIntoView`. Comprueba
después que el hash sigue donde estaba.
