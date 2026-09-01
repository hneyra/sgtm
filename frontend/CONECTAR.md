# Cómo se conecta un módulo al backend

Esto complementa a `PORTAR.md`, que dice cómo se porta el diseño. Aquí está cómo se
enchufa lo portado al backend **sin tocar el backend**.

## La regla que ordena todo lo demás

**El backend es la fuente de verdad, y el prototipo miente a menudo.** Casi cada
submódulo conectado hasta ahora ha desmentido algo del artboard: una insignia que decía
«Sellada» cuando no lo estaba, un filtro que no filtra, una columna cuyo dato el recurso
no publica, un desplegable con valores que el enumerado no reconoce.

Cuando eso pasa, hay tres salidas y **solo una es aceptable**:

1. ~~Dejar la cifra del prototipo~~ — es indistinguible de un dato correcto en cuanto
   sale de la pantalla.
2. ~~Poner un cero o dejarlo en blanco~~ — un cero en «Impuesto omitido» se lee como
   «no debe nada»; un blanco, como «no tiene».
3. **Poner `—` y decir en pantalla por qué**, y abrir un issue con lo que falta.

## Lo que ya existe y se reutiliza

```
src/api/cliente.ts     La ÚNICA puerta. `solicitar()`. Ningún `fetch` suelto en
                       ninguna pantalla. Traduce el RFC 9457 del backend a
                       `ErrorDeApi` con su `codigo` estable.
src/api/useRecurso.ts  `useRecurso(pedir, llaves, activo)` → { datos, cargando,
                       error, reintentar }. Cancela la anterior, descarta la que
                       vuelve tarde, distingue cancelar de fallar y reintenta la
                       sesión ante un 401. `useRebote` para los buscadores.
src/api/sesion.ts      La puerta de Keycloak (PKCE). No hay que tocarla.
src/api/<modulo>.ts    Los tipos y las operaciones de cada módulo.
```

**Tu módulo crea su propio `src/api/<modulo>.ts`.** No edites los de otros módulos ni
`cliente.ts`/`useRecurso.ts`: hay más gente trabajando en paralelo.

## Cómo se escribe un tipo

Campo por campo, **igual que el `record` del backend**, con los nombres que viajan
—aunque sean raros: `dNI`, `rUC`, `ano`—. Y con el comentario que diga por qué, cuando
sorprenda. Los importes llegan como **texto** (RNF-055): se dibujan como texto; pasarlos
por `Number` para volver a formatearlos es como se pierde un decimal.

## Enumerados: letra por letra, y no se traducen

Compara los valores del desplegable con el `enum` del backend **carácter a carácter**.
«ACTIVA» no es `VIGENTE` y «SUBVALUACIÓN» no es `SUBVALUADOR`. Si no coinciden:

- Ofrece **solo** los valores que el enumerado tiene, y di en la ayuda cuáles quedan
  fuera; **o**
- deja el desplegable bloqueado con su motivo.

Traducir por parecido es el error que #427 se negó a cometer.

## Escrituras

Toda escritura exige **observación** (regla 10, RNF-052) y la primaria nace **apagada**
sin ella, con su `title` diciendo por qué. Si el manual no le dibuja campo, se añade un
control con su propio rótulo.

**Cuidado con los campos que se parecen**: el manual pide a menudo el *documento* o el
*código catastral*, y el backend quiere el *código de contribuyente* o el *id interno*.
Resuélvelo con una lectura antes de mandar; si no aparece, dilo y no mandes.

## Verificar

```bash
npx tsc -b --noEmit
npx vite build
SGTM_BASE=http://localhost:5190 SGTM_TOKEN=$(…/token.sh) yarn mirar <modulo>
```

Y **mira las capturas**. El arnés ya ha cazado cosas que compilaban: claves duplicadas,
pantallas en blanco, cabeceras sobre la columna equivocada.

## Los tokens

```
.../scratchpad/token.sh           Sullana (muni 1) — datos de demo CON deuda sembrada
.../scratchpad/token-catacaos.sh  Catacaos (muni 9) — padrón REAL, 14 422 predios,
                                  10 603 contribuyentes, sin cuenta corriente
```

Para deuda, pagos, recibos y determinaciones usa **Sullana**. Para padrón, catastro y
volumen, **Catacaos**.
