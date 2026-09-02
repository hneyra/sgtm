# `frontend/` — el back-office del SGTM

React 19 sobre Vite, TypeScript. **Implementa el rediseño de
[`design/design-sgtm/`](../design/design-sgtm/)**: los doce módulos del catálogo —134
opciones del manual— resueltos como cuatro a seis *destinos* por módulo sobre un mismo
shell.

**Lee del backend de verdad.** Medido el 2026-09-01 contra el compose local: **41 de los
65 destinos piden al abrirse**, y los 24 restantes no son «sin conectar» sino pantallas
que primero necesitan un sujeto —una búsqueda, un número de expediente— o que escriben.

Lo que queda en `src/datos/` **no son datos**: son los rótulos, las columnas, los motivos
por los que un filtro está apagado y las notas de cada pantalla. Ninguna cifra. Las que
había —«MEDINA MEDINA, RUFINA (SUC.)», «S/ 214,882» de deuda determinada, los tres
cuadros normativos de valores escritos a mano— se retiraron cuando su pantalla pasó a
leer del backend, y hoy el censo de constantes exportadas sin usar es **cero**. Lo que
el backend no publique sale con el guion largo y su motivo, nunca con la cifra del
artboard: es lo que mide `yarn sin-red`.

```bash
yarn install
yarn dev        # http://localhost:5180
yarn build      # tsc + vite build
yarn verificar  # solo los tipos
yarn mirar      # recorre las 65 pantallas en Chromium y guarda una captura de
                # cada una en .capturas/; falla si alguna da un error de consola
                # o si el <main> se queda en blanco (que es como falla de verdad
                # una pantalla sin conectar: en silencio)
yarn sin-red    # las mismas CON LA RED CORTADA: ninguna puede enseñar una cifra
yarn errores    # el catálogo de errores contra el del backend, la puerta contra
                # respuestas fabricadas, y las pantallas ante un 405 y un 500
yarn paleta     # la paleta de comandos se opera sólo con el teclado
yarn vocabularios  # los desplegables, contra el enumerado del backend
yarn ficha-catastral  # los 123 campos de la ficha del predio: cada uno dice de qué
                # lectura sale y por qué clave del cuerpo viaja, o por qué no viaja;
                # y el guardado, roto, se niega nombrando lo que falta
yarn flujos     # opera los botones contra el backend real; necesita SGTM_TOKEN
```

`yarn mirar` necesita la vista previa levantada; si no está en el 5180, se le dice con
`SGTM_BASE=http://localhost:5181 yarn mirar`. Con `SGTM_TOKEN=…` recorre las pantallas
conectadas leyendo del backend; sin él, el backend contesta 401 y lo que se comprueba es
que la pantalla lo diga bien — que también hay que verlo.

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

## Predios, conectado

`Catastro · Predios` es el primer submódulo que habla con el backend. Todo lo demás
sigue siendo maqueta.

```
src/api/cliente.ts      La única puerta por la que salen las peticiones. Ningún
                        `fetch` suelto en ninguna pantalla. Traduce el RFC 9457 del
                        backend a un `ErrorDeApi` con su `codigo` estable.
src/api/catastro.ts     Los tipos, campo por campo, de los `record` del backend, y
                        las cinco operaciones que sirve `PredioController`.
src/api/useRecurso.ts   Una lectura con sus cuatro estados. Cancela la anterior,
                        descarta la que vuelve tarde y distingue cancelar de fallar.
```

| Qué | Contra qué |
|---|---|
| El padrón, con paginación | `GET /catastro/predios` |
| Buscar por código | el filtro `codRefCatastral`, que acota por **prefijo** |
| Filtrar por sector, estado y ficha | `codigoDeSector` · `estado` · `fichado` |
| El desplegable de sectores | `GET /catastro/sectores` |
| El titular, al abrir el predio | `GET /catastro/predios/{id}/titulares` |
| Inscribir un predio | `POST /catastro/predios` |
| Retirarlo del padrón y devolverlo | `POST …/{id}/baja` · `POST …/{id}/reactivacion` |

En desarrollo no hay CORS que configurar: `vite.config.ts` proxea `/api` al backend, así
que el navegador habla con su propio origen. Se apunta a otro sitio con
`VITE_SGTM_BACKEND`.

Mientras no exista la puerta de sesión, el token sale de `VITE_SGTM_TOKEN` o de
`localStorage['sgtm.token']`; cuando la haya, cambia una sola función —`token()` en
`cliente.ts`—. **Caduca a los 15 minutos y no se renueva solo**: al vencer, la pantalla
dice «La sesión no vale» y no ofrece reintentar, porque reintentar no lo arregla.

Esa es la regla entera del trato de errores, y vale para todos: **«Reintentar» sólo sale
donde reintentar puede cambiar algo**. Un permiso que falta sale igual las veces que se
pulse; un verbo que la ruta no admite no puede funcionar nunca. Lo sujeta `yarn errores`,
que la mide por sus tres mitades —fallan por separado—: el catálogo de `cliente.ts`
contra el enumerado del backend, `solicitar()` contra respuestas fabricadas, y las
pantallas en un navegador con **todas** las peticiones contestadas 405, donde ninguna
puede ofrecer el botón, y con un 500, donde alguna tiene que ofrecerlo. Sin ese contraste,
quitar el botón de los once sitios en que se escribe —ocho módulos con su propio aviso, más el
compartido— dejaría la primera mitad en verde.

### Desplegado con el resto del sistema

`despliegue/compose.yaml` construye este directorio como el servicio **`interfaz`** y lo
publica en `${SGTM_PUERTO_INTERFAZ:-8081}`.

```bash
cd despliegue
docker compose up -d --build interfaz     # reconstruye solo la interfaz
docker compose logs -f interfaz
```

Si `docker ps` da «permission denied» sobre `/var/run/docker.sock` y `getent group docker`
te lista igualmente, es que la sesión arrancó **antes** de que te añadieran al grupo: la
pertenencia se resuelve al iniciar sesión. Sin cerrarla, `sg docker -c "…"` corre un
comando con el grupo aplicado.

`Dockerfile` compila con Vite y sirve el resultado con nginx sin root; `nginx.conf`
reenvía `/api/v1` a `aplicacion:8080` **por la red del compose**. Ese reenvío no es
comodidad: el backend **no tiene ninguna configuración de CORS** —un preflight desde otro
origen sale 401 sin una sola cabecera `Access-Control-*`—, así que servir la API desde el
mismo origen es lo único que hace que la interfaz la alcance.

`VITE_SGTM_API` es un argumento de **construcción**: Vite la resuelve al compilar, no al
arrancar, y cambiarla exige reconstruir la imagen. Por eso vale `/api/v1` y nunca una URL
absoluta —un dominio horneado en el paquete sobrevive a cualquier cambio de configuración
y las dos mitades acaban apuntando a sitios distintos, en verde y sin síntoma—.

**Ningún token se hornea en la imagen.** `VITE_SGTM_TOKEN` es para una vista previa local;
meterlo en la imagen dejaría una credencial dentro de un artefacto que se publica.

### La puerta de sesión

Fuera de `localhost`, entrar sin sesión manda al **formulario de Keycloak**: código de
autorización con PKCE (S256) contra el cliente `sgtm-backoffice`, que el realm ya declara
como público con flujo estándar.

```
src/api/sesion.ts    entrar() · canjearSiVuelve() · reintentarLaSesion() · salir()
```

Tres decisiones que explican el resto:

**Rutas relativas, nunca un dominio.** Keycloak se sirve bajo `/kc` del mismo origen, así
que el realm por omisión es `/kc/realms/sgtm`. Un dominio escrito ahí quedaría horneado en
el paquete —Vite resuelve `import.meta.env` al compilar— y, como la misma imagen se
despliega en varios sitios, las dos mitades acabarían apuntando a servidores distintos, en
verde y sin un solo síntoma.

**El 401 vuelve a la puerta en vez de guardar un token de refresco.** Un refresco es una
credencial de vida larga en `localStorage`; pedir otro código no lo es. Con la sesión de
Keycloak viva el navegador va y vuelve **sin enseñar nada** —comprobado: token caducado,
ningún formulario, de vuelta en el mismo destino con token nuevo—, y si no lo está, sale el
formulario, que es lo que tiene que salir. Una guarda de diez segundos impide el bucle
cuando el canje funciona y la API sigue negando: en vez de rebotar sin fin, se para y la
pantalla dice qué pasa.

**El canje ocurre antes de montar React.** Limpia la URL y restituye el destino: hacerlo en
un efecto significaría montar dos veces, y la primera con `?code=` en la barra, así que
quien pidió `#/catastro/predios` acabaría en Inicio.

En `localhost` no hay puerta —el puerto de la vista previa no está entre las URIs de
retorno del cliente, y el rebote acabaría en «Invalid parameter: redirect_uri»—: ahí sigue
la caja para pegar un token a mano.

### Lo que la conexión NO hace, y por qué se dice en pantalla

**No hay columna de titular en la lista.** El backend no la publica a propósito
(ADR-0015 §2.4): publicarla convertiría «quien puede listar predios» en «quien puede
cosechar la correlación predio→persona de toda la municipalidad». Se resuelve al abrir
el predio, de uno en uno y dejando su rastro en la bitácora. La tabla lo dice en su pie.

**El uso, las áreas y el autovalúo salen «—».** Son datos de la **ficha**, que la sirve
otra superficie (`/catastro/fichas/…`) y no está conectada. Poner ahí la cifra del
prototipo le inventaría a ese predio un autovalúo que no tiene, y es indistinguible de
uno correcto en cuanto sale de la pantalla. Una franja lo explica sobre la ficha.

**Manzana, lote, uso y conciliación no filtran.** El endpoint no los acota. Salen en la
tabla y el bloque de filtros dice dónde se buscan de verdad, en vez de dibujar
desplegables que se teclean y no hacen nada.

## Portar un artboard

Está escrito en [`PORTAR.md`](PORTAR.md): qué se copia literal, qué se deriva, cómo se
traduce `sc-if`/`sc-for`/`style-hover`, y qué primitivo compartido usar en cada caso.
