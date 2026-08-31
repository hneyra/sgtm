import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Esqueleto, FechaDeCalculo, Insignia } from '@sgtm/design-system';
import { ProblemaDeApi, solicitar } from '@sgtm/api-client';
import { SIN_DATO, esLaSituacionDe, leerSituacion } from '@sgtm/lectura';
import type { EnLaMunicipalidad, SituacionDelCiudadano } from '@sgtm/lectura';
import { useSesion } from '@sgtm/sesion';
import { LECTURAS } from './lecturas';

/**
 * **Lo que este ciudadano debe y tiene, en todas las municipalidades donde
 * figure** (#57, RF-131, ADR-0020).
 *
 * ── Lo que se fue, y es la mitad del cambio ────────────────────────────────
 *
 * La caja de documento. Hasta aqui esta pantalla preguntaba «¿quién eres?» y
 * mandaba lo tecleado a `GET /rentas/contribuyentes?dNI=…`: un endpoint que
 * contesta por cualquiera a quien teclee ocho dígitos. Ahora el sujeto **llega
 * firmado** en el token del realm del ciudadano, la operación no tiene ni un
 * parámetro y aquí no hay nada que escribir.
 *
 * ── Una sola lectura, y una sola fecha ─────────────────────────────────────
 *
 * `GET /portal/situacion` responde de una vez: el servidor recorre el registro
 * de municipalidades —una transacción y un `SET LOCAL` por rama—, compone y suma
 * (RNF-083). La fecha de corte es **una** y está arriba; cada cifra vuelve a
 * llevar la suya al lado (regla 9, RNF-075).
 *
 * ── Y si falta una municipalidad, no hay total ─────────────────────────────
 *
 * El total consolidado llega en blanco cuando alguna rama falló, con la nota que
 * dice cuál. Aquí no se compone un total con lo que llegó: un importe al que le
 * falta una municipalidad es plausible y equivocado, que es la peor clase de
 * error de este sistema.
 *
 * ── Solo lectura, y no por ahora ───────────────────────────────────────────
 *
 * Ni una escritura: ningún `useMutation`, ninguna mutación. El pago en línea que
 * el prototipo dibuja queda fuera de ADR-0020 y no por comodidad: D-14 —la
 * imputación de un pago parcial— sigue abierta, y el asiento de un cobro exige
 * caja, serie, turno y cajero, que el ciudadano no tiene.
 */
export function Portal() {
  const sesion = useSesion();
  const consulta = useConsultaDeSituacion();
  const situacion = consulta.data;

  /* **¿La situación que llegó es la de este token?**
     Es la heredera de la guarda que hacía `identidadesQueCoinciden`: el proxy de
     datos no filtra (ADR-0010) y devuelve siempre el mismo cuerpo, y un fallo
     del backend que compusiera la de otra persona **no se distinguiría** de una
     correcta —trae un nombre, un código y unas cifras que existen—.
     Sin proveedor de identidad no hay token con el que comparar (es como se
     trabaja contra el proxy), y entonces no se compara: la guarda existe para
     cuando hay token, no para inventarse uno. */
  const documentoDelToken = sesion.datos?.documento ?? '';
  const esMia =
    situacion === undefined || documentoDelToken === ''
      ? true
      : esLaSituacionDe(situacion, documentoDelToken);

  return (
    /* `<main>`, no un `div`: es la única región de contenido de la aplicación, y
       sin el punto de referencia quien navega con lector de pantalla no tiene a
       dónde saltar —ni forma de saber dónde acaba la cabecera—. */
    <main className="sgtm-portal-app">
      <header className="sgtm-portal-app__cabecera">
        <p className="sgtm-portal-app__eyebrow">Portal del contribuyente</p>
        <h1 className="sgtm-portal-app__titular">Tu deuda</h1>
      </header>

      {/* El acto honesto de esta pantalla, permanente y antes de nada: lo que
          aquí se ve es una consulta, y de esta consulta no sale ningún pago. */}
      <Aviso
        titulo="Aquí solo se consulta"
        detalle="Esta pantalla muestra lo que cada municipalidad tiene registrado a tu nombre, a la fecha que se indica. El pago en línea todavía no está disponible: se paga en caja de la municipalidad o en los canales que ella anuncie."
      />

      {/* Lo que está pasando, dicho en voz alta y una sola vez: quien consulta
          desde un lector de pantalla no ve el esqueleto ni los bloques que
          aparecen debajo. */}
      <p className="sgtm-portal-app__oculto" role="status">
        {anuncioDe(consulta, esMia)}
      </p>

      <Resultado consulta={consulta} esMia={esMia} />

      <footer className="sgtm-portal-app__pie">
        <p>
          ¿Falta alguna municipalidad, o algún dato no es tuyo? Aquí solo aparece lo que cada
          municipalidad tiene registrado con tu documento. Acércate a la que corresponda con tu
          documento para corregirlo.
        </p>
      </footer>
    </main>
  );
}

/* ── La lectura ───────────────────────────────────────────────────────── */

function useConsultaDeSituacion() {
  return useQuery<SituacionDelCiudadano>({
    queryKey: ['portal', 'situacion'],
    // Uno, no tres: esto se consulta desde un teléfono con la red que haya, y
    // tres intentos son tres esperas antes de decir nada.
    retry: 1,
    queryFn: async ({ signal }) => {
      const cuerpo = await solicitar<unknown>(LECTURAS.portal_mi_situacion, { senal: signal });
      return leerSituacion(cuerpo);
    },
  });
}

type Consulta = ReturnType<typeof useConsultaDeSituacion>;

function anuncioDe(consulta: Consulta, esMia: boolean): string {
  if (consulta.isFetching) return 'Consultando…';
  /* El 403 no es «vuelve a intentarlo»: el aviso dibujado ya lo distingue, y la
     región viva tiene que decir lo mismo — anunciar «no se pudo hacer» sobre un
     rechazo invita a reintentar lo que va a dar lo mismo (el patrón de #331). */
  if (esRechazo(consulta.error)) return 'El servidor rechazó la consulta; reintentar dará lo mismo';
  if (hayFallo(consulta.error)) return 'La consulta no se pudo hacer';
  if (consulta.data === undefined) return '';
  if (!esMia) return 'La respuesta no corresponde a tu documento';
  if (consulta.data.sinRegistros) return 'No figuras en ninguna municipalidad del sistema';
  const cuantas = consulta.data.municipalidades.length;
  return cuantas === 1
    ? 'Figuras en 1 municipalidad'
    : `Figuras en ${String(cuantas)} municipalidades`;
}

const hayFallo = (error: unknown): boolean => error !== undefined && error !== null;

const esRechazo = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 403;

/* ── Lo que se ve ─────────────────────────────────────────────────────── */

function Resultado({ consulta, esMia }: { readonly consulta: Consulta; readonly esMia: boolean }) {
  if (consulta.isFetching) {
    return (
      <section className="sgtm-portal-app__resultado" aria-label="Tu situación">
        <Esqueleto alto={24} ancho="18ch" />
      </section>
    );
  }

  if (hayFallo(consulta.error)) {
    return (
      <section className="sgtm-portal-app__resultado" aria-label="Tu situación">
        <AvisoDeLectura error={consulta.error} reintentar={() => void consulta.refetch()} />
      </section>
    );
  }

  const situacion = consulta.data;
  if (situacion === undefined) return null;

  if (!esMia) {
    /* No se dibuja **nada** de lo que llegó. Es lo contrario de lo cómodo —hay
       un cuerpo entero ahí— y es el único trato posible: la situación de otra
       persona no se distingue de la propia mirándola. */
    return (
      <section className="sgtm-portal-app__resultado" aria-label="Tu situación">
        <Aviso
          tipo="error"
          titulo="Esto no corresponde a tu documento"
          detalle="La respuesta que llegó no es la de tu documento, así que no se muestra. Vuelve a entrar; si sigue pasando, avisa a la municipalidad."
        />
      </section>
    );
  }

  if (situacion.sinRegistros) {
    return (
      <section className="sgtm-portal-app__resultado" aria-label="Tu situación">
        <Aviso
          titulo="No figuras en ninguna municipalidad"
          detalle="Con tu documento no hay ningún registro en las municipalidades que atiende este sistema. Si crees que debería haberlo, acércate a la municipalidad con tu documento."
        />
        <p className="sgtm-portal-app__nota">
          Se consultaron {situacion.municipalidadesRecorridas} municipalidades al{' '}
          {situacion.aLaFecha}.
        </p>
      </section>
    );
  }

  return (
    <section className="sgtm-portal-app__resultado" aria-label="Tu situación">
      <Total situacion={situacion} />
      <div className="sgtm-portal-app__secciones">
        {situacion.municipalidades.map((municipalidad) => (
          <Municipalidad key={municipalidad.ubigeo} municipalidad={municipalidad} />
        ))}
      </div>
    </section>
  );
}

/**
 * El total de todo, **sumado por el servidor**, o el motivo de que no lo haya.
 *
 * Aquí no se suma ni se completa a partir de las partes (RNF-083). Y la nota que
 * explica su ausencia llega redactada del backend: es quien sabe qué rama falló.
 */
function Total({ situacion }: { readonly situacion: SituacionDelCiudadano }) {
  const total = situacion.totalConsolidado;
  return (
    <div className="sgtm-portal-app__resumen">
      <h2>Lo que debes en total</h2>
      <dl>
        <div data-fuerte="1">
          <dt>Total S/</dt>
          {/* Sin total no se dibuja un cero: «no se puede decir» y «no debes
              nada» son dos frases distintas, y la segunda sería falsa. */}
          <dd>{total?.importe ?? SIN_DATO}</dd>
        </div>
      </dl>
      {situacion.notaDelTotal !== '' && (
        <p className="sgtm-portal-app__nota">{situacion.notaDelTotal}</p>
      )}
      {total !== undefined && <FechaDeCalculo fecha={total.actualizadoA} />}
    </div>
  );
}

/** Lo que hay de esta persona en una municipalidad: quién es allí, qué debe y qué tiene. */
function Municipalidad({ municipalidad }: { readonly municipalidad: EnLaMunicipalidad }) {
  const total = municipalidad.resumen.total;
  return (
    <section className="sgtm-portal-app__seccion">
      <h3>{municipalidad.nombre}</h3>
      <dl className="sgtm-portal-app__fila">
        <div>
          <dt>Ubigeo</dt>
          <dd>{municipalidad.ubigeo}</dd>
        </div>
        <div>
          <dt>Tu código de contribuyente</dt>
          <dd>{municipalidad.codigoContribuyente}</dd>
        </div>
        <div>
          <dt>A nombre de</dt>
          <dd>{municipalidad.nombreContribuyente}</dd>
        </div>
        {!municipalidad.activo && (
          <div>
            <dt>Situación en el padrón</dt>
            <dd>
              {/* Se dice, no se esconde: la deuda sobrevive a la baja del padrón
                  (RNF-051), y ocultarla sería decirle que no debe nada. Nunca
                  solo por color: la insignia lleva su texto dentro. */}
              <Insignia tono="atencion">Dado de baja</Insignia>
            </dd>
          </div>
        )}
      </dl>

      <p className="sgtm-portal-app__conteo">{municipalidad.resumen.estadoDeLaConsulta}</p>

      <dl className="sgtm-portal-app__fila">
        <div>
          <dt>Deuda S/</dt>
          <dd>{total?.importe ?? SIN_DATO}</dd>
        </div>
      </dl>
      {total !== undefined && <FechaDeCalculo fecha={total.actualizadoA} />}

      {municipalidad.obligaciones.length > 0 && (
        <>
          <h4>Lo que debes aquí</h4>
          {municipalidad.obligaciones.map((obligacion, indice) => (
            <dl key={indice} className="sgtm-portal-app__fila">
              <div>
                <dt>Concepto</dt>
                <dd>{obligacion.tributo}</dd>
              </div>
              <div>
                <dt>Año</dt>
                <dd>{obligacion.ejercicio}</dd>
              </div>
              <div>
                <dt>Total S/</dt>
                {/* El importe **de un `ImporteActualizado`**: sin su fecha no es
                    una cifra que se pueda enseñar (regla 9). La banda de arriba
                    la comparten todas, porque todas salen del mismo corte. */}
                <dd>{obligacion.total?.importe ?? SIN_DATO}</dd>
              </div>
            </dl>
          ))}
        </>
      )}

      {municipalidad.predios.length > 0 && (
        <>
          <h4>Tus predios aquí</h4>
          {municipalidad.predios.map((predio) => (
            <dl key={predio.codigoReferenciaCatastral} className="sgtm-portal-app__fila">
              <div>
                <dt>Código predial</dt>
                <dd>{predio.codigoReferenciaCatastral}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{predio.tipo}</dd>
              </div>
              <div>
                <dt>Dirección</dt>
                <dd>{predio.direccion}</dd>
              </div>
              <div>
                <dt>% de tu titularidad</dt>
                {/* Solo el tuyo. La porción que no te corresponde no se menciona,
                    y no se nombra a ningún copropietario (ADR-0019). */}
                <dd>{predio.porcentajeTitularidad}</dd>
              </div>
            </dl>
          ))}
        </>
      )}
    </section>
  );
}

/**
 * No se pudo leer, o el servidor lo rechazó. **Las dos cosas no se dicen igual,
 * y ninguna se dice como «no debes nada»**.
 */
function AvisoDeLectura({
  error,
  reintentar,
}: {
  readonly error: unknown;
  readonly reintentar: () => void;
}) {
  if (error instanceof ProblemaDeApi && error.problema.status === 403) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo="Esta consulta te la rechazó el servidor"
        detalle="Tu sesión no trae el documento con el que la municipalidad te registró, así que no se puede saber por quién preguntar. Reintentar dará lo mismo: acércate a la municipalidad con tu documento."
      />
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo="La consulta no se pudo hacer"
      detalle="No hubo respuesta, así que esto no se pudo mostrar. Que no aparezca aquí no quiere decir que no exista."
    >
      <Boton variante="primario" onClick={reintentar}>
        Volver a intentarlo
      </Boton>
    </Aviso>
  );
}
