/**
 * Una fecha y un instante no se dibujan igual, y confundirlos cuesta un dia.
 *
 * <h2>Las dos formas, y por que no son la misma</h2>
 *
 * El backend manda **dos cosas distintas** que se parecen al leerlas:
 *
 *   - un `LocalDate` — «2026-09-01» — que es **una fecha sin zona**: el dia en
 *     que un acto tuvo efecto tributario. No tiene hora ni zona que equivocar, y
 *     pasarla por `Date` es como se pierde un dia: `new Date('2026-01-01')` se
 *     interpreta en UTC y en `UTC-5` se dibuja como el 31/12 del ano anterior.
 *   - un `Instant` — «2026-09-01T05:27:38.829508Z» — que es **un momento
 *     absoluto**, serializado por `Instant.toString()`. Ese SI tiene zona, y
 *     partirlo por la cadena lo dibuja en la del emisor, que es UTC.
 *
 * Hasta #619 los dos se partian por la cadena, con el comentario «sin `Date`:
 * partir la cadena no tiene zona horaria que equivocar». Era cierto de la
 * primera y falso de la segunda: **en Peru son cinco horas menos**, asi que un
 * recibo cobrado a las 00:27 de Lima se leia «05:27». Y hay un caso peor que el
 * desfase: **el dia cambia**. Un cobro de las 20:30 de Lima es `T01:30Z` del dia
 * siguiente, de modo que la ficha lo fechaba un dia despues que el papel, que el
 * arqueo y que el acta de anulacion — esas tres salen de un `LocalDate` del
 * servidor y no se movian.
 *
 * <h2>En que zona se dibuja, y por que en esa</h2>
 *
 * En **la del lector**, con `Intl`. Es correcta por definicion, y en una
 * ventanilla de Piura es ademas la del acto.
 *
 * La otra respuesta razonable seria la zona **de la municipalidad**, que es la
 * que el papel imprime. Pero hoy **ningun sitio la publica**: no esta en el
 * token, ni en `GET /seguridad/sesion`, ni en el registro de municipalidades. Y
 * escribir `America/Lima` a mano aqui seria **inventar un dato de la
 * municipalidad en el cliente**, que es lo que la regla 5 prohibe para las
 * cifras y por el mismo motivo: el dia que una instalacion no este en esa zona,
 * la hora saldria mal y nada lo diria.
 *
 * Asi que se usa la del lector **y se dice cual es** donde el desfase se puede
 * leer mal — al lado de la hora de un recibo, que es el unico dato con el que se
 * distinguen dos cobros del mismo dia y del mismo importe. Quien mire desde otra
 * zona ve el nombre de la suya y sabe que el papel dice otra hora.
 */

/** Lo que se dibuja cuando no hay dato. Igual que en el resto del producto. */
const SIN_DATO = '—';

/**
 * Una fecha sin zona, en el orden en que se lee aqui.
 *
 * **Parte la cadena a proposito y no pasa por `Date`.** Un `LocalDate` no tiene
 * zona, asi que convertirlo es inventarle una: en `UTC-5`, «2026-01-01» se
 * dibujaria como el 31/12/2025.
 */
export function dia(iso: string | null | undefined): string {
  if (!iso) return SIN_DATO;
  const [f] = iso.split('T');
  const p = (f ?? '').split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

/**
 * Un instante absoluto, en la zona del lector.
 *
 * **Pasa por `Date` a proposito**, que es justo lo contrario de {@link dia}: un
 * instante SI tiene zona y no convertirlo lo dibuja en UTC.
 *
 * Si la cadena no es un instante —no lleva `T` ni marca de zona— se devuelve por
 * {@link dia}, porque convertir lo que no es un instante es el defecto de al
 * lado. Y si `Date` no la puede leer, se devuelve tal cual: un texto raro es
 * mejor que un «Invalid Date» que no dice de donde salio.
 */
export function instante(iso: string | null | undefined): string {
  if (!iso) return SIN_DATO;
  if (!iso.includes('T')) return dia(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dosCifras = (n: number) => String(n).padStart(2, '0');
  return (
    `${dosCifras(d.getDate())}/${dosCifras(d.getMonth() + 1)}/${d.getFullYear()}` +
    ` ${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`
  );
}

/**
 * El nombre de la zona en que {@link instante} acaba de dibujar.
 *
 * Existe para poder **decirlo** donde el desfase se puede leer mal, en vez de
 * dejar que quien mira desde otra zona compare la hora de la pantalla con la del
 * papel y no sepa por que no coinciden.
 */
export function zonaDelLector(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* Un navegador sin `Intl` completo no es un caso que haya que dibujar mal:
       se dice que no se sabe, que es lo unico cierto. */
    return SIN_DATO;
  }
}
