# `frontend/` — el back-office del SGTM

React 19 sobre Vite, TypeScript. **Implementa el rediseño de
[`design/design-sgtm/`](../design/design-sgtm/)**: los doce módulos del catálogo —134
opciones del manual— resueltos como cuatro a seis *destinos* por módulo sobre un mismo
shell.

**Aquí no hay backend.** Todos los datos son de muestra y viven en `src/datos/`. No hay
un solo `fetch`: lo que en el sistema real escribiría, aquí enseña un aviso con el
mismo texto que el artboard.

```bash
yarn install
yarn dev        # http://localhost:5180
yarn build      # tsc + vite build
yarn verificar  # solo los tipos
yarn mirar      # recorre las 65 pantallas en Chromium y guarda una captura de
                # cada una en .capturas/; falla si alguna da un error de consola
                # o si el <main> se queda en blanco (que es como falla de verdad
                # una pantalla sin conectar: en silencio)
```

`yarn mirar` necesita la vista previa levantada; si no está en el 5180, se le dice
con `SGTM_BASE=http://localhost:5181 yarn mirar`.

## Cómo está armado

```
src/
  ds/                 El sistema de diseño «Juris PE»
    tokens/*.css      Los tokens tal cual vienen del diseño: color, tipografía,
                      espaciado y las tres familias de Google Fonts
    global.css        El bloque <helmet> que los trece artboards repiten, unido
    Icono.tsx         Un icono es una lista de trazos sobre 24×24
    iconos.ts         ICONOS (el riel) e ICO (~40 trazos compartidos)
    componentes.tsx   Insignia · Seccion · Boton · Campo · Tabla · Kpi · Barra ·
                      FilaDeLista · Aviso · Pestanias · Dato · Codigo · Esqueleto…
  shell/
    Shell.tsx         Riel de 68 px · panel de destinos de 246 px · cabecera
                      pegajosa · barra de contexto · paleta de comandos (Ctrl-K)
    modulos.ts        El registro de los doce módulos: destinos, pastillas,
                      acción primaria, documento y sesión de cada uno
    preferencias.ts   Entidad, acento, densidad, tema y ejercicio; soles/miles/pct
  modulos/<k>/        Un módulo por carpeta, cargado con `lazy()`
  datos/<k>.ts        Sus datos de muestra
```

La ruta vive en el hash —`#/catastro/predios`—, así que una pantalla concreta se puede
compartir por su URL sin que haga falta un servidor que la sirva.

## Las cuatro decisiones que explican el resto

**El shell es uno solo.** Los trece artboards lo repiten idéntico —comprobado línea a
línea—, así que vive en `Shell.tsx` y un módulo solo dice qué destino está activo y qué
dibuja dentro. Lo único que cambia por módulo son sus destinos, su acción primaria y su
sesión, y eso es dato: `modulos.ts`.

**Inicio trae su propio shell.** No es un módulo: es la respuesta a «a quién atiendes».
Con sesión del personal enseña el panel de recaudación con el riel; con sesión de un
contribuyente el riel desaparece —quien entra con su DNI no navega por módulos— y queda
el panel del contribuyente a 880 px.

**Las cifras derivadas se derivan.** El avance de la recaudación, el total de la deuda,
el descuento del beneficio y el número de predios que decide si procede la deducción de
pensionista salen de una cuenta sobre los datos, no de un literal. Cambiar una fila de
`src/datos/` mueve todo lo que depende de ella, que es lo que hace que la maqueta se
pueda leer como si fuera el sistema.

**El acento, la densidad y la entidad son configuración, no cromo.** El artboard los
expone como props del lienzo —cuatro acentos, tres densidades y el nombre de la
municipalidad— porque el producto es multi-municipal: una instalación atiende a muchas.
Aquí viven en `preferencias.ts` y el shell los escribe sobre `document.documentElement`,
listos para que los fije la instalación; **no se les dibuja un panel de ajustes**, porque
el diseño no dibuja ninguno y un producto no le pide al cajero que elija su color
corporativo. El modo oscuro sí tiene conmutador: los tokens traen la paleta oscura
completa, y una paleta a la que no se llega no es una paleta.

**Los estilos son los del artboard, en línea.** No hay clases de utilidad ni una
reescritura «más limpia»: el objetivo declarado es que la pantalla se vea idéntica al
diseño. Lo único que se movió a clases son los `hov-*`, porque React no tiene
pseudoclases en línea.

## Un defecto del bloque oscuro, medido

`colors.css` redefine `--accent-soft` en `[data-theme="dark"]` y **no** `--accent-ink`,
así que la pareja se rompe: el navy más oscuro sobre el relleno oscuro da **1,15:1** —y
esa pareja es la cifra de cada indicador, el código en pastilla, el selector de ejercicio
y el destino activo del panel—. Los tres `*-fg` semánticos, que la interfaz usa también
como texto sobre la superficie y no solo dentro de su insignia, quedaban en 1,77:1,
1,87:1 y 3,27:1.

Se corrige al final de `colors.css`, con las dos caras a la vez —el relleno de la
insignia se oscurece y el texto se aclara—, de modo que cada par sigue valiendo dentro de
la insignia (7,80:1 el más bajo) y además se lee sobre la tarjeta (8,63:1 el más bajo).
Las cifras están medidas, no estimadas.

## Portar un artboard

Está escrito en [`PORTAR.md`](PORTAR.md): qué se copia literal, qué se deriva, cómo se
traduce `sc-if`/`sc-for`/`style-hover`, y qué primitivo compartido usar en cada caso.
