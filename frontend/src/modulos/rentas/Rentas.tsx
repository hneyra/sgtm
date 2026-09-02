import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type Contexto, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import {
  altaDeDeuda,
  bajaDeDeuda,
  beneficiosDelContribuyente,
  buscarContribuyentes,
  calcularVehicular,
  corregirContribuyente,
  correrPredialMasivo,
  determinarPredial,
  fichaDelContribuyente,
  hojaDeDeclaracion,
  indicadores,
  listarPrediosDelContribuyente,
  listarVehiculosDelContribuyente,
  ultimaCorridaPredial,
  tipoDeTransferenciaDelBackend,
  transferirPredio,
  transferirVehiculo,
  type BeneficioDelContribuyente,
  type CalculoVehicular,
  type Contribuyente,
  type CorreccionDeContribuyente,
  type CorridaDePredial,
  type DeterminacionPredial,
  type FichaDelContribuyente,
  type HojaDeDeclaracion,
  type PeticionDeMovimientoDeDeuda,
  type PredioDeLaHoja,
  type PredioDelContribuyente,
  type VehiculoDelContribuyente,
} from '../../api/rentas';
/* `titularesDelPredio` es la MISMA fuente y la MISMA fecha que el backend usa
   para comprobar la unidad de un movimiento (#635): `TitularesDelPredio.de(
   predioId, fecha)`. Se usa en la baja, donde la fila trae el identificador
   interno y no el codigo predial, y donde la fecha valor es la de la
   resolucion y no hoy. */
import { listarPredios, listarSectores, titularesDelPredio } from '../../api/catastro';
/* Dos lecturas de `consultas` que este módulo necesita y no duplica: la deuda de
   un contribuyente —la que se da de baja, y la que arrastra el transferente— y el
   vehículo por placa, que es de donde sale su titular vigente. */
import {
  buscarVehiculos,
  deudaDelContribuyente,
  fichaUnificada,
  type ObligacionConDeuda,
} from '../../api/consultas';
import { ErrorDeApi, type RespuestaPaginada } from '../../api/cliente';
import { FalloDeLectura, explicacionDelFallo } from '../../api/Fallo';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Aviso, Insignia, Paginador, PasoAtras, filaPulsable, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { soles, usarPreferencias } from '../../shell/preferencias';
import {
  CAMPOS_DEL_ALTA,
  CAMPOS_DE_LA_BAJA,
  COLS_DE_LA_BAJA,
  DEFECTOS,
  DETERMINACIONES,
  EXPEDIENTE,
  OPCIONES_DE_RENTAS,
  TIPOS_DE_DETERMINACION,
  TRANSFERENCIAS,
  type CampoDef,
  type ClaveDeDeterminacion,
  type ClaveDeTransferencia,
  type ColDef,
  type FiltroDef,
  type LineaDeMemoria,
  type TablaDef,
  type TotalDef,
} from '../../datos/rentas';

/* ══════════ Los estilos que el artboard declara una vez y repite ══════════
   `IN`, `TH`, `THN`, `TD`, `TDN` y `TD1` son literalmente las constantes del
   script de `Rentas.dc.html`: el control de formulario y las seis formas de
   celda. No son las del design system —el módulo dibuja sus tablas más
   apretadas que la tabla común— así que van a mano, como manda PORTAR.md. */

const IN: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 10px',
  background: 'var(--bg-elev)',
  fontSize: 13.5,
};

/** El mismo control, apagado: se ve que está y se ve que no se puede tocar. */
const APAGADO: CSSProperties = { opacity: 0.5, cursor: 'not-allowed', background: 'var(--bg-card)' };

const TH: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  color: 'var(--ink-3)',
  whiteSpace: 'nowrap',
  background: 'var(--bg-elev)',
};
const THN: CSSProperties = { ...TH, textAlign: 'right' };
const TD: CSSProperties = { padding: '11px 14px', fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' };
const TDN: CSSProperties = {
  padding: '11px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  color: 'var(--ink-2)',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};
const TD1: CSSProperties = { padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' };

const TARJETA: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-1)',
  overflow: 'hidden',
};
const CABECERA: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  padding: '13px 16px',
  borderBottom: '1px solid var(--line)',
};
const H2: CSSProperties = { margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 };
const META: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' };
const PIE: CSSProperties = {
  margin: 0,
  padding: '11px 16px',
  borderTop: '1px solid var(--line)',
  background: 'var(--bg-elev)',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--ink-3)',
  textWrap: 'pretty',
};
const ENTRADILLA: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-serif)',
  fontSize: 17,
  lineHeight: 1.6,
  color: 'var(--ink-2)',
  maxWidth: '70ch',
};
const COLUMNA: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const REJILLA_DE_CAMPOS: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
  gap: '15px 16px',
  padding: '15px 16px 17px',
};
const BOTON_SECUNDARIO: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '10px 18px',
  background: 'var(--bg-card)',
  fontSize: 13,
  cursor: 'pointer',
};
const BOTON_PRIMARIO: CSSProperties = {
  border: 0,
  borderRadius: 6,
  padding: '11px 22px',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 500,
  cursor: 'pointer',
};
const BOTON_DE_TABLA: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '6px 12px',
  background: 'var(--bg-elev)',
  fontSize: 12,
  color: 'var(--ink-2)',
  cursor: 'pointer',
};

/** La pastilla de conmutación: los seis tipos de determinación, los dos tipos
 *  de transferencia y las dos hojas de movimiento de deuda la comparten. */
const pastilla = (on: boolean): CSSProperties => ({
  border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
  borderRadius: 999,
  padding: '7px 15px',
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: on ? 600 : 400,
  background: on ? 'var(--accent)' : 'var(--bg-card)',
  color: on ? '#fff' : 'var(--ink-2)',
});

/** La celda de un cuadro de totales. El divisor va en la celda, no en el `gap`:
 *  con `auto-fit` la última fila puede quedar incompleta y un `gap` sobre fondo
 *  `--line` dejaría ver el fondo desnudo donde no hay celda. */
const celdaDeTotal = (destacado: boolean): CSSProperties => ({
  background: destacado ? 'var(--accent-soft)' : 'var(--bg-card)',
  padding: '14px 16px',
  borderLeft: '1px solid var(--line)',
  borderTop: '1px solid var(--line)',
  margin: '-1px 0 0 -1px',
});

const caret = (abierta: boolean): CSSProperties => ({
  display: 'grid',
  placeItems: 'center',
  width: 20,
  height: 20,
  color: 'var(--ink-4)',
  flex: '0 0 auto',
  transform: `rotate(${abierta ? '0' : '-90'}deg)`,
  transition: 'transform .15s ease',
});

const CARET: readonly string[] = ['M6 9l6 6 6-6'];

/** El importe con coma de miles vuelto número: las cifras del artboard llegan
 *  escritas, y los totales derivados se suman sobre ellas. */
const numero = (t: string) => {
  const n = Number(String(t).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/**
 * El valor por omisión que declara cada campo del catálogo, por clave.
 *
 * Existe porque `texto(k)` miraba sólo `vals` y `DEFECTOS`, y **no el `v` del
 * propio campo**, que es de donde salen los valores iniciales de los
 * desplegables y de las casillas. La consecuencia era que lo que la pantalla
 * enseñaba y lo que viajaba no eran lo mismo: «Genera alcabala» nace marcada
 * (`v: true`) y `texto('genAlcabala')` devolvía `''`, así que la comparación
 * `!== 'No'` daba cierto **siempre** —también con la casilla desmarcada, donde
 * devuelve `'false'`— y toda transferencia se registraba generando alcabala.
 * Con una sola fuente para los tres orígenes, lo que se ve es lo que se manda.
 */
const POR_OMISION_DEL_CAMPO: Record<string, string | boolean> = (() => {
  const mapa: Record<string, string | boolean> = {};
  const meter = (campos: CampoDef[]) => {
    for (const c of campos) if (c.v !== undefined) mapa[c.k] = c.v;
  };
  for (const seccion of EXPEDIENTE) for (const bloque of seccion.bloques) meter(bloque.campos);
  for (const det of Object.values(DETERMINACIONES)) for (const sec of det.secciones ?? []) meter(sec.campos);
  for (const tr of Object.values(TRANSFERENCIAS)) for (const paso of tr.pasos) meter(paso.campos);
  meter(CAMPOS_DEL_ALTA);
  meter(CAMPOS_DE_LA_BAJA);
  return mapa;
})();

/**
 * El importe tal como el backend lo lee, o `null` si lo tecleado no es uno.
 *
 * `new BigDecimal(texto.strip())` no admite separador de miles, y en el Perú los
 * importes se escriben con él: quien teclea «1,842.60» —que es como lo dice el
 * recibo que tiene delante— recibía un 422 que culpa al campo. Se quita el
 * separador y se comprueba la forma **antes** de mandar, para que el aviso hable
 * del campo que hay que corregir y no de una regla del servidor.
 */
function importeQueViaja(escrito: string): string | null {
  const limpio = escrito.trim().replace(/,/g, '');
  if (limpio === '') return '';
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? limpio : null;
}

/**
 * Hasta cuándo responde el transferente y desde cuándo el adquirente.
 *
 * Sale del **año de la fecha del acto**, que es lo que la propia pantalla dice
 * dos párrafos más arriba: «la obligación del vendedor corre hasta el 31 de
 * diciembre del año de la transferencia». Antes eran dos constantes de la
 * maqueta —31/12/2026 y 01/01/2027— que no se movían aunque el acto fuera de
 * 2024. Sin fecha del acto no hay año, y sale «—».
 */
function afectacionDelActo(fecha: string): { hasta: string; desde: string } {
  const anio = Number(fecha.slice(0, 4));
  if (!Number.isInteger(anio) || anio < 1900) return { hasta: '—', desde: '—' };
  return { hasta: `31/12/${anio}`, desde: `01/01/${anio + 1}` };
}

/* ══════════ Piezas del artboard ══════════ */

function CampoDeFormulario({
  f,
  valor,
  onCambio,
}: {
  f: CampoDef;
  valor: string | boolean;
  onCambio: (v: string | boolean) => void;
}) {
  const texto = typeof valor === 'boolean' ? '' : valor;
  const apagado = f.bloqueado !== undefined;
  const estilo = apagado ? { ...IN, ...APAGADO } : IN;
  return (
    <label data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: apagado ? 'var(--ink-4)' : 'var(--ink-3)' }}>{f.l}</span>

      {(f.t === undefined || f.t === 'text') && (
        <input value={texto} disabled={apagado} onChange={(e) => onCambio(e.target.value)} placeholder={f.ph} style={estilo} />
      )}
      {f.t === 'date' && (
        <input type="date" value={texto} disabled={apagado} onChange={(e) => onCambio(e.target.value)} style={estilo} />
      )}
      {f.t === 'sel' && (
        <select value={texto} disabled={apagado} onChange={(e) => onCambio(e.target.value)} style={estilo}>
          {(f.o ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {f.t === 'area' && (
        <textarea
          value={texto}
          onChange={(e) => onCambio(e.target.value)}
          rows={3}
          placeholder={f.ph}
          style={{
            width: '100%',
            border: '1px solid var(--line-2)',
            borderRadius: 6,
            padding: '9px 10px',
            background: 'var(--bg-elev)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13.5,
            resize: 'vertical',
          }}
        />
      )}
      {f.t === 'chk' && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '9px 10px',
            border: '1px solid var(--line-2)',
            borderRadius: 6,
            background: 'var(--bg-elev)',
          }}
        >
          <input
            type="checkbox"
            checked={valor === true}
            disabled={apagado}
            onChange={(e) => onCambio(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto', ...(apagado ? APAGADO : null) }}
          />
          <span style={{ fontSize: 13, color: apagado ? 'var(--ink-4)' : 'var(--ink-2)' }}>{f.ph}</span>
        </span>
      )}
      {f.t === 'ro' && (
        <span
          style={{
            display: 'block',
            minHeight: 38,
            lineHeight: '19px',
            padding: '9px 10px',
            border: '1px dashed var(--line-2)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          {texto}
        </span>
      )}

      {(f.bloqueado ?? f.ayuda) !== undefined && (
        <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.bloqueado ?? f.ayuda}</span>
      )}
    </label>
  );
}

/** La tabla de datos del módulo: la primera columna destaca, las numéricas van
 *  en mono a la derecha. */
function TablaDeDatos({
  cols,
  filas,
  min,
  vacia,
}: {
  cols: ColDef[];
  filas: string[][];
  min: string;
  /** Qué decir cuando no hay filas. Sin esto, una tabla que perdió sus filas de
   *  muestra se dibuja con la cabecera y nada debajo, que se lee como «no hay». */
  vacia?: string;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: min }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c[0]} style={c[1] ? THN : TH}>
                {c[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && vacia !== undefined && (
            <tr style={{ borderTop: '1px solid var(--line)' }}>
              <td colSpan={cols.length} style={{ ...TD, whiteSpace: 'normal', color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {vacia}
              </td>
            </tr>
          )}
          {filas.map((r, i) => (
            <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
              {r.map((celda, j) => (
                <td key={j} style={j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloqueDeTabla({ tabla, onAnadir }: { tabla: TablaDef; onAnadir: () => void }) {
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px' }}>
        <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 500 }}>{tabla.titulo}</p>
        <span style={META}>{tabla.conteo}</span>
        {tabla.accion && (
          <button onClick={onAnadir} className="hov-linea" style={BOTON_DE_TABLA}>
            {tabla.accion}
          </button>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        <TablaDeDatos cols={tabla.cols} filas={tabla.filas} min={tabla.min} />
      </div>
      {tabla.nota && <p style={PIE}>{tabla.nota}</p>}
    </div>
  );
}

/** Lo que va donde el recurso no publica un dato. */
/* ══════════ La unidad del alta, resuelta contra el padrón (#554) ══════════ */

/**
 * Lo que la caja «Unidad (predio / placa)» resolvió, y de quién es.
 *
 * `PeticionDeMovimiento` no acepta ni el código catastral ni la placa: acepta
 * `predioId` y `vehiculoId`, que son los identificadores internos que
 * `ClaveDeSaldo` compara **por igualdad exacta**. Así que lo que quien atiende
 * escribe se resuelve antes de mandar, y lo que viaja es el identificador.
 *
 * El `cruce` es la otra mitad, y es la que evita el defecto caro: una obligación
 * es de un contribuyente **sobre** una unidad, de modo que un alta con la placa
 * de otro queda asentada sobre una clave que nadie va a mirar —ni la ficha del
 * vehículo, que es de su titular, ni la deuda sin unidad de quien paga—.
 *
 * **Desde #635 el backend también lo comprueba**, y eso cambia a qué pregunta
 * contesta este cruce. Hasta entonces era lo único que había —el controlador
 * pasaba los dos identificadores a `ClaveDeSaldo` tal cual (#628)— y el aviso
 * decía «revísalo». Ahora el servidor resuelve el titular a la fecha valor y
 * rechaza con 422 el movimiento cuya unidad no es del contribuyente, así que
 * el cruce dice **qué va a pasar** y ofrece la única respuesta que el servidor
 * admite: `deudaDeTitularAnterior`. El aviso sigue sin bloquear por sí mismo
 * —el caso legítimo existe—; lo que bloquea es no haberlo contestado.
 */
type CruceDeLaUnidad =
  | { estado: 'suya' }
  /* La unidad EXISTE y a esa fecha no figura a nombre de nadie. Desde #680 el
     servidor la ADMITE sin declaración —4 977 de los 14 422 predios de Catacaos
     están así, el 34,5 %, y son justo los que la detección de omisos enseña—,
     así que no es «es de otro» y decirlo como tal manda a declarar algo que no
     hay que declarar. */
  | { estado: 'sin-titular'; aLaFecha: string }
  | { estado: 'ajena'; de: string }
  | { estado: 'sin-comprobar'; por: string };

type UnidadDelAlta =
  | { clase: 'nada' }
  | {
      clase: 'predio' | 'vehiculo';
      /** Lo único que viaja: el identificador interno, en su campo. */
      cuerpo: { predioId?: number; vehiculoId?: number };
      /** Cómo se llama la unidad para quien la buscó: el código o la placa. */
      codigo: string;
      /** Qué es, con lo que el recurso publica. */
      detalle: string;
      cruce: CruceDeLaUnidad;
    };

/** Una placa comparable: sin guion y en mayúsculas, que es como se teclea de las dos formas. */
const placaComparable = (placa: string) => placa.replace(/-/g, '').toUpperCase();

/** La misma frase, empezando oración: «el predio X» → «El predio X». */
const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Del código catastral o de la placa al identificador que el cuerpo pide.
 *
 * Se pregunta primero por el catastro y después por el padrón vehicular, en ese
 * orden y no a la vez: un código de referencia catastral y una placa no se
 * parecen, así que la segunda consulta sólo sale cuando la primera no encontró
 * nada. Como mucho son dos peticiones por unidad tecleada, y ninguna mientras la
 * mano se mueve (`useRebote`).
 *
 * **El cruce con el contribuyente se hace donde se puede hacer.** El vehículo lo
 * trae en la misma respuesta —`VehiculoEncontradoResource` publica
 * `codigoContribuyente` y `titular`—, así que se compara por código y se puede
 * decir a nombre de quién figura. El predio no: `PredioDelCatastroResource` no
 * publica ningún titular, y el nombre habría que pedirlo a
 * `/catastro/predios/{id}/titulares`, que es de otro módulo y deja fila en la
 * bitácora por cada tecla parada. Se cruza contra el padrón del propio
 * contribuyente —la lectura que esta pantalla ya usa— y por eso el aviso del
 * predio dice que no está entre los suyos, sin afirmar de quién es.
 */
async function resolverLaUnidadDelAlta(
  escrito: string,
  codContribuyente: string,
  senal: AbortSignal,
): Promise<UnidadDelAlta> {
  const predios = await listarPredios({ codRefCatastral: escrito }, { tamano: 2 }, senal);
  const predio = predios.contenido.find((x) => x.codRefCatastral === escrito);
  if (predio !== undefined) {
    let cruce: CruceDeLaUnidad;
    try {
      const suyos = await listarPrediosDelContribuyente(codContribuyente, { codigoPredial: escrito }, { tamano: 20 }, senal);
      if (suyos.contenido.some((p) => p.predioId === predio.predioId)) {
        cruce = { estado: 'suya' };
      } else {
        /* No está entre los suyos, y hasta #680 eso se decía «ajena» sin más.
           Pero son DOS cosas: el predio de otro —que el servidor rechaza y que
           hay que declarar— y el predio **sin titular vigente**, que desde #680
           entra tal cual y no hay nada que declarar. La lista del contribuyente
           no las distingue: un predio sin titular no está en la de nadie.

           Se pregunta por los titulares del predio, y **sólo aquí**: cuando sí
           es suyo no hace falta, que es el camino corriente. Una petición más en
           la rama que la necesita. */
        const r = await titularesDelPredio(predio.predioId, undefined, senal);
        cruce =
          r.titulares.length === 0
            ? { estado: 'sin-titular', aLaFecha: r.vigenteA }
            : { estado: 'ajena', de: 'no figura entre los predios de este contribuyente' };
      }
    } catch {
      /* Que no se pueda comprobar NO es que sea de otro, y tampoco que sea suya:
         un fallo de la lectura del padrón se dice como lo que es. Y no tumba la
         resolución, que ya está hecha: el identificador que viaja es el mismo. */
      cruce = { estado: 'sin-comprobar', por: 'no se pudo leer el padrón de predios de este contribuyente' };
    }
    return {
      clase: 'predio',
      cuerpo: { predioId: predio.predioId },
      codigo: predio.codRefCatastral,
      detalle: [predio.tipo, predio.direccion].filter((x) => x !== null && x !== '').join(' · '),
      cruce,
    };
  }

  const vehiculos = await buscarVehiculos({ placa: escrito }, { tamano: 2 }, senal);
  const vehiculo = vehiculos.contenido.find((v) => placaComparable(v.placa) === placaComparable(escrito));
  if (vehiculo !== undefined) {
    return {
      clase: 'vehiculo',
      cuerpo: { vehiculoId: vehiculo.vehiculoId },
      codigo: vehiculo.placa,
      detalle: [vehiculo.clase, vehiculo.marca, vehiculo.modelo].filter((x) => x !== null && x !== '').join(' '),
      cruce:
        vehiculo.codigoContribuyente === codContribuyente
          ? { estado: 'suya' }
          : { estado: 'ajena', de: `figura a nombre de ${vehiculo.titular} (${vehiculo.codigoContribuyente})` },
    };
  }
  return { clase: 'nada' };
}

/**
 * Cuántos vehículos se leen para cruzar la unidad de una baja.
 *
 * **No hay lectura de un vehículo por identificador**: medido pidiéndoles un
 * parámetro inventado —que los enumera—, `/rentas/vehiculos` admite
 * `codContribuyente`, `contribuyente`, `direccion`, `fecha` y la paginación, y
 * `/consultas/vehiculos` añade `placa`, `nroMotor` y `estado`; ninguno es el
 * identificador. Y la fila de la deuda trae el identificador y no la placa, así
 * que la única forma de contestar «¿es suyo?» es preguntar por los suyos y
 * buscarlo entre ellos.
 *
 * **Cien y no todos.** La lectura calcula del lado del servidor la deuda de
 * cada vehículo que devuelve, así que traerse el padrón entero de una empresa
 * de transportes para responder un sí o un no lo pagaría el servidor en cada
 * clic. Cien cubre de sobra lo que se ha podido medir —la municipalidad 1 tiene
 * 8 vehículos en todo el padrón y su mayor titular 3—, y de un padrón grande no
 * hay medida: por eso lo que no quepa **se dice** («no se pudo comprobar») en
 * vez de darse por bueno, que es el único modo de fallo que aquí importa.
 *
 * El `estado` no acota nada, y hace falta que no lo haga: el controlador compone
 * el criterio **sólo** con el contribuyente, así que un vehículo dado de baja
 * sigue saliendo. Si no saliera, la baja de su deuda quedaría bloqueada por una
 * unidad que sí es suya.
 */
const VEHICULOS_QUE_SE_CRUZAN = 100;

/**
 * De quién es la unidad de la obligación que se va a dar de baja (#635).
 *
 * <h2>Por qué la baja también lo necesita, y por qué duele más que el alta</h2>
 *
 * La comprobación de #635 la hacen las **dos** rutas, y en la baja recae sobre
 * una obligación que YA está en el libro. El caso legítimo es el corriente: la
 * deuda de 2024 la debe quien era titular en 2024, y el predio se vendió en
 * 2025. Sin declararlo, esa deuda **no se puede extinguir** —medido: 422, con
 * el mismo mensaje del alta— y quien atiende no tiene con qué resolverlo.
 *
 * <h2>Dos unidades, dos lecturas, y no es una asimetría gratuita</h2>
 *
 * El **predio** se pregunta con `titularesDelPredio`, que es la misma fuente y
 * la misma fecha que usa el servidor (`TitularesDelPredio.de(predioId,
 * fechaValor)`) y que además publica el nombre, así que el aviso puede decir de
 * quién es y no sólo que no es suyo. No sirve la lectura del padrón que usa el
 * alta: la fila trae el identificador interno y no el código predial, y
 * `GET /rentas/predios` **no admite `fecha`** —medido: «Parametro desconocido:
 * 'fecha'»—, de modo que contestaría por hoy sobre un acto con fecha valor de
 * la resolución.
 *
 * El **vehículo** se pregunta sin fecha, y no por descuido: `delVehiculo` del
 * backend recibe la fecha y **no la usa** —lee `vehiculo.contribuyenteId`, el
 * titular de hoy—, así que preguntar a otra fecha diría algo que el servidor no
 * mira. Y `/rentas/vehiculos` acota igual: el listado con `fecha=2024-01-01`
 * devuelve los mismos vehículos que sin ella, medido; esa fecha es la del corte
 * de la deuda de cada fila, no la de la titularidad.
 *
 * Es **una lectura por fila marcada** y por cambio de fecha: un clic
 * deliberado, no una tecla parada. Ésa es la diferencia con el alta, donde la
 * unidad se resuelve mientras se teclea y por eso no se pregunta por el titular
 * del predio —dejaría una fila de bitácora por pulsación—.
 *
 * Devuelve `null` cuando la obligación **no tiene unidad**: ahí el servidor no
 * comprueba nada —medido, 201— y no hay nada que declarar.
 *
 * <h2>Lo que cuesta, y qué pasa si no se puede pagar</h2>
 *
 * La lectura del titular pide el acceso `contribuyentes` y la de vehículos
 * `vehiculos`; quien no los tenga recibe un 403 y `useRecurso` lo deja en
 * `error`. Eso **no apaga la baja**: la unidad ya está identificada por la fila
 * y la comprobación de verdad la hace el servidor. Lo que se pierde es verlo
 * venir, y se dice —con la casilla al lado, por si quien atiende ya lo sabe—.
 */
async function resolverElCruceDeLaBaja(
  o: ObligacionConDeuda,
  codContribuyente: string,
  fechaValor: string,
  senal: AbortSignal,
): Promise<CruceDeLaUnidad | null> {
  if (o.predioId !== null) {
    const r = await titularesDelPredio(o.predioId, fechaValor, senal);
    /* Por código y no por identificador porque es lo único que la lectura
       publica. El `codigo` puede venir nulo —el titular que ya no está en el
       padrón—, y eso no falsea nada aquí: el contribuyente con el que se
       compara acaba de salir de una búsqueda del padrón, así que si fuera
       titular saldría con su código puesto. */
    if (r.titulares.some((t) => t.codigo === codContribuyente)) return { estado: 'suya' };
    /* Un predio sin ningún titular a esa fecha **entra** desde #680, y sin
       declarar nada: medido contra el backend, el alta sobre el predio 17 —que
       existe y no tiene titular vigente— devuelve su nota de abono. Hasta
       entonces esta rama devolvía «ajena», que hacía dos cosas mal: decía «así
       el servidor no la va a admitir», que es falso, y ofrecía la declaración de
       titular anterior, que aquí no hay que dar.

       Lo que el servidor sí sigue rechazando es el identificador que **no está
       en el padrón**, y ése no llega hasta aquí: la unidad se resolvió antes. */
    if (r.titulares.length === 0) return { estado: 'sin-titular', aLaFecha: r.vigenteA };
    const quienes = r.titulares.map((t) => `${t.nombre ?? 'sin nombre en el padrón'} (${t.codigo ?? SIN_DATO})`).join(', ');
    return { estado: 'ajena', de: `es de ${quienes} al ${r.vigenteA}` };
  }
  if (o.vehiculoId !== null) {
    const suyos = await listarVehiculosDelContribuyente(codContribuyente, { tamano: VEHICULOS_QUE_SE_CRUZAN }, senal);
    if (suyos.contenido.some((v) => v.vehiculoId === o.vehiculoId)) return { estado: 'suya' };
    if (suyos.hayMas)
      return {
        estado: 'sin-comprobar',
        por: `este contribuyente tiene ${suyos.totalElementos} vehículos y sólo se leyeron los ${VEHICULOS_QUE_SE_CRUZAN} primeros`,
      };
    return { estado: 'ajena', de: 'no figura entre los vehículos de este contribuyente' };
  }
  return null;
}

/**
 * La casilla con que quien atiende declara que la deuda es de un titular
 * anterior de la unidad (#635).
 *
 * <h2>Dónde vive, y por qué no en la rejilla de campos</h2>
 *
 * Marcarla es una **afirmación sobre un hecho** —«esta persona era titular de
 * esta unidad cuando nació esta deuda»— que se guarda con la observación del
 * acto y queda en la bitácora. Una casilla más entre las doce del formulario
 * estaría en pantalla también en las altas cuya unidad sí es del contribuyente,
 * que son casi todas, y una casilla que sobra casi siempre se acaba marcando
 * por inercia; cuando de verdad hiciera falta, ya no significaría nada. Aquí
 * sólo existe cuando el padrón acaba de decir, dos líneas más arriba y en la
 * misma tarjeta, que la unidad no es suya: es la respuesta a esa frase
 * concreta, no una opción del formulario.
 *
 * <h2>Y el rótulo dice lo que se afirma, no lo que hace</h2>
 *
 * «Permitir de todas formas» o «Omitir la comprobación» describen el efecto en
 * el servidor e invitan a marcar para seguir. Lo que se declara es otra cosa, y
 * se escribe entera, con el nombre del contribuyente y el de la unidad dentro:
 * quien la marca está firmando una frase, no desbloqueando un botón.
 */
function DeclaracionDeTitularAnterior({
  que,
  contribuyente,
  marcado,
  onCambio,
}: {
  /** Cómo se nombra la unidad en la frase: «el predio X», «el vehículo Y». */
  que: string;
  contribuyente: Contribuyente;
  marcado: boolean;
  onCambio: (v: boolean) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 10, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onCambio(e.target.checked)}
        style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto', marginTop: 2 }}
      />
      <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>
        {/* La frase empieza por la unidad y no por la persona, y no es sólo
            estilo: la otra redacción —«era titular de {que}»— compone «de el
            predio», y una contracción mal escrita en una frase que alguien
            firma la hace leerse como plantilla y no como declaración. */}
        Declaro que {que} era de <strong>{contribuyente.nombreRazonSocial}</strong> ({contribuyente.codigo}) cuando nació esta deuda.{' '}
        <span style={{ opacity: 0.85 }}>
          Queda en la bitácora con la observación del acto. Sin marcarla, el servidor rechaza el movimiento nombrando al titular que la
          unidad tiene a la fecha valor.
        </span>
      </span>
    </label>
  );
}

/**
 * La tarjeta que enseña **qué se resolvió** y de quién es (#554).
 *
 * Cuatro estados, y los cuatro se dicen distinto porque significan cosas
 * distintas: se está preguntando, no se pudo preguntar, el padrón contestó que
 * no hay nada con ese código, o hay unidad —y entonces se dice cuál, qué es y a
 * nombre de quién figura—.
 *
 * El cruce es **un aviso, no un bloqueo**, y es deliberado: la deuda de un
 * ejercicio anterior a una transferencia es del titular de entonces, no del de
 * ahora, así que un alta sobre la unidad de otro puede ser exactamente lo que
 * corresponde. Lo que no puede es pasar inadvertido.
 *
 * **Desde #635 el aviso lleva dentro la respuesta.** El servidor rechaza ese
 * alta con 422 salvo que la petición declare el caso, así que la tarjeta deja
 * de limitarse a advertir y ofrece la casilla que lo declara —aquí, pegada a la
 * frase que la justifica, y no en la rejilla de campos: ver
 * {@link DeclaracionDeTitularAnterior}—. Se ofrece en los **dos** estados que no
 * son «suya», y por motivos distintos: con `ajena` el padrón dijo que no lo es y
 * declararlo es obligatorio para poder mandar; con `sin-comprobar` el padrón no
 * dijo nada —no se pudo preguntar—, así que la unidad puede ser suya, el alta
 * se manda igual y la casilla está por si quien atiende sabe que no lo es.
 */
function UnidadDelAltaResuelta({
  escrito,
  enVuelo,
  error,
  unidad,
  contribuyente,
  declarado,
  onDeclarar,
}: {
  escrito: string;
  enVuelo: boolean;
  error: ErrorDeApi | null;
  unidad: UnidadDelAlta | null;
  contribuyente: Contribuyente;
  declarado: boolean;
  onDeclarar: (v: boolean) => void;
}) {
  if (enVuelo)
    return (
      <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)' }}>
        Resolviendo «{escrito}» contra el padrón…
      </p>
    );
  if (error !== null)
    return (
      <Aviso tono="bad" titulo="No se pudo comprobar la unidad">
        {explicacionDelFallo(error)} Mientras no se sepa qué unidad es, el alta no se manda: iría sobre otra obligación.
      </Aviso>
    );
  if (unidad === null) return null;
  if (unidad.clase === 'nada')
    return (
      <Aviso tono="warn" titulo={`«${escrito}» no está en ningún padrón`}>
        No es ningún código de referencia catastral del catastro ni ninguna placa del padrón vehicular. Corrígelo, o deja la caja en
        blanco para dar de alta la obligación <strong>sin unidad</strong>, que es otra distinta.
      </Aviso>
    );
  const esPredioDeLaUnidad = unidad.clase === 'predio';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          flexWrap: 'wrap',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '10px 12px',
          background: 'var(--bg-elev)',
        }}
      >
        <Insignia tono="ok">{esPredioDeLaUnidad ? 'PREDIO' : 'VEHÍCULO'}</Insignia>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{unidad.codigo}</span>
        <span style={{ flex: 1, minWidth: 120, fontSize: 12.5, color: 'var(--ink-3)' }}>
          {unidad.detalle === '' ? SIN_DATO : unidad.detalle}
        </span>
        {/* El identificador es lo ÚNICO que viaja, y por eso se enseña: es lo
            que separa esta obligación de la del mismo tributo sin unidad. */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {esPredioDeLaUnidad ? `predioId ${String(unidad.cuerpo.predioId)}` : `vehiculoId ${String(unidad.cuerpo.vehiculoId)}`}
        </span>
      </div>
      {/* La unidad existe y no figura a nombre de nadie: desde #680 el servidor
          lo ADMITE sin declaración. Se dice —quien atiende tiene que saber sobre
          qué carga— y no se ofrece la declaración, porque aquí no hay titular
          anterior que declarar. Sin esta rama la pantalla no diría nada. */}
      {unidad.cruce.estado === 'sin-titular' && (
        <Aviso tono="neutro" titulo={`La unidad resuelta no figura a nombre de nadie al ${unidad.cruce.aLaFecha}`}>
          Está en el padrón y su titularidad no está registrada, que es lo corriente en un padrón sin sanear —4 977 de los 14 422 predios
          de Catacaos están así—. El servidor lo admite tal cual y no hay nada que declarar: el cargo queda sobre{' '}
          {contribuyente.nombreRazonSocial} ({contribuyente.codigo}) y sobre esta unidad.
        </Aviso>
      )}
      {unidad.cruce.estado === 'ajena' && (
        <Aviso tono="warn" titulo={`La unidad resuelta ${unidad.cruce.de}`}>
          El alta se registra sobre {contribuyente.nombreRazonSocial} ({contribuyente.codigo}), y así el servidor no la va a admitir: desde
          #635 comprueba que la unidad sea suya a la fecha valor y responde 422 nombrando a su titular. Si la deuda es de un ejercicio
          anterior a la transferencia, decláralo aquí; si no lo es, corrige la unidad, porque la obligación quedaría colgada de una que no
          es la suya y no aparecería donde se la busca.
          <DeclaracionDeTitularAnterior
            que={`${esPredioDeLaUnidad ? 'el predio' : 'el vehículo'} ${unidad.codigo}`}
            contribuyente={contribuyente}
            marcado={declarado}
            onCambio={onDeclarar}
          />
        </Aviso>
      )}
      {unidad.cruce.estado === 'sin-comprobar' && (
        <Aviso tono="warn" titulo="No se pudo comprobar de quién es la unidad">
          {unidad.cruce.por}. La unidad está resuelta y el alta se puede mandar, pero de quién es no lo dice nadie: compruébalo antes. Y si
          ya sabes que no es suya —y aun así la deuda le corresponde—, decláralo aquí, porque el servidor sí lo va a comprobar.
          <DeclaracionDeTitularAnterior
            que={`${esPredioDeLaUnidad ? 'el predio' : 'el vehículo'} ${unidad.codigo}`}
            contribuyente={contribuyente}
            marcado={declarado}
            onCambio={onDeclarar}
          />
        </Aviso>
      )}
    </div>
  );
}

/**
 * Lo que se sabe de la unidad de la obligación marcada para la baja (#635).
 *
 * Es la gemela de {@link UnidadDelAltaResuelta} y contesta lo mismo, pero la
 * pregunta llega al revés: allí quien atiende teclea una unidad y hay que
 * resolverla; aquí la unidad ya viene con la fila y lo único que falta es de
 * quién es. Por eso no hay tarjeta con el identificador —la fila ya está
 * marcada en la tabla— y sólo se dibuja la frase.
 *
 * **La frase se dibuja también cuando la unidad SÍ es suya**, y es deliberado:
 * la columna «Unidad» de esa tabla enseña «—» porque el recurso publica el
 * identificador interno y no el código predial ni la placa, de modo que ésta es
 * la única línea de la pantalla que dice sobre qué unidad cae la baja y a
 * nombre de quién está. Sin ella, el silencio del caso bueno sería
 * indistinguible del de una obligación sin unidad.
 */
function UnidadDeLaBajaCruzada({
  obligacion,
  cargando,
  error,
  cruce,
  contribuyente,
  declarado,
  onDeclarar,
}: {
  obligacion: ObligacionConDeuda;
  cargando: boolean;
  error: ErrorDeApi | null;
  cruce: CruceDeLaUnidad | null;
  contribuyente: Contribuyente;
  declarado: boolean;
  onDeclarar: (v: boolean) => void;
}) {
  /* Sin unidad no hay nada que comprobar ni que declarar: medido, el servidor
     ni mira. Y no se dice nada, porque decir «esta obligación no tiene unidad»
     en cada baja corriente sería ruido. */
  if (obligacion.predioId === null && obligacion.vehiculoId === null) return null;
  const que =
    obligacion.predioId !== null
      ? `el predio (predioId ${String(obligacion.predioId)})`
      : `el vehículo (vehiculoId ${String(obligacion.vehiculoId)})`;

  if (cargando)
    return (
      <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)' }}>
        Comprobando de quién es {que}…
      </p>
    );
  if (error !== null)
    return (
      <Aviso tono="warn" titulo="No se pudo comprobar de quién es la unidad">
        {explicacionDelFallo(error)} La baja se puede mandar igual, pero el servidor sí lo comprueba: si {que} ya no es suyo, va a
        rechazarla nombrando a su titular.
        <DeclaracionDeTitularAnterior que={que} contribuyente={contribuyente} marcado={declarado} onCambio={onDeclarar} />
      </Aviso>
    );
  if (cruce === null) return null;
  if (cruce.estado === 'suya')
    return (
      <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
        {conMayuscula(que)} es de {contribuyente.nombreRazonSocial} a la fecha de la resolución.
      </p>
    );
  /* Ni bloquea ni pide nada: es un estado legítimo del padrón y el servidor lo
     admite. Se dice —quien atiende tiene que saber sobre qué está cargando— y se
     dice en tono neutro, porque no hay nada que corregir. */
  if (cruce.estado === 'sin-titular')
    return (
      <Aviso tono="neutro" titulo={`${conMayuscula(que)} no figura a nombre de nadie al ${cruce.aLaFecha}`}>
        Está en el padrón y su titularidad no está registrada, que es lo corriente en un padrón sin sanear. El servidor lo admite tal cual
        y no hay nada que declarar: el cargo queda sobre {contribuyente.nombreRazonSocial} ({contribuyente.codigo}) y sobre esta unidad.
      </Aviso>
    );
  if (cruce.estado === 'sin-comprobar')
    return (
      <Aviso tono="warn" titulo="No se pudo comprobar de quién es la unidad">
        {cruce.por}. La baja se puede mandar igual, pero el servidor sí lo comprueba: si {que} ya no es suyo, va a rechazarla nombrando a
        su titular.
        <DeclaracionDeTitularAnterior que={que} contribuyente={contribuyente} marcado={declarado} onCambio={onDeclarar} />
      </Aviso>
    );
  return (
    <Aviso tono="warn" titulo={`${conMayuscula(que)} ${cruce.de}`}>
      La baja se registra sobre {contribuyente.nombreRazonSocial} ({contribuyente.codigo}), y así el servidor no la va a admitir. Que la
      deuda siga en su cuenta y la unidad ya no sea suya es lo corriente cuando el predio cambió de dueño después de que la deuda naciera:
      la de entonces es suya y se le extingue a él. Eso hay que declararlo.
      <DeclaracionDeTitularAnterior que={que} contribuyente={contribuyente} marcado={declarado} onCambio={onDeclarar} />
    </Aviso>
  );
}

const SIN_DATO = '—';

/**
 * Cuántas unidades se piden por página en el expediente.
 *
 * No es una cifra cómoda: `MUNICIPALIDAD DISTRITAL DE CATACAOS` tiene **105
 * predios** en el padrón real, y es el único de los 400 contribuyentes medidos
 * que pasa de 4. Pedirlos todos de una vez sería una página de 105 filas dentro
 * de una sección plegada; pedir 50 y callarlo sería decir «105 predios» encima
 * de una rejilla de 50.
 */
const UNIDADES_POR_PAGINA = 20;

/**
 * Una tabla del expediente que la llena el backend, no el catálogo.
 *
 * <h2>Las tres respuestas de `GET /rentas/predios`, dichas por separado (#541)</h2>
 *
 * Hasta #541 esa lectura contestaba `200` con la página vacía tanto si faltaba
 * el parámetro como si el código no estaba en el padrón como si la persona no
 * tenía predios, y las tres se dibujaban igual. Ahora son tres, y aquí se
 * separan porque **no se parecen en nada para quien atiende**:
 *
 * <ul>
 *   <li>`404 NO_ENCONTRADO` — el código no está en el padrón. No es «no tiene
 *       predios»: es «esa persona no existe», y aquí sólo puede pasar si le
 *       dieron de baja entre la lectura de la ficha y ésta. Se dice así, sin
 *       ofrecer «reintentar»: volver a pulsar no la trae de vuelta.
 *   <li>`422 VALIDACION` — la petición no dijo de quién. Desde esta pantalla no
 *       debería ocurrir nunca —la lectura no se activa sin contribuyente
 *       abierto— y por eso, si ocurre, es un defecto de la interfaz y no del
 *       dato: `FalloDeLectura` lo dice con el mensaje del servidor.
 *   <li>`200` con cero filas — el único que de verdad significa «no tiene».
 * </ul>
 *
 * El resto de fallos —permiso, sesión, red— los reparte `FalloDeLectura`, que
 * ya distingue lo que se arregla reintentando de lo que no.
 */
function TablaLeida<T>({
  tabla,
  estado,
  fila,
  vacia,
  sinPreguntar,
  cuenta,
  irAPagina,
}: {
  tabla: TablaDef;
  estado: { datos: RespuestaPaginada<T> | null; cargando: boolean; error: ErrorDeApi | null; reintentar: () => void };
  fila: (x: T) => string[];
  /** Qué decir cuando la lectura fue bien y no trajo ninguna. */
  vacia: string;
  /** Qué decir cuando la lectura NO se llegó a hacer, y por qué (#595). */
  sinPreguntar: string;
  /** Cómo se cuenta lo que trajo: «3 predios», «1 vehículo». */
  cuenta: (n: number) => string;
  /* El numero de pagina NO entra por aqui: el pie lo lee del sobre, que es
     quien lo publica. Pasarlo ademas seria tenerlo en dos sitios, y el dia que
     uno se adelantara al otro la tabla diria una pagina y el pie otra. */
  irAPagina: (n: number) => void;
}) {
  const filas = (estado.datos?.contenido ?? []).map(fila);
  const total = estado.datos?.totalElementos ?? 0;
  /* El 404 no es un fallo de lectura sino una respuesta: la persona no está.
     Pasarlo por `FalloDeLectura` lo rotularía «No se encontró …» en rojo junto
     a un botón de reintentar, y lo que hay que hacer no es insistir. */
  const noEstaEnElPadron = estado.error !== null && estado.error.codigo === 'NO_ENCONTRADO';
  /* La lectura no se hizo: `useRecurso` con `activo=false` deja los tres
     campos en reposo —sin datos, sin cargar, sin error—, que es EXACTAMENTE la
     forma de una lectura que fue bien y trajo cero filas. Sin distinguirlas, la
     tabla de un contribuyente que la ficha no resolvió decía «está en el padrón
     y no tiene ninguno» debajo del aviso que acababa de decir que no está: las
     dos cosas a la vez, y la de abajo falsa. Es el mismo defecto que #595
     arregló un piso más abajo, en el backend, y que aquí seguía en pie porque
     la interfaz ni siquiera llegaba a preguntar. */
  const noSePregunto = estado.datos === null && !estado.cargando && estado.error === null;
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px' }}>
        <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 500 }}>{tabla.titulo}</p>
        <span style={META}>
          {estado.cargando ? 'consultando…' : estado.error !== null || noSePregunto ? SIN_DATO : cuenta(total)}
        </span>
      </div>
      {noEstaEnElPadron && (
        <div style={{ padding: '0 16px 12px' }}>
          <Aviso tono="warn" titulo="Ese código no está en el padrón">
            {estado.error?.mensaje}. No es que no tenga: es que el padrón no reconoce el código, así que no hay de quién listar. Puede
            haberse dado de baja entre la lectura de la ficha y ésta.
          </Aviso>
        </div>
      )}
      {estado.error !== null && !noEstaEnElPadron && (
        <div style={{ padding: '0 16px 12px' }}>
          <FalloDeLectura error={estado.error} que={'los ' + tabla.titulo.toLowerCase()} alReintentar={estado.reintentar} />
        </div>
      )}
      {!noEstaEnElPadron && (
        <div style={{ borderTop: '1px solid var(--line)' }}>
          <TablaDeDatos
            cols={tabla.cols}
            filas={filas}
            min={tabla.min}
            vacia={
              estado.cargando ? 'Consultando el padrón…' : estado.error !== null ? undefined : noSePregunto ? sinPreguntar : vacia
            }
          />
        </div>
      )}
      {/* La tabla PAGINA, y no es un adorno: `MUNICIPALIDAD DISTRITAL DE
          CATACAOS` tiene **105 predios** en el padrón real (medido). Pidiendo
          una página grande y dejándolo ahí, la franja diría «105 predios» y la
          rejilla enseñaría 50: el recuento y lo que se ve discreparían sin que
          nada lo dijera, que es la forma silenciosa del mismo defecto que esta
          sección acaba de dejar atrás. */}
      {estado.datos !== null && (
        <Paginador
          pagina={estado.datos.pagina}
          totalPaginas={estado.datos.totalPaginas}
          hayMas={estado.datos.hayMas}
          ir={irAPagina}
        />
      )}
      {tabla.nota !== undefined && <p style={PIE}>{tabla.nota}</p>}
    </div>
  );
}

/**
 * Una de las tres listas que vienen dentro de la ficha, no de una lectura propia.
 *
 * Domicilios, contactos y responsables llegan en **la misma respuesta** que el
 * resto del expediente —`GET /rentas/contribuyentes/{id}/ficha` los trae en una
 * sola transacción a propósito (#486)—, así que no tienen sobre paginado, ni
 * error propio, ni permiso propio: o está la ficha o no está ninguna de las
 * tres. Por eso no se dibujan con `TablaLeida`, que pagina y reparte fallos, y
 * por eso el fallo se dice **una vez** arriba y aquí sólo se remite a él:
 * repetir el mismo aviso tres veces haría creer que fallaron tres cosas.
 *
 * Y por eso hay que distinguir «no se preguntó» de «no hay ninguno»: son la
 * misma forma —cero filas— y significan lo contrario (#595).
 */
function TablaDeLaFicha({
  tabla,
  estado,
  filas,
  vacia,
  cuenta,
}: {
  tabla: TablaDef;
  estado: { datos: FichaDelContribuyente | null; cargando: boolean; error: ErrorDeApi | null };
  /** Qué filas salen de la ficha. Se llama sólo cuando la hay. */
  filas: (ficha: FichaDelContribuyente) => string[][];
  /** Qué decir cuando la ficha se leyó y esta lista viene vacía. */
  vacia: string;
  cuenta: (n: number) => string;
}) {
  const cuerpo = estado.datos === null ? [] : filas(estado.datos);
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px' }}>
        <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 500 }}>{tabla.titulo}</p>
        <span style={META}>
          {estado.cargando ? 'consultando…' : estado.datos === null ? SIN_DATO : cuenta(cuerpo.length)}
        </span>
      </div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        <TablaDeDatos
          cols={tabla.cols}
          filas={cuerpo}
          min={tabla.min}
          vacia={
            estado.cargando
              ? 'Consultando la ficha…'
              : estado.datos !== null
                ? vacia
                : estado.error !== null
                  ? 'No se pudo leer la ficha del contribuyente: el aviso del principio del expediente dice por qué.'
                  : 'No se ha preguntado: sin un contribuyente del padrón abierto no hay ficha que leer. Pasa con un expediente nuevo y con un código que el padrón no reconoce.'
          }
        />
      </div>
      {tabla.nota !== undefined && <p style={PIE}>{tabla.nota}</p>}
    </div>
  );
}

/**
 * Toda clave que el expediente dibuja, computada **del catálogo** y no a mano.
 *
 * De aquí salen dos cosas: qué se borra al cambiar de contribuyente —para que lo
 * tecleado sobre uno no se guarde sobre el siguiente— y, sobre todo, qué campos
 * hay que comparar contra la lista blanca del PUT. Escrita a mano, un campo
 * nuevo del catálogo no aparecería en ninguna de las dos comprobaciones y el
 * silencio sería el de siempre: se teclea, no viaja, y nadie se entera.
 */
const CLAVES_DEL_EXPEDIENTE: string[] = EXPEDIENTE.flatMap((seccion) =>
  seccion.bloques.flatMap((bloque) => bloque.campos.map((c) => c.k)),
);

/**
 * Las cinco claves que `PUT /rentas/contribuyentes/{id}` admite, y ninguna más.
 *
 * Es **la misma lista blanca** que declara `CorreccionDeContribuyente`, aquí
 * puesta a trabajar sobre el formulario: lo que se teclee en una clave que no
 * esté aquí no compone el cuerpo y además **apaga el botón**, nombrando el
 * campo. La otra salida —ignorarlo en silencio— es la que produce el defecto
 * que #331 midió: quien atiende teclea, ve el dato en pantalla, guarda, y lo
 * tecleado no llega a ninguna parte.
 *
 * `activo` no está, aunque el PUT lo admita: `activo = false` es la baja, exige
 * el privilegio ELIMINACION y no es una corrección de ficha. Compartir botón
 * con el nombre haría que un descuido diera de baja a quien se corregía.
 */
const CAMPOS_DE_LA_CORRECCION = ['nombreRazonSocial', 'condicionEspecial', 'fechaNacimiento', 'estadoCivil', 'conyugeId'] as const;

/** El estado civil es `varchar(20)`; el dominio rechaza lo que pase de ahí. */
const ESTADO_CIVIL_MAXIMO = 20;

/** La cabecera pulsable de una sección plegable. */
function Cabecera({
  abierta,
  onToggle,
  label,
  hint,
  marca,
}: {
  abierta: boolean;
  onToggle: () => void;
  label: string;
  hint: string;
  marca?: ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={abierta}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        width: '100%',
        border: 0,
        background: 'transparent',
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={caret(abierta)}>
        <Icono d={CARET} tam={13} grosor={2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{hint}</span>
      </span>
      {marca !== undefined && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', flex: '0 0 auto' }}>{marca}</span>
      )}
    </button>
  );
}

/* ══════════ El módulo ══════════ */

export default function Rentas({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const modulo = moduloDe('rentas');

  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [sucio, setSucio] = useState(false);
  /* La observación de la corrección del expediente (regla 10, RNF-052). Va
     aparte de `observacionDelActo` —la de la transferencia y la de los
     movimientos de deuda— a propósito: son actos distintos, y una observación
     escrita para uno no explica el otro. */
  const [observacionDeLaCorreccion, setObservacionDeLaCorreccion] = useState('');
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [cerradas, setCerradas] = useState<Record<string, boolean>>({});
  const [sujeto, setSujeto] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [paginaPadron, setPaginaPadron] = useState(0);

  /**
   * El padrón, contra `GET /api/v1/rentas/contribuyentes`.
   *
   * Un solo campo para cuatro filtros: lo tecleado se manda por `dNI` si son
   * ocho dígitos, por `nombreRazonSocial` si no es todo dígitos, y por `rUC` **y**
   * `codigo` a la vez cuando son once —las dos formas caben en esa longitud y
   * nada las distingue—. Es lo que el buscador del artboard promete —«Nombre,
   * DNI, RUC, código»— y el backend no tiene un campo único que lo haga.
   */
  const criterio = useRebote(q.trim());
  useEffect(() => setPaginaPadron(0), [criterio]);
  const padron = useRecurso(
    (senal) => padronPorCriterio(criterio, { pagina: paginaPadron, tamano: 20 }, senal),
    [criterio, paginaPadron],
    dest === 'padron' && sujeto === null,
  );
  const filasDelPadron = padron.datos?.contenido ?? [];

  /**
   * El contribuyente del expediente, leído del backend.
   *
   * Sin esto, `sujeto` solo decidía SI se dibujaba el expediente y nunca DE
   * QUIÉN: el cuerpo entero salía del juego de datos, así que pulsar cualquier
   * fila del padrón real abría la ficha de otra persona —con su nombre, su
   * documento, sus predios y su deuda— y encima los botones de determinar,
   * transferir y dar de alta deuda.
   */
  const expediente = useRecurso(
    (senal) => buscarContribuyentes({ codigo: sujeto! }, { tamano: 2 }, senal),
    [sujeto],
    sujeto !== null && dest !== 'alta',
  );
  const contribuyenteAbierto =
    (expediente.datos?.contenido ?? []).find((c) => c.codigo === sujeto) ?? null;

  /**
   * Las unidades afectas del contribuyente abierto, leídas de su padrón (#541).
   *
   * Las dos se piden con el código **que la ficha acaba de resolver** y no con
   * `sujeto`: así no se pregunta por alguien que la lectura anterior no
   * encontró, y las tres respuestas quedan bien repartidas —el 404 pasa a ser
   * el caso raro que se explica, no el corriente—.
   *
   * **Y desde #595 las dos contestan lo mismo a la misma pregunta.** Hasta ese
   * arreglo, `/rentas/vehiculos` daba `200` con cero filas para un código que
   * no está en el padrón mientras `/rentas/predios` daba `404`, así que la
   * misma sección afirmaba a la vez que la persona no existe y que existe y no
   * tiene vehículos. Se piden con el mismo nombre de parámetro por lo mismo:
   * `codContribuyente` en las dos.
   *
   * Cuando la ficha NO resuelve el código, las dos quedan `activo=false` y no
   * se pide ninguna. Ese reposo lo dibuja `TablaLeida` con su propio texto: sin
   * él es indistinguible de una lectura que trajo cero filas. El texto vale
   * también para el expediente nuevo —que tampoco pregunta, porque todavía no
   * hay a quién— y por eso no apunta al aviso de arriba, que ahí no está.
   *
   * Son dos lecturas y no una porque son dos padrones con dos permisos:
   * `predios_rentas` y `vehiculos`. Quien tenga uno y no el otro ve la tabla
   * que puede y el aviso de permiso en la que no, en vez de perder las dos.
   */
  /* Cambiar de contribuyente vuelve a la primera página de las dos: sin esto,
     abrir a alguien con un predio estando en la página 3 del anterior deja las
     dos tablas vacías sin motivo. */
  const [paginaDePredios, setPaginaDePredios] = useState(0);
  const [paginaDeVehiculos, setPaginaDeVehiculos] = useState(0);
  const [paginaDeBeneficios, setPaginaDeBeneficios] = useState(0);
  useEffect(() => {
    setPaginaDePredios(0);
    setPaginaDeVehiculos(0);
    setPaginaDeBeneficios(0);
  }, [contribuyenteAbierto?.codigo]);

  const prediosDelContribuyente = useRecurso(
    (senal) => listarPrediosDelContribuyente(contribuyenteAbierto!.codigo, {}, { pagina: paginaDePredios, tamano: UNIDADES_POR_PAGINA }, senal),
    [contribuyenteAbierto?.codigo, paginaDePredios],
    contribuyenteAbierto !== null,
  );
  const vehiculosDelContribuyente = useRecurso(
    (senal) => listarVehiculosDelContribuyente(contribuyenteAbierto!.codigo, { pagina: paginaDeVehiculos, tamano: UNIDADES_POR_PAGINA }, senal),
    [contribuyenteAbierto?.codigo, paginaDeVehiculos],
    contribuyenteAbierto !== null,
  );

  /**
   * La ficha del contribuyente abierto (#552).
   *
   * Es la lectura que le faltaba al expediente entero. Hasta aquí, de los
   * cincuenta y pico campos que dibuja **ninguno** salía del backend: el código,
   * el documento, el nombre partido en cuatro, los dieciséis del domicilio, los
   * contactos, el beneficio y la bitácora eran constantes de la maqueta, y se
   * dibujaban en cuanto se abría a cualquiera —la ficha de una persona bajo el
   * nombre de otra, indistinguible de la suya—.
   *
   * Se pide por el **identificador interno** y no por el código, porque la ruta
   * es `/rentas/contribuyentes/{id}/ficha`; el `id` sale de la fila que la
   * búsqueda ya devolvió, así que no se pregunta por alguien que la lectura
   * anterior no encontró.
   *
   * `fecha` va ausente: es hoy, con el reloj del servidor. Lo vigente se
   * resuelve A ESA FECHA y no «lo último» (regla 9), y por eso la cabecera del
   * domicilio dice a qué fecha rige lo que enseña.
   */
  const ficha = useRecurso(
    (senal) => fichaDelContribuyente(contribuyenteAbierto!.id, undefined, senal),
    [contribuyenteAbierto?.id],
    contribuyenteAbierto !== null,
  );

  /**
   * Los beneficios del contribuyente, de su propia lectura.
   *
   * Va aparte de la ficha porque es de **otro contexto y otro permiso**:
   * `beneficios`, no `contribuyentes`. Quien tenga el padrón y no los beneficios
   * ve el resto del expediente y el aviso de permiso sólo en esta lista, en vez
   * de perder las seis secciones.
   *
   * Se pide por el **código** del padrón, no por el identificador: lo dice
   * `CriterioDeBeneficio` campo por campo.
   */
  const beneficios = useRecurso(
    (senal) => beneficiosDelContribuyente(contribuyenteAbierto!.codigo, { pagina: paginaDeBeneficios, tamano: UNIDADES_POR_PAGINA }, senal),
    [contribuyenteAbierto?.codigo, paginaDeBeneficios],
    contribuyenteAbierto !== null,
  );

  /**
   * Quién es el cónyuge, resuelto para poder enseñarlo por su código.
   *
   * La ficha publica `conyugeId` —el identificador interno— y su javadoc dice
   * por qué: resolver el nombre costaría una consulta más por ficha, «y quien lo
   * necesite lo pide como pide cualquier otro contribuyente». Eso es
   * exactamente lo que se hace aquí, y sólo cuando hay cónyuge.
   *
   * Importa para lo que se teclea, no para lo que se lee: el control pregunta
   * por el **código del padrón** y no por el identificador, porque un número
   * interno tecleado a mano enlazaría con quien no es sin que nada lo dijera
   * —es el defecto del «Solicitante» que #427 midió, al revés—. Para que «no
   * tocar el campo» signifique «no cambiar nada», el valor que se dibuja tiene
   * que ser el mismo código que se teclearía.
   */
  const conyugeDeLaFicha = ficha.datos?.datosPersonales.conyugeId ?? null;
  const conyugeActual = useRecurso(
    (senal) => fichaDelContribuyente(conyugeDeLaFicha!, undefined, senal),
    [conyugeDeLaFicha],
    conyugeDeLaFicha !== null,
  );

  /**
   * Lo que el expediente enseña de la ficha, campo por campo.
   *
   * Es el único origen de los controles del expediente: `valorDeClave` lo
   * consulta antes que ningún valor por omisión, y del catálogo desaparecieron
   * los que había. Lo que la ficha no publica no aparece aquí, y entonces el
   * control sale con el guion largo —los de solo lectura— o en blanco —los que
   * se escriben—, nunca con una cifra ni un texto que nadie ha dado.
   */
  const delExpediente: Record<string, string> = (() => {
    const f = ficha.datos;
    if (f === null) {
      /* Sin ficha no hay dato: los de solo lectura dicen «—» y los que se
         escriben se quedan vacíos. Un «—» dentro de una caja de texto viajaría
         como texto la primera vez que alguien guardara. */
      const enBlanco: Record<string, string> = {};
      for (const clave of CLAVES_DEL_EXPEDIENTE) {
        enBlanco[clave] = (CAMPOS_DE_LA_CORRECCION as readonly string[]).includes(clave) ? '' : ficha.cargando ? '…' : SIN_DATO;
      }
      return enBlanco;
    }
    const fiscal = f.domicilioFiscal;
    const procesal = f.domicilioProcesal;
    return {
      codigo: f.contribuyente.codigo,
      /* El tipo delante del número, que es como el padrón lo guarda: seis tipos
         admitidos, y sin el tipo el número no se puede ni validar. */
      documento: `${f.contribuyente.tipoDocumento} ${f.contribuyente.numeroDocumento}`,
      tipoPersona: f.contribuyente.tipoPersona,
      estado: f.contribuyente.activo ? 'ACTIVO' : 'INACTIVO',
      nombreRazonSocial: f.contribuyente.nombreRazonSocial,
      condicionEspecial: f.contribuyente.condicionEspecial ?? '',
      fechaNacimiento: f.datosPersonales.fechaNacimiento ?? '',
      estadoCivil: f.datosPersonales.estadoCivil ?? '',
      /* Mientras la segunda lectura no vuelva, el campo queda vacío: enseñar el
         identificador interno en una caja que pide un código haría que guardar
         mandase el número equivocado. */
      conyugeId: conyugeActual.datos?.contribuyente.codigo ?? '',
      domDireccion: fiscal?.direccion ?? SIN_DATO,
      domReferencia: fiscal?.referencia ?? SIN_DATO,
      domUbigeo: fiscal?.ubigeo ?? SIN_DATO,
      domDesde: fiscal?.vigenciaDesde ?? SIN_DATO,
      domOrigen: fiscal?.documentoOrigen ?? SIN_DATO,
      procDireccion: procesal?.direccion ?? SIN_DATO,
      procDesde: procesal?.vigenciaDesde ?? SIN_DATO,
      procOrigen: procesal?.documentoOrigen ?? SIN_DATO,
    };
  })();

  const cargando = padron.cargando;
  const vacio = !padron.cargando && padron.error === null && padron.datos !== null && filasDelPadron.length === 0;
  const [tipo, setTipo] = useState<ClaveDeDeterminacion>('predial');
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [trTipo, setTrTipo] = useState<ClaveDeTransferencia>('predio');
  const [trPaso, setTrPaso] = useState(0);
  const [hoja, setHoja] = useState<'alta' | 'baja'>('alta');
  /* Una obligación por acto: `MovimientoDeDeuda` extingue UNA `ClaveDeSaldo`, así
     que la tabla elige una fila y no un conjunto. Antes eran cuatro casillas
     premarcadas sobre filas de la maqueta que además nadie leía al mandar. */
  const [obligacionMarcada, setObligacionMarcada] = useState<number | null>(null);
  /**
   * Dónde corta la tabla de la baja: por obligación o por cuota (#551).
   *
   * Son dos actos distintos, no dos formas de ver el mismo, y por eso se elige
   * antes de marcar nada: la obligación entera se extingue con el total del
   * acto y `repartir`, y una cuota con su propio desglose. La lectura es la
   * misma operación con `porPeriodo`, así que cambiar aquí vuelve a pedirla.
   *
   * Empieza **por obligación**, que es lo que la prescripción de un ejercicio
   * necesita y lo que la pantalla hacía: la cuota es para el caso en que la
   * resolución alcanza a una y no a las otras.
   */
  const [bajaPorCuota, setBajaPorCuota] = useState(false);
  /* La hoja resumen es la de UNA declaración jurada, y hasta ahora la pantalla no
     preguntaba por ninguna: dibujaba la de la maqueta con cualquier sesión y sin
     haber abierto a nadie. El número lo teclea quien atiende —es el que lleva
     impreso el cargo— y el año es el del selector del shell, que es el mismo que
     la hoja imprime bajo el título. */
  const [djNro, setDjNro] = useState('');
  /* Vacía es hoy, y lo resuelve el servidor: escribir aquí `LocalDate.now()` del
     navegador daría una fecha distinta de la que el backend usa para resolver el
     domicilio y la titularidad, y la hoja iría fechada con una y compuesta con otra. */
  const [djFecha, setDjFecha] = useState('');

  /* El expediente se abre sobre el destino «Contribuyentes», como en el
     artboard. Al cambiar de destino se suelta el sujeto, salvo cuando es la
     propia navegación la que lo trae —la paleta abre el expediente—. */
  const sujetoAlLlegar = useRef<string | null>(null);
  const sujetoDeDeudaAlLlegar = useRef<Contribuyente | null>(null);
  useEffect(() => {
    if (sujetoAlLlegar.current) {
      setSujeto(sujetoAlLlegar.current);
      sujetoAlLlegar.current = null;
    } else {
      setSujeto(null);
    }
    if (sujetoDeDeudaAlLlegar.current) {
      setSujetoDeDeuda(sujetoDeDeudaAlLlegar.current);
      sujetoDeDeudaAlLlegar.current = null;
    }
  }, [dest]);

  const esNuevo = dest === 'alta';

  /**
   * La franja del expediente.
   *
   * Con un contribuyente abierto son sus datos y **nada más**: el código, el
   * documento, si es natural o jurídica y su condición especial, que es lo que
   * `ContribuyenteResource` publica. Predios, autovalúo, vehículos y deuda
   * salen «—»: viven en catastro, en el padrón vehicular y en cuenta corriente,
   * y ponerlos aquí desde el juego de datos era enseñar la ficha de otra
   * persona bajo el nombre de quien se acaba de buscar.
   */
  const resumenDelExpediente: { etiqueta: string; valor: string; color: string }[] = contribuyenteAbierto
    ? [
        { etiqueta: 'Código', valor: contribuyenteAbierto.codigo, color: 'var(--ink)' },
        {
          etiqueta: 'Documento',
          valor: `${contribuyenteAbierto.tipoDocumento} ${contribuyenteAbierto.numeroDocumento}`,
          color: 'var(--ink)',
        },
        {
          etiqueta: 'Persona',
          /* Tal como el padrón lo guarda. Decía «Jurídica» o «Natural» y son
             CUATRO —`TipoPersona` declara además `SUCESION_INDIVISA` y
             `SOCIEDAD_CONYUGAL`—, así que una sucesión indivisa salía rotulada
             «Natural»: no es un matiz, es quién responde por la deuda y aparece
             en cuanto muere un propietario. La celda de una ficha no traduce un
             vocabulario del sistema a otro más corto (#427). */
          valor: contribuyenteAbierto.tipoPersona,
          color: 'var(--ink)',
        },
        { etiqueta: 'Condición especial', valor: contribuyenteAbierto.condicionEspecial ?? '—', color: 'var(--ink)' },
        { etiqueta: 'Estado', valor: contribuyenteAbierto.activo ? 'Activo' : 'Inactivo', color: contribuyenteAbierto.activo ? 'var(--ok-fg)' : 'var(--bad-fg)' },
        { etiqueta: 'Deuda', valor: '—', color: 'var(--ink-4)' },
      ]
    : esNuevo
      ? [
          { etiqueta: 'Código', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Documento', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Persona', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Condición especial', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Estado', valor: 'Sin registrar', color: 'var(--warn-fg)' },
          { etiqueta: 'Deuda', valor: '—', color: 'var(--ink-4)' },
        ]
      : /* Ni con la lectura caída ni con un código que no está en el padrón se
           dibuja nada: antes salían aquí las seis celdas del juego de datos
           —código 00000025673, DNI 03593174, dos predios, S/ 170,616.75 de
           autovalúo y S/ 1,842.60 de deuda— bajo el código real de quien se
           acababa de pulsar. Seis cifras de otra persona, indistinguibles de las
           suyas. El aviso de por qué no hay nada lo pone `FalloDeLectura`. */
        [
          { etiqueta: 'Código', valor: sujeto ?? '—', color: 'var(--ink)' },
          { etiqueta: 'Documento', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Persona', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Condición especial', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Estado', valor: expediente.cargando ? '…' : '—', color: 'var(--ink-4)' },
          { etiqueta: 'Deuda', valor: '—', color: 'var(--ink-4)' },
        ];
  useEffect(() => {
    if (esNuevo) {
      setCerradas({});
      toast('Expediente nuevo: seis secciones, la primera abierta.');
    }
  }, [esNuevo, toast]);

  /* Lo tecleado sobre un contribuyente NO se arrastra al siguiente. `vals` es
     del módulo entero —lo comparten las determinaciones, las transferencias y
     las dos hojas de deuda—, así que sólo se sueltan las claves del expediente:
     sin esto, corregir un nombre, cambiar de persona y pulsar «Guardar cambios»
     escribiría el nombre del primero sobre la ficha del segundo. La observación
     se va con ellas por lo mismo: es el motivo de un cambio que ya no está. */
  useEffect(() => {
    setVals((s2) => {
      const limpio = { ...s2 };
      for (const clave of CLAVES_DEL_EXPEDIENTE) delete limpio[clave];
      return limpio;
    });
    setObservacionDeLaCorreccion('');
  }, [contribuyenteAbierto?.id]);

  const abrirExpediente = (codigo: string) => {
    setSucio(false);
    if (dest === 'padron') setSujeto(codigo);
    else {
      sujetoAlLlegar.current = codigo;
      onDest('padron');
    }
  };

  const set = (k: string, v: string | boolean) => {
    setVals((s) => ({ ...s, [k]: v }));
    setSucio(true);
  };
  /**
   * El valor de un campo, con la misma cadena para las cuatro funciones que lo
   * necesitan: lo tecleado, **lo que la ficha del contribuyente dice**, el valor
   * por omisión del propio campo y el de la maqueta. Antes `texto()` se saltaba
   * el segundo eslabón y devolvía otra cosa que la que la pantalla enseñaba.
   *
   * La ficha va delante de los dos por omisión y no detrás, y es lo que hace que
   * el expediente enseñe a quien está abierto: los valores de la maqueta que
   * había en `DEFECTOS` se fueron con #552, pero el orden importa igual —un
   * campo del expediente que mañana ganara un `v` en el catálogo taparía el dato
   * real del padrón—.
   */
  const valorDeClave = (k: string): string | boolean => {
    const v = vals[k];
    if (v !== undefined) return v;
    const deLaFicha = delExpediente[k];
    if (deLaFicha !== undefined) return deLaFicha;
    const propio = POR_OMISION_DEL_CAMPO[k];
    if (propio !== undefined) return propio;
    const d = DEFECTOS[k];
    return d === undefined ? '' : d;
  };
  const valorDe = (f: CampoDef): string | boolean => valorDeClave(f.k);
  const texto = (k: string) => {
    const v = valorDeClave(k);
    return typeof v === 'boolean' ? '' : v;
  };
  /** Una casilla se lee como booleano, nunca comparando su texto. */
  const marcado = (k: string) => valorDeClave(k) === true;
  const campo = (f: CampoDef) => <CampoDeFormulario key={f.k} f={f} valor={valorDe(f)} onCambio={(v) => set(f.k, v)} />;

  /* ── La corrección del contribuyente (#552) ───────────────────────────────
     «Guardar cambios» decía «Contribuyente guardado» y no mandaba nada. Lo que
     faltaba no era el botón: era saber QUÉ mandar. `PUT
     /rentas/contribuyentes/{id}` admite cinco campos y el expediente dibujaba
     cincuenta y tres de la maqueta, así que conectarlo tal cual habría escrito
     el nombre de «MEDINA MEDINA RUFINA» sobre la ficha de quien estuviera
     abierto. Ahora los campos salen de la ficha, y de ellos sólo viajan los
     cinco, sólo los que cambiaron y sólo con la observación puesta. */

  /**
   * El código del cónyuge tecleado, resuelto contra el padrón.
   *
   * Lo que viaja es `conyugeId`, un identificador interno, y lo que se teclea es
   * un código: sin resolverlo habría que pedirle a quien atiende un número que
   * no aparece en ninguna pantalla, y cualquier número enlazaría con alguien.
   * Se resuelve antes de habilitar el botón, no dentro del envío.
   */
  const conyugeTecleado = vals['conyugeId'] === undefined ? '' : String(vals['conyugeId']).trim();
  const conyugeEscrito = useRebote(conyugeTecleado);
  const conyugeBuscado = useRecurso(
    (senal) => buscarContribuyentes({ codigo: conyugeEscrito }, { tamano: 2 }, senal),
    [conyugeEscrito],
    contribuyenteAbierto !== null && conyugeEscrito !== '',
  );
  const conyugeResuelto = (conyugeBuscado.datos?.contenido ?? []).find((c) => c.codigo === conyugeEscrito) ?? null;

  /**
   * Los campos del expediente que se han tecleado y **el PUT no admite**.
   *
   * Hoy no puede haber ninguno: los demás controles del expediente son de solo
   * lectura y `CampoDeFormulario` no les dibuja ninguna entrada. Existe para el
   * día que alguien haga editable uno —o añada al catálogo un campo que la
   * petición no lleva—: entonces el botón se apaga nombrándolo, en vez de
   * guardar en silencio todo lo demás y dejar ese dato sin viajar, que es el
   * defecto de #331.
   */
  const camposQueElPutNoAdmite = CLAVES_DEL_EXPEDIENTE.filter(
    (clave) => vals[clave] !== undefined && !(CAMPOS_DE_LA_CORRECCION as readonly string[]).includes(clave),
  );

  /** Lo tecleado en una clave de la corrección, o `undefined` si no se tocó. */
  const tecleadoEnLaCorreccion = (clave: string): string | undefined =>
    vals[clave] === undefined ? undefined : String(vals[clave]).trim();

  /**
   * Lo que de verdad cambia, comparado contra lo que la ficha dice.
   *
   * «Lo que no viene, no cambia» es la regla del PUT, así que un campo que se
   * tecleó y quedó igual **no se manda**: mandarlo escribiría el mismo valor con
   * otra fila de auditoría detrás. Y la cadena vacía sí se manda cuando la ficha
   * traía algo, porque ahí es una instrucción —«bórralo»— y no una omisión.
   */
  const cambiosDeLaCorreccion: [clave: string, valor: string][] = CAMPOS_DE_LA_CORRECCION.filter((clave) => {
    const tecleado = tecleadoEnLaCorreccion(clave);
    return tecleado !== undefined && tecleado !== (delExpediente[clave] ?? '').trim();
  }).map((clave) => [clave, tecleadoEnLaCorreccion(clave)!]);

  /** Hay algo escrito sobre el expediente: la barra de guardado tiene por qué salir. */
  const hayBorradorDelExpediente =
    CLAVES_DEL_EXPEDIENTE.some((clave) => vals[clave] !== undefined) || observacionDeLaCorreccion !== '';

  /**
   * Lo que impide guardar la corrección, o `undefined` si nada lo impide.
   *
   * Se calcula ANTES de habilitar el botón y no dentro del envío: un acto que
   * promete lo que no puede es peor que uno apagado que dice por qué (RNF-082).
   */
  const impedimentoDeLaCorreccion = (): string | undefined => {
    if (esNuevo)
      return 'El alta de un contribuyente todavía no está conectada: «POST /rentas/contribuyentes» existe y esta pantalla no lo llama. Aquí sólo se corrige a quien ya está en el padrón.';
    if (contribuyenteAbierto === null)
      return 'No hay ningún contribuyente abierto: sin saber a quién se corrige no hay nada que guardar.';
    if (camposQueElPutNoAdmite.length > 0)
      return `El expediente escribe ${camposQueElPutNoAdmite.map((c) => `«${c}»`).join(', ')}, y «PUT /rentas/contribuyentes/{id}» no admite ese campo: guardar lo dejaría sin viajar sin que nada lo dijera. Sólo viajan el nombre o razón social, la condición especial, la fecha de nacimiento, el estado civil y el cónyuge.`;
    if (ficha.datos === null)
      return ficha.cargando
        ? 'Leyendo la ficha del contribuyente…'
        : 'No se ha podido leer la ficha, así que no se sabe qué cambia: guardar mandaría campos que nadie ha comparado con lo que el padrón tiene.';
    if (cambiosDeLaCorreccion.length === 0) return 'No hay ningún cambio que guardar: lo que no cambia, no se manda.';
    if (observacionDeLaCorreccion.trim() === '') return 'Falta la observación: sin motivo no se guarda (regla 10).';
    const nombre = tecleadoEnLaCorreccion('nombreRazonSocial');
    if (nombre === '')
      return 'El nombre o razón social no se puede dejar en blanco: es lo único que identifica a la persona en el padrón, y el dominio lo rechaza.';
    const estadoCivil = tecleadoEnLaCorreccion('estadoCivil');
    if (estadoCivil !== undefined && estadoCivil.length > ESTADO_CIVIL_MAXIMO)
      return `El estado civil no pasa de ${ESTADO_CIVIL_MAXIMO} caracteres: es lo que la columna admite, y el dominio lo rechaza.`;
    /* Una empresa no nace ni se casa: el dominio rechaza las dos cosas, y
       decirlo aquí evita un 422 sobre un campo que la pantalla dejó teclear. */
    if (contribuyenteAbierto.tipoPersona === 'JURIDICA') {
      if ((tecleadoEnLaCorreccion('fechaNacimiento') ?? '') !== '')
        return 'Una persona jurídica no tiene fecha de nacimiento: para una empresa la fecha que importa es la de constitución, y va en otro campo.';
      if ((tecleadoEnLaCorreccion('condicionEspecial') ?? '') !== '')
        return 'Una persona jurídica no puede ser pensionista, adulto mayor ni tener discapacidad: esas condiciones son de una persona natural.';
    }
    if (conyugeTecleado !== '') {
      if (conyugeResuelto === null)
        return conyugeBuscado.cargando || conyugeEscrito !== conyugeTecleado
          ? 'Buscando al cónyuge en el padrón…'
          : `El código «${conyugeTecleado}» no está en el padrón de contribuyentes: el cónyuge es otro contribuyente de esta municipalidad.`;
      if (conyugeResuelto.id === contribuyenteAbierto.id)
        return 'Nadie es su propio cónyuge: escribe el código del otro contribuyente, o deja el campo en blanco para deshacer el enlace.';
    }
    return undefined;
  };

  /**
   * El cuerpo del PUT: la observación y **sólo** los cinco campos declarados.
   *
   * La asignación es campo a campo y no un `spread` del formulario a propósito:
   * un objeto compuesto con lo que hubiera en `vals` dejaría entrar cualquier
   * clave que el catálogo ganara, que es justo lo que la lista blanca del
   * backend existe para impedir. Aquí se repite del lado del cliente para que el
   * botón lo sepa antes de mandar.
   */
  const cuerpoDeLaCorreccion = (): CorreccionDeContribuyente => {
    const cuerpo: CorreccionDeContribuyente = { observacion: observacionDeLaCorreccion.trim() };
    for (const [clave, valor] of cambiosDeLaCorreccion) {
      if (clave === 'nombreRazonSocial') cuerpo.nombreRazonSocial = valor;
      else if (clave === 'condicionEspecial') cuerpo.condicionEspecial = valor;
      else if (clave === 'fechaNacimiento') cuerpo.fechaNacimiento = valor;
      else if (clave === 'estadoCivil') cuerpo.estadoCivil = valor;
      /* El 0 borra el enlace, como la cadena vacía en los de texto. El
         identificador sale de la resolución, nunca de lo tecleado. */
      else if (clave === 'conyugeId') cuerpo.conyugeId = valor === '' ? 0 : conyugeResuelto!.id;
    }
    return cuerpo;
  };

  /** Suelta el borrador del expediente: lo tecleado y el motivo que lo explicaba. */
  const soltarElBorradorDelExpediente = () => {
    setVals((s2) => {
      const limpio = { ...s2 };
      for (const clave of CLAVES_DEL_EXPEDIENTE) delete limpio[clave];
      return limpio;
    });
    setObservacionDeLaCorreccion('');
    setSucio(false);
  };

  const guardarLaCorreccion = async () => {
    if (contribuyenteAbierto === null || impedimentoDeLaCorreccion() !== undefined) return;
    setCorrigiendo(true);
    try {
      await corregirContribuyente(contribuyenteAbierto.id, cuerpoDeLaCorreccion());
      soltarElBorradorDelExpediente();
      /* Se vuelven a pedir las dos, y no se compone nada con lo devuelto: la
         franja de la cabecera sale de la búsqueda del padrón y los campos de la
         ficha, así que dejar sólo una al día haría que las dos dijeran cosas
         distintas de la misma persona. */
      ficha.reintentar();
      expediente.reintentar();
      toast('Contribuyente corregido.');
    } catch (error) {
      toast(error instanceof ErrorDeApi ? error.mensaje : 'No se pudo guardar la corrección.', 'mal');
    } finally {
      setCorrigiendo(false);
    }
  };

  const plegable = (clave: string, abiertaPorDefecto: boolean) => {
    const cerrada = cerradas[clave];
    const abierta = cerrada === undefined ? abiertaPorDefecto : !cerrada;
    return { abierta, toggle: () => setCerradas((s) => ({ ...s, [clave]: abierta })) };
  };

  const det = DETERMINACIONES[tipo];

  /* ── La determinación pedida al servidor (#540) ────────────────────────────
     La hoja no pide nada al abrirse —abrir una pantalla no puede lanzar una
     determinación—: la pide quien atiende con la acción secundaria, y sólo la
     que lleva la marca `simulacion: true`. Lo que vuelve —cifras o el motivo por
     el que no hay— es de ESTA hoja y de este sujeto, así que se suelta al
     cambiar de pastilla o de filtro: dejarlo dibujado bajo otro contribuyente es
     enseñarle a alguien la cuenta de otro. */
  const [determinacion, setDeterminacion] = useState<ResultadoDeDeterminacion | null>(null);
  const [falloDeLaDeterminacion, setFalloDeLaDeterminacion] = useState<ErrorDeApi | null>(null);
  const [simulando, setSimulando] = useState(false);

  const enDeterminar = dest === 'determinar';

  /** El valor de un filtro por el nombre con el que viaja; `''` si esta hoja no lo dibuja. */
  const filtroQueViaja = (clave: string): string => {
    const i = det.filtros.findIndex((f) => f.k === clave);
    if (i < 0) return '';
    return (filtros[`${tipo}|${i}`] ?? det.filtros[i].v).trim();
  };

  /* Los sectores del catastro, que son los que la corrida por sector admite.
     El desplegable del manual traía seis códigos inventados y `alcance: SECTOR`
     exige uno que exista: con uno inventado la corrida sale vacía y se lee como
     «en ese sector no hay nadie». Exige otro acceso que esta pantalla
     —`sectores`—, así que puede fallar sola sin tumbar la hoja. */
  const alcanceDeLaCorrida = filtroQueViaja('alcance');
  const sectores = useRecurso(
    (s2) => listarSectores(s2),
    [],
    enDeterminar && tipo === 'masivo',
  );
  const codigosDeSector = (sectores.datos?.contenido ?? []).map((x) => x.codigo);

  /* Al cambiar de hoja, de sujeto o de ejercicio, lo dibujado deja de ser la
     respuesta a lo que está en pantalla. */
  const sujetoDeLaDeterminacion = `${tipo}|${pref.ejercicio}|${filtroQueViaja('codContribuyente')}|${filtroQueViaja('placa')}|${alcanceDeLaCorrida}|${filtroQueViaja('sector')}|${filtroQueViaja('codigoDesde')}|${filtroQueViaja('codigoHasta')}`;
  useEffect(() => {
    setDeterminacion(null);
    setFalloDeLaDeterminacion(null);
  }, [sujetoDeLaDeterminacion]);

  /**
   * Lo que impide pedir la determinación, o `undefined` si nada lo impide.
   *
   * Se calcula ANTES de habilitar la acción y no dentro del envío: un botón que
   * promete lo que no puede es peor que uno apagado que dice por qué.
   */
  const impedimentoDeSimular = (): string | undefined => {
    if (det.simula === undefined) return IMPEDIMENTO_DE_LA_DETERMINACION[tipo];
    if (tipo === 'predial' && filtroQueViaja('codContribuyente') === '') {
      return 'Escribe el código del contribuyente: la base del predial es de una persona —el conjunto de sus predios—, no de un predio.';
    }
    if (tipo === 'vehicular' && filtroQueViaja('placa') === '' && filtroQueViaja('codContribuyente') === '') {
      return 'Escribe la placa o el código del contribuyente: sin uno de los dos no hay sobre qué calcular.';
    }
    if (tipo === 'masivo' && alcanceDeLaCorrida === 'SECTOR') {
      if (sectores.error !== null) return 'No se pudieron leer los sectores del catastro, y con alcance SECTOR el backend exige uno que exista.';
      if (filtroQueViaja('sector') === '') return 'Con alcance SECTOR hay que decir cuál: sin él, «solo el sector» y «todo el padrón» serían la misma corrida.';
    }
    if (tipo === 'masivo' && alcanceDeLaCorrida === 'RANGO_DE_CODIGO') {
      const desde = filtroQueViaja('codigoDesde');
      const hasta = filtroQueViaja('codigoHasta');
      if (desde === '' || hasta === '') {
        return 'Con alcance RANGO_DE_CODIGO hacen falta los dos extremos: con uno solo no se sabe dónde acaba el tramo.';
      }
      /* El mismo orden que `enElTramo`: comparación de cadenas, que en JavaScript
         y en `String.compareTo` de Java recorren las mismas unidades. Decirlo
         aquí no adelanta ninguna regla —la de verdad la aplica el backend, y
         rechaza el tramo invertido con 422—; lo que evita es mandar una corrida
         sobre el padrón entero para que vuelva un error que ya se veía. */
      if (desde > hasta) {
        return `El tramo va del primero al último y «${desde}» es posterior a «${hasta}». Los códigos se comparan como texto, que es el orden con el que esta pantalla lista el padrón.`;
      }
    }
    return undefined;
  };

  /**
   * Pide la determinación **sin asentarla**.
   *
   * `simulacion: true` es la marca con la que el servidor calcula y no escribe
   * ninguna fila; el propio backend compone entonces la observación, porque no
   * hay ninguna modificación que justificar (regla 10 gobierna lo que se
   * guarda). El resto del cuerpo va vacío a propósito: es la misma negación por
   * omisión de las escrituras, y aquí la aprieta un motivo más —`predios` lleva
   * el autovalúo declarado de cada predio y esta pantalla no tiene dónde
   * escribirlo—.
   */
  const simular = async () => {
    setSimulando(true);
    setFalloDeLaDeterminacion(null);
    try {
      if (tipo === 'predial') {
        setDeterminacion({
          clase: 'predial',
          datos: await determinarPredial(
            { codContribuyente: filtroQueViaja('codContribuyente'), ejercicio: pref.ejercicio },
            { simulacion: true },
          ),
        });
      } else if (tipo === 'masivo') {
        setDeterminacion({
          clase: 'masivo',
          datos: await correrPredialMasivo({
            simulacion: true,
            ejercicio: pref.ejercicio,
            alcance: alcanceDeLaCorrida,
            /* Cada alcance manda LO SUYO y nada más. Un `sector` que viajara con
               `alcance: TODOS` lo ignoraría el backend en silencio, y quien lo
               eligió leería la corrida del padrón entero como la de su sector. */
            ...(alcanceDeLaCorrida === 'SECTOR' ? { sector: filtroQueViaja('sector') } : null),
            ...(alcanceDeLaCorrida === 'RANGO_DE_CODIGO'
              ? { codigoDesde: filtroQueViaja('codigoDesde'), codigoHasta: filtroQueViaja('codigoHasta') }
              : null),
          }),
        });
      } else if (tipo === 'vehicular') {
        setDeterminacion({
          clase: 'vehicular',
          datos: await calcularVehicular(
            {
              ejercicio: pref.ejercicio,
              ...(filtroQueViaja('placa') !== '' ? { placa: filtroQueViaja('placa') } : null),
              ...(filtroQueViaja('codContribuyente') !== '' ? { codContribuyente: filtroQueViaja('codContribuyente') } : null),
            },
            { simulacion: true },
          ),
        });
      }
    } catch (fallo) {
      /* Lo anterior era la respuesta a la misma pregunta, así que se va: dejarlo
         debajo del aviso de error se lee como que la cuenta sigue valiendo. */
      setDeterminacion(null);
      setFalloDeLaDeterminacion(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo calcular la determinación', 0),
      );
    } finally {
      setSimulando(false);
    }
  };

  const trDef = TRANSFERENCIAS[trTipo];
  const paso = Math.min(trPaso, trDef.pasos.length - 1);
  const pasoActual = trDef.pasos[paso];
  const esElUltimoPaso = paso >= trDef.pasos.length - 1;

  const [registrando, setRegistrando] = useState(false);

  /* ── El panel ─────────────────────────────────────────────────
     No hay «panel de Rentas» en el contrato: el unico panel es el de
     recaudacion, que es el de Inicio (ARQ-01 §3.13). De ahi sale el avance de
     cobranza; el censo del padron, de su propia lectura; y el embudo, de la
     ultima corrida masiva, que hoy no existe. */
  const enPanel = dest === 'panel';
  const censoDelPadron = useRecurso((s2) => buscarContribuyentes({}, { tamano: 1 }, s2), [], enPanel);
  const kpisDeRecaudacion = useRecurso((s2) => indicadores(pref.ejercicio, s2), [pref.ejercicio], enPanel);
  const corrida = useRecurso((s2) => ultimaCorridaPredial(s2), [], enPanel);

  /* ── La hoja resumen de la declaración jurada ─────────────────
     `GET /rentas/declaraciones/{n}/hoja` (#563). Es el único documento del
     módulo pensado para imprimirse y firmarse, y todo lo que consignaba venía
     del juego de datos de la maqueta: el nombre, el código y el DNI de una
     persona, dos predios que no son de nadie y cuatro totales. Una vez impresa
     bajo «Declaro bajo juramento» y firmada, una hoja así no se distingue de
     una correcta, y a diferencia de una pantalla nadie la vuelve a mirar contra
     la base.

     El número se rebota como cualquier otro buscador —una lectura por pausa de
     tecleo, no por pulsación— y la lectura no se hace sin número: pedir
     `/declaraciones//hoja` sería preguntar por una declaración vacía. */
  const djBuscada = useRebote(djNro.trim());
  const hojaDj = useRecurso(
    (s2) => hojaDeDeclaracion(djBuscada, pref.ejercicio, djFecha === '' ? undefined : djFecha, s2),
    [djBuscada, pref.ejercicio, djFecha],
    dest === 'reporte' && djBuscada !== '',
  );
  /* Lo que impide imprimir, dicho. Es la hoja RESUELTA y no «que no haya error»:
     mientras se está consultando tampoco hay nada que sacar por la impresora, y
     la respuesta anterior a otro número ya no está —`useRecurso` la suelta al
     cambiar la pregunta—. Y un declarante nulo tampoco imprime: sería un papel
     que se firma con el nombre en blanco. */
  const impedimentoDeImprimirLaDj =
    djBuscada === ''
      ? 'Escribe el número de la declaración: sin ella no hay hoja que imprimir'
      : hojaDj.cargando
        ? 'Todavía se está consultando la declaración'
        : hojaDj.error !== null
          ? `No se pudo leer esta declaración, así que no hay hoja: ${hojaDj.error.mensaje}`
          : hojaDj.datos === null
            ? 'No hay ninguna hoja leída: no hay qué imprimir'
            : hojaDj.datos.declarante === null
              ? 'El contribuyente de esta declaración ya no está en el padrón: la hoja saldría sin nombre ni documento'
              : undefined;
  /* La observación del acto. El manual no le dibuja campo y toda escritura la
     exige (regla 10), así que es un control añadido con su propio rótulo. */
  const [observacionDelActo, setObservacionDelActo] = useState('');

  /* ── Las partes de la transferencia, resueltas contra el padrón ──────────
     Los cuatro «— nombre» eran `ro` con un nombre de la maqueta dentro, y el
     recuadro punteado es exactamente como se dibuja un dato traído: teclear un
     documento distinto no los movía. Y son el ÚNICO control que confirma a quién
     se transfiere la propiedad antes de pulsar «Registrar transferencia»: la
     pantalla confirmaba siempre, y confirmaba a otro. */
  const enTransferencia = dest === 'transferir';
  const esDeuda = dest === 'deuda';
  const esPredio = trTipo === 'predio';
  const docTransferente = useRebote(texto('trDoc').trim());
  const docAdquirente = useRebote(texto(esPredio ? 'adDoc' : 'vAdDoc').trim());
  const placaDelActo = useRebote(texto('vPlaca').trim());

  const transferenteDelPredio = useRecurso(
    (s2) => contribuyentePorDocumento(docTransferente, s2),
    [docTransferente],
    enTransferencia && esPredio && docTransferente !== '',
  );
  const adquirente = useRecurso(
    (s2) => contribuyentePorDocumento(docAdquirente, s2),
    [docAdquirente],
    enTransferencia && docAdquirente !== '',
  );
  /* En el vehículo el transferente NO se teclea: `PeticionDeTransferenciaVehiculo`
     no tiene `codTransferente` y el backend toma al titular vigente de la placa.
     Se lee de `GET /consultas/vehiculos`, que publica `titular` y su código. */
  const vehiculoDelActo = useRecurso(
    (s2) => buscarVehiculos({ placa: placaDelActo }, { tamano: 2 }, s2),
    [placaDelActo],
    enTransferencia && !esPredio && placaDelActo !== '',
  );
  const vehiculoEncontrado =
    (vehiculoDelActo.datos?.contenido ?? []).find(
      (v) => v.placa.replace(/-/g, '').toUpperCase() === placaDelActo.replace(/-/g, '').toUpperCase(),
    ) ?? null;

  /** Quién transfiere, venga del documento tecleado o del titular de la placa. */
  const codigoDelTransferente = esPredio
    ? (transferenteDelPredio.datos?.codigo ?? null)
    : (vehiculoEncontrado?.codigoContribuyente ?? null);
  const nombreDelTransferente = esPredio
    ? (transferenteDelPredio.datos?.nombreRazonSocial ?? null)
    : (vehiculoEncontrado?.titular ?? null);

  /**
   * La deuda del transferente, la de verdad. Antes eran tres conceptos de la
   * maqueta —S/ 2,640.36 en total— dibujados encima del botón que registra el
   * acto, y no eran de nadie.
   *
   * Se lee de la ficha unificada y no de `consulta_deuda` por el total: el pie
   * del artboard enseña una cifra sumada, y sumarla aquí sería componer dinero en
   * la pantalla (RNF-083). `resumenDeSaldos` la trae hecha por el servidor y con
   * su fecha, que es lo que la regla 9 exige de toda cifra que se muestra.
   */
  const deudaDelTransferente = useRecurso(
    (s2) => fichaUnificada({ contribuyente: codigoDelTransferente! }, { tamano: 20 }, s2),
    [codigoDelTransferente],
    enTransferencia && codigoDelTransferente !== null,
  );

  /* ── El contribuyente de las dos hojas de deuda ──────────────────────────
     No había ninguno: la franja enseñaba «00000006550 · DÍAZ MADRID, JULIO
     CÉSAR» de la maqueta, «Cambiar contribuyente» no tenía `onClick`, y el
     cuerpo se armaba con `texto('altaDoc')` —una clave que no es ningún campo de
     esta pantalla ni de ninguna otra—, así que salía `codContribuyente: ''` y el
     acto moría siempre en 422. */
  const [sujetoDeDeuda, setSujetoDeDeuda] = useState<Contribuyente | null>(null);
  const [qDeuda, setQDeuda] = useState('');
  const criterioDeDeuda = useRebote(qDeuda.trim());
  const busquedaDeDeuda = useRecurso(
    (s2) => padronPorCriterio(criterioDeDeuda, { tamano: 8 }, s2),
    [criterioDeDeuda],
    esDeuda && sujetoDeDeuda === null && criterioDeDeuda !== '',
  );

  /**
   * La deuda que se puede dar de baja, **a la fecha de la resolución** y con el
   * corte que la tabla tenga puesto.
   *
   * La fecha no es una comodidad: `RegistrarMovimientoDeDeuda` compara parte por
   * parte contra `deudaActualizadaA(fechaValor)`, y `fechaValor` es esa fecha.
   * Leerla a hoy y darla de baja con una resolución de julio produciría
   * `BajaMayorQueLaDeuda` sobre unas cifras que la pantalla acababa de enseñar.
   *
   * `porPeriodo` es lo que #551 añadió, y sólo se manda cuando está puesto: sin
   * él la respuesta es la de siempre. Es la misma operación, así que el permiso,
   * el 404 del código que no está en el padrón y el orden no cambian; lo único
   * que cambia es dónde se corta cada fila.
   */
  const fechaDeLaBaja = texto('fechaRes').trim();
  const deudaParaLaBaja = useRecurso(
    (s2) =>
      deudaDelContribuyente(
        {
          codContribuyente: sujetoDeDeuda!.codigo,
          fechaDeCorte: fechaDeLaBaja === '' ? undefined : fechaDeLaBaja,
          porPeriodo: bajaPorCuota ? true : undefined,
        },
        { tamano: 50 },
        s2,
      ),
    [sujetoDeDeuda?.codigo, fechaDeLaBaja, bajaPorCuota],
    esDeuda && hoja === 'baja' && sujetoDeDeuda !== null,
  );
  const obligaciones = deudaParaLaBaja.datos?.contenido ?? [];
  /* Al cambiar de contribuyente, de fecha o de corte, lo marcado deja de
     significar nada: `obligacionMarcada` es la posición en la lista, y las tres
     cosas la reescriben. Sin el corte en la lista, pasar de «por obligación» a
     «por cuota» dejaría marcada la fila número 3 de otra tabla —y con ella un
     acto sobre una obligación que nadie eligió—. */
  useEffect(() => setObligacionMarcada(null), [sujetoDeDeuda?.codigo, fechaDeLaBaja, hoja, bajaPorCuota]);
  const obligacionDeLaBaja: ObligacionConDeuda | null =
    obligacionMarcada === null ? null : (obligaciones[obligacionMarcada] ?? null);

  /**
   * La unidad del alta, resuelta **mientras se teclea** y no al enviar (#554).
   *
   * Antes se resolvía dentro del envío, así que lo que quien atiende veía era un
   * botón encendido sobre una caja con un código cualquiera, y sólo al pulsar se
   * enteraba de que no era ninguna unidad del padrón. Ahora la pantalla lo dice
   * antes: el impedimento apaga el acto y la tarjeta enseña qué se resolvió.
   *
   * Se pregunta con el valor aposentado —no con lo tecleado—, y el impedimento
   * se calcula comparando los dos: a media pulsación no hay respuesta que
   * enseñar, y anunciar «no existe» sobre un código a medio escribir es el
   * defecto que #296 midió en la pantalla de inicio.
   */
  /**
   * Lo último que el servidor rechazó de estas dos hojas, **en pantalla y no en
   * un aviso que se va** (#597).
   *
   * El aviso flotante dura 3,2 s y se lo lleva cualquier navegación. Para
   * «Transferencia registrada» sobra; para un 422 no: el del ejercicio sin
   * partición son tres líneas —nombra el año, dice cuáles están abiertos y que
   * añadir uno es una migración— y quien atiende necesita releerlo con el
   * formulario delante para saber qué cambiar. Se limpia al mandar bien y
   * cuando cambia algo de lo que lo produjo.
   */
  const [rechazoDelActo, setRechazoDelActo] = useState<ErrorDeApi | null>(null);
  useEffect(() => setRechazoDelActo(null), [hoja, sujetoDeDeuda?.codigo]);

  const unidadEscrita = useRebote(texto('altaUnidad').trim());
  const unidadTecleada = texto('altaUnidad').trim();
  const resolucionDeLaUnidad = useRecurso(
    (s2) => resolverLaUnidadDelAlta(unidadEscrita, sujetoDeDeuda!.codigo, s2),
    [unidadEscrita, sujetoDeDeuda?.codigo],
    esDeuda && hoja === 'alta' && sujetoDeDeuda !== null && unidadEscrita !== '',
  );
  const unidadResuelta = unidadTecleada === '' ? null : resolucionDeLaUnidad.datos;
  /** Todavía no hay respuesta para lo que hay escrito: ni la hubo, ni la habrá hasta que vuelva. */
  const unidadEnVuelo = unidadTecleada !== '' && (unidadTecleada !== unidadEscrita || resolucionDeLaUnidad.cargando);

  /**
   * Si quien atiende declaró que la deuda del alta es de un titular anterior
   * de la unidad (#635). Una por hoja: son dos actos distintos.
   *
   * **Se borra en cuanto cambia el hecho sobre el que se afirmó.** Una
   * declaración es sobre esta unidad y este contribuyente; si cambia
   * cualquiera de los dos —o se pasa a la otra hoja— lo marcado dejaría de
   * decir lo que decía y viajaría igual. La llave es lo TECLEADO y no el valor
   * aposentado: la casilla tiene que caer con la primera pulsación, no 300 ms
   * después.
   */
  const [declaraTitularAnteriorEnElAlta, setDeclaraTitularAnteriorEnElAlta] = useState(false);
  useEffect(() => setDeclaraTitularAnteriorEnElAlta(false), [unidadTecleada, sujetoDeDeuda?.codigo, hoja]);

  /**
   * De quién es la unidad de la obligación marcada para la baja (#635).
   *
   * Se pregunta a la **fecha de la resolución**, que es la fecha valor con que
   * viaja la baja y contra la que el servidor resuelve el titular. Ver
   * {@link resolverElCruceDeLaBaja}: `null` cuando la obligación no tiene
   * unidad, que es cuando no hay nada que comprobar ni que declarar.
   */
  const [declaraTitularAnteriorEnLaBaja, setDeclaraTitularAnteriorEnLaBaja] = useState(false);
  const cruceDeLaBaja = useRecurso(
    (s2) => resolverElCruceDeLaBaja(obligacionDeLaBaja!, sujetoDeDeuda!.codigo, fechaDeLaBaja, s2),
    [obligacionMarcada, sujetoDeDeuda?.codigo, fechaDeLaBaja, bajaPorCuota],
    esDeuda && hoja === 'baja' && sujetoDeDeuda !== null && obligacionDeLaBaja !== null && fechaDeLaBaja !== '',
  );
  useEffect(
    () => setDeclaraTitularAnteriorEnLaBaja(false),
    [obligacionMarcada, sujetoDeDeuda?.codigo, fechaDeLaBaja, hoja, bajaPorCuota],
  );

  /**
   * Lo que impide registrar la transferencia, o `undefined` si nada lo impide.
   *
   * Se calcula antes de habilitar el botón y no dentro del envío: un acto que
   * promete lo que no puede es peor que uno apagado que dice por qué.
   */
  const impedimentoDeLaTransferencia = (): string | undefined => {
    if (observacionDelActo.trim() === '') return 'Falta la observación: sin motivo no se guarda';
    if (esPredio) {
      if (texto('codPredial').trim() === '') return 'Falta el código predial: es lo que se transfiere';
      if (texto('trDoc').trim() === '') return 'Falta el documento del transferente';
      if (codigoDelTransferente === null)
        return transferenteDelPredio.cargando
          ? 'Buscando al transferente en el padrón…'
          : 'Ese documento de transferente no está en el padrón de contribuyentes';
      if (texto('pctTransf').trim() === '') return 'Falta el % transferido';
    } else {
      if (placaDelActo === '') return 'Falta la placa: es lo que se transfiere';
      if (vehiculoEncontrado === null)
        return vehiculoDelActo.cargando ? 'Buscando el vehículo…' : 'Esa placa no está en el padrón vehicular';
    }
    if (texto(esPredio ? 'adDoc' : 'vAdDoc').trim() === '') return 'Falta el documento del adquirente';
    if (adquirente.datos === null)
      return adquirente.cargando
        ? 'Buscando al adquirente en el padrón…'
        : 'Ese documento de adquirente no está en el padrón de contribuyentes';
    if (texto(esPredio ? 'fechaActo' : 'vFecha').trim() === '') return 'Falta la fecha del acto';
    if (texto(esPredio ? 'minuta' : 'vNumDoc').trim() === '')
      return 'Falta el documento que sustenta el acto: sin él no se registra';
    if (importeQueViaja(texto(esPredio ? 'valorTransf' : 'vValor')) === null)
      return 'El valor de transferencia no es un importe: escríbelo sin separador de miles, como 95000.00';
    return undefined;
  };

  /**
   * Registra la transferencia contra el backend.
   *
   * El `predioId` **no se teclea**: la pantalla pide el código predial y aquí se
   * resuelve contra el padrón, que es lo que su propia ayuda promete. Los códigos
   * de las partes tampoco: vienen ya resueltos de la lectura que llena sus
   * nombres, así que lo que se registra es lo mismo que se confirmó en pantalla.
   */
  /**
   * Lo que va dentro de los seis `ro` derivados de la transferencia.
   *
   * Son los que el manual dibuja en recuadro punteado —que es como se dibuja un
   * dato traído— y traían dentro un nombre y dos fechas de la maqueta. Ninguno
   * se teclea: los nombres los pone el padrón (o el titular de la placa) y las
   * dos fechas de afectación salen del año del acto.
   */
  const resueltoDeLaTransferencia = (k: string): { valor: string; ayuda?: string } | undefined => {
    const afectacion = afectacionDelActo(texto(esPredio ? 'fechaActo' : 'vFecha'));
    const delPadron = (
      lectura: { cargando: boolean; error: ErrorDeApi | null },
      nombre: string | null,
      hayDocumento: boolean,
    ): { valor: string; ayuda?: string } => {
      if (!hayDocumento) return { valor: '—', ayuda: 'Teclea el documento y el padrón dirá quién es' };
      if (lectura.cargando) return { valor: '…', ayuda: 'Buscando en el padrón' };
      if (lectura.error !== null) return { valor: '—', ayuda: 'No se pudo consultar el padrón' };
      return nombre === null
        ? { valor: '—', ayuda: 'Ese documento no está en el padrón de contribuyentes' }
        : { valor: nombre };
    };

    switch (k) {
      case 'trNom':
        return delPadron(transferenteDelPredio, nombreDelTransferente, docTransferente !== '');
      case 'adNom':
      case 'vAdNom':
        return delPadron(adquirente, adquirente.datos?.nombreRazonSocial ?? null, docAdquirente !== '');
      case 'vTrNom':
        return delPadron(vehiculoDelActo, nombreDelTransferente, placaDelActo !== '');
      case 'vTrDoc':
        return {
          valor: codigoDelTransferente ?? '—',
          ayuda: 'Lo pone el padrón vehicular: es el titular vigente de la placa, y no viaja en la petición',
        };
      case 'trHasta':
      case 'vTrHasta':
        return { valor: afectacion.hasta, ayuda: 'Del año del acto: hasta el 31 de diciembre responde el vendedor' };
      case 'adDesde':
      case 'vAdDesde':
        return { valor: afectacion.desde, ayuda: 'Del año del acto: el comprador queda afecto el 1 de enero siguiente' };
      default:
        return undefined;
    }
  };

  const campoDeLaTransferencia = (f: CampoDef) => {
    const r = resueltoDeLaTransferencia(f.k);
    if (r === undefined) return campo(f);
    return (
      <CampoDeFormulario
        key={f.k}
        f={{ ...f, ayuda: r.ayuda ?? f.ayuda }}
        valor={r.valor}
        onCambio={() => {
          /* Es `ro`: no hay nada que cambiar. */
        }}
      />
    );
  };

  const registrarTransferencia = async () => {
    setRegistrando(true);
    try {
      const codigoDelAdquirente = adquirente.datos!.codigo;
      const valor = importeQueViaja(texto(esPredio ? 'valorTransf' : 'vValor'))!;

      /* El rotulo del desplegable NO es lo que el backend admite (#542).
         El manual imprime «COMPRA-VENTA», «DACIÓN EN PAGO», «SUCESIÓN» —con su
         guion y su tilde— y `TipoTransferencia` declara `COMPRA_VENTA`,
         `DACION_EN_PAGO`, `SUCESION`. Se traduce con una tabla y no quitando
         signos: quitarlos haria entrar cualquier rotulo parecido, y lo que queda
         registrado es el acto por el que un predio cambia de dueño.
         De los doce rotulos de las dos pantallas, nueve llevan tilde o guion:
         antes de esto casi todos se llevaban un 422 que nombraba un valor que
         quien atiende acababa de elegir de un desplegable. */
      const tipoDelActo = tipoDeTransferenciaDelBackend(texto(esPredio ? 'tipoActo' : 'vTipo'));
      if (tipoDelActo === null) {
        toast(`El sistema no reconoce el tipo de acto «${texto(esPredio ? 'tipoActo' : 'vTipo')}». No se registró nada.`, 'mal');
        setRegistrando(false);
        return;
      }

      if (esPredio) {
        const codigo = texto('codPredial').trim();
        const encontrados = await listarPredios({ codRefCatastral: codigo }, { tamano: 2 });
        const exacto = encontrados.contenido.find((x) => x.codRefCatastral === codigo);
        if (!exacto) {
          toast(`No hay ningún predio con el código ${codigo} en el padrón.`, 'mal');
          return;
        }
        await transferirPredio({
          observacion: observacionDelActo.trim(),
          predioId: exacto.predioId,
          codTransferente: codigoDelTransferente!,
          codAdquiriente: codigoDelAdquirente,
          tipoTransferencia: tipoDelActo!,
          fechaTransferencia: texto('fechaActo'),
          valorTransferencia: valor,
          porcentajeTransferido: texto('pctTransf').trim(),
          /* La casilla se lee como booleano. Antes se comparaba su TEXTO con
             `'No'` —un valor que `texto()` no devuelve nunca: da `''`, `'true'` o
             `'false'`—, así que `afectaAlcabala` viajaba `true` siempre, también
             con la casilla desmarcada. */
          afectaAlcabala: marcado('genAlcabala'),
          documentoOrigen: texto('minuta').trim(),
        });
      } else {
        await transferirVehiculo({
          observacion: observacionDelActo.trim(),
          placa: placaDelActo,
          codAdquiriente: codigoDelAdquirente,
          tipoTransferencia: tipoDelActo!,
          fechaTransferencia: texto('vFecha'),
          valorTransferencia: valor,
          /* La alcabala grava la transferencia de INMUEBLES (art. 21 de la Ley de
             Tributación Municipal), y el formulario del manual no dibuja casilla
             en la hoja del vehículo. Aquí viajaba `true` literal, de modo que toda
             transferencia vehicular quedaba marcada como que genera alcabala. */
          afectaAlcabala: false,
          documentoOrigen: texto('vNumDoc').trim(),
        });
      }
      setTrPaso(0);
      setObservacionDelActo('');
      toast('Transferencia registrada.');
    } catch (error) {
      toast(error instanceof ErrorDeApi ? error.mensaje : 'No se pudo registrar la transferencia.', 'mal');
    } finally {
      setRegistrando(false);
    }
  };

  /**
   * Lo que viaja de la unidad: el identificador interno y nada más.
   *
   * `ClaveDeSaldo` compara `predioId`/`vehiculoId` por igualdad exacta, así que
   * una obligación con unidad y una sin ella son dos obligaciones distintas:
   * mandar el alta sin resolver la unidad la asienta sobre la que no tiene
   * ninguna. La resolución ya está hecha —`resolucionDeLaUnidad`— y aquí sólo se
   * lee: lo que se manda es exactamente lo que la tarjeta enseñó. Devuelve
   * `null` cuando lo escrito no es ninguna unidad del padrón, y entonces no se
   * manda; `{}` con la caja en blanco, que es la obligación sin unidad.
   */
  const unidadDelAlta = (): { predioId?: number; vehiculoId?: number } | null => {
    if (unidadTecleada === '') return {};
    const r = unidadResuelta;
    return r === null || r.clase === 'nada' ? null : r.cuerpo;
  };

  /**
   * Si el movimiento viaja declarando que la unidad fue de un titular anterior
   * (#635), por hoja.
   *
   * La casilla marcada no basta: se exige además que haya unidad y que el
   * padrón **no** haya dicho que es suya. Una declaración es sobre un hecho
   * concreto y no puede sobrevivir a que el hecho cambie; los dos `useEffect`
   * la borran al cambiar de unidad, de contribuyente o de fecha, y esto es la
   * guarda de programa por si alguna vez se quedaran cortos. Declarar de más no
   * es inofensivo: afirma en la bitácora algo que nadie preguntó, y en la
   * unidad que sí es suya el servidor ni siquiera lo miraría —de modo que la
   * afirmación falsa quedaría escrita sin que nada la contradijera—.
   */
  /* Se manda sólo en los DOS estados que ofrecen la casilla. Con `!== 'suya'`
     también viajaría en `sin-titular`, donde desde #680 no hay titular anterior
     que declarar y el servidor admite el movimiento tal cual: sería afirmar en la
     bitácora algo que nadie preguntó y que además es falso. */
  const OFRECEN_LA_DECLARACION = ['ajena', 'sin-comprobar'];
  const declaracionDelAlta =
    declaraTitularAnteriorEnElAlta &&
    unidadResuelta !== null &&
    unidadResuelta.clase !== 'nada' &&
    OFRECEN_LA_DECLARACION.includes(unidadResuelta.cruce.estado);
  const declaracionDeLaBaja =
    declaraTitularAnteriorEnLaBaja && cruceDeLaBaja.datos !== null && OFRECEN_LA_DECLARACION.includes(cruceDeLaBaja.datos.estado);

  /**
   * Lo que impide dar de alta, o `undefined`.
   *
   * Los seis campos que identifican la obligación van antes que el sustento: sin
   * ellos, la resolución mejor redactada incorpora deuda sobre otra cuota.
   */
  const impedimentoDelAlta = (): string | undefined => {
    if (sujetoDeDeuda === null) return 'Elige primero el contribuyente al que se le da de alta la deuda';
    if (observacionDelActo.trim() === '') return 'Falta la observación: sin motivo no se guarda';
    if (texto('altaConcepto').trim() === '') return 'Falta el concepto: es el tributo de la obligación';
    if (texto('altaAnio').trim() === '') return 'Falta el año de la obligación';
    /* La unidad es el sexto campo que identifica la obligación, y el que más
       cuesta si sale mal: un identificador equivocado asienta la deuda sobre una
       clave que no es la que se marcó y que nadie va a mirar. Lo escrito se
       resuelve contra el padrón antes de habilitar el acto; en blanco es una
       respuesta legítima —la obligación sin unidad— y no impide nada. */
    if (unidadEnVuelo) return `Resolviendo «${unidadTecleada}» contra el padrón…`;
    if (unidadTecleada !== '' && resolucionDeLaUnidad.error !== null)
      return `No se pudo comprobar «${unidadTecleada}» contra el padrón: ${explicacionDelFallo(resolucionDeLaUnidad.error)}. Un alta con la unidad sin resolver caería sobre otra obligación`;
    if (unidadResuelta !== null && unidadResuelta.clase === 'nada')
      return `«${unidadTecleada}» no es ningún código de referencia catastral del catastro ni ninguna placa del padrón vehicular. Corrígelo, o deja la caja en blanco para dar de alta la obligación sin unidad`;
    /* El padrón ya dijo de quién es la unidad, así que el 422 de #635 se ve
       venir: mandarlo sería gastar una petición para que el servidor repita lo
       que la tarjeta de arriba ya enseña, y devolver a quien atiende a un
       formulario entero relleno. No apaga el caso legítimo —la deuda anterior
       a una transferencia ES del titular de entonces—: apaga el caso SIN
       CONTESTAR, y la casilla que lo contesta está dentro del mismo aviso.
       Con `sin-comprobar` no se apaga nada: ahí el padrón no dijo que no sea
       suya, dijo que no se pudo preguntar, y apagar el acto por nuestra propia
       incapacidad de preguntar dejaría sin registrar una obligación que casi
       siempre es correcta. */
    /* Sin `clase !== 'nada'`: la rama de arriba ya lo descartó y TypeScript lo
       sabe, así que repetirlo aquí no compila. */
    if (unidadResuelta !== null && unidadResuelta.cruce.estado === 'ajena' && !declaraTitularAnteriorEnElAlta)
      return `El padrón dice que «${unidadTecleada}» no es de ${sujetoDeDeuda.nombreRazonSocial}, y el servidor no lo va a admitir así. Si la deuda es de cuando sí lo era, márcalo en la casilla del aviso de arriba; si no, corrige la unidad`;
    /* Media pregunta no sale. El backend la contesta con 422 —y bien, nombrando
       el campo—, pero ese 422 es la red y no el camino: gastarlo obliga a quien
       atiende a rellenar el formulario entero para que le digan lo que se sabia
       antes de mandar. Cada rama dice **cual** de las cinco es. */
    const d = texto('altaCuotaD').trim();
    const h = texto('altaCuotaH').trim();
    const esCuota = (x: string) => /^\d{1,2}$/.test(x) && Number(x) >= 0 && Number(x) <= 12;
    if (d !== '' && !esCuota(d)) return 'La cuota va de 0 (anual) a 12: revisa «Cuota desde»';
    if (h !== '' && !esCuota(h)) return 'La cuota va de 0 (anual) a 12: revisa «Cuota hasta»';
    if (d === '' && h !== '') return 'Falta «Cuota desde»: con «hasta» sola no se sabe dónde empieza el rango';
    if (d !== '' && h !== '' && Number(d) === 0 && Number(h) !== 0)
      return '0 es la obligación anual, no la cuota cero: no puede ser el principio de un rango. Deja las dos cajas en blanco para dar de alta la anual';
    if (d !== '' && h !== '' && Number(d) > Number(h))
      return `El rango va de la primera cuota a la última: «${d}» es mayor que «${h}»`;
    if (texto('altaNumDoc').trim() === '')
      return 'Falta el Nº del documento que sustenta: sin la resolución que lo aprueba, un alta no se registra';
    const partes = ['altaInsoluto', 'altaReajuste', 'altaInteres', 'altaGastos'].map((k) => importeQueViaja(texto(k)));
    if (partes.some((x) => x === null))
      return 'Alguno de los cuatro importes no es un número: escríbelos sin separador de miles, como 1842.60';
    if (partes.every((x) => x === '' || numero(x!) === 0))
      return 'Un alta sin ningún importe no mueve nada: al menos una de las cuatro partes tiene que traer cifra';
    return undefined;
  };

  /** Lo que impide dar de baja, o `undefined`. */
  const impedimentoDeLaBaja = (): string | undefined => {
    if (sujetoDeDeuda === null) return 'Elige primero el contribuyente cuya deuda se extingue';
    if (fechaDeLaBaja === '') return 'Falta la fecha de la resolución: es la fecha con efecto tributario de la baja';
    if (obligacionDeLaBaja === null)
      /* El rótulo sigue al corte: con la tabla por cuota, «la obligación» manda
         a buscar una fila que ahí no existe —lo que hay son cuotas—. */
      return bajaPorCuota
        ? 'Elige arriba la cuota que se extingue: la baja es sobre una obligación concreta, no sobre la cuenta entera'
        : 'Elige arriba la obligación que se extingue: la baja es sobre una obligación concreta, no sobre la cuenta entera';
    /* Lo destapó marcar la primera fila elegible de un contribuyente real: su
       obligación de 2027 está en cero, y `MovimientoDeDeuda` rechaza en su
       constructor un movimiento sin ninguna cifra. Sin esta guarda el acto sale y
       vuelve con un 422 que habla de las cuatro partes del desglose. */
    if (numero(obligacionDeLaBaja.deuda.total.importe) === 0)
      return `Esa obligación no debe nada al ${fechaDeLaBaja}: no hay nada que extinguir`;
    /* La baja carga con la misma comprobación que el alta (#635), y aquí pesa
       más: la obligación YA está en el libro, así que un predio vendido después
       de que naciera la deuda la deja inextinguible hasta que alguien declare
       lo que pasó. Se pregunta al marcar la fila —una lectura, no una tecla— y
       el resultado apaga el acto sólo cuando el padrón contestó que la unidad
       es de otro. */
    if (cruceDeLaBaja.cargando) return 'Comprobando de quién es la unidad de esa obligación…';
    if (cruceDeLaBaja.datos !== null && cruceDeLaBaja.datos.estado === 'ajena' && !declaraTitularAnteriorEnLaBaja)
      return `La unidad de esa obligación ${cruceDeLaBaja.datos.de}, no de ${sujetoDeDeuda.nombreRazonSocial}. Si la deuda es de cuando sí era suya, márcalo en la casilla de debajo de la tabla; si no, revisa la fila marcada`;
    if (observacionDelActo.trim() === '') return 'Falta la observación: sin motivo no se guarda';
    /* La causal no tiene valor por omision desde #636, y por eso hace falta
       exigirla aqui: se antepone a la observacion, que es LO UNICO que se audita
       del acto, asi que una por omision quedaria escrita sin que nadie la
       eligiera. Y no se puede corregir despues: el libro no admite `UPDATE`. */
    if (texto('causal').trim() === '')
      return 'Elige la causal: es lo primero que se lee en la observación del acto, que es lo único que queda auditado de una baja, y no se puede corregir después';
    if (texto('numRes').trim() === '')
      return 'Falta el Nº de resolución: sin la resolución que la aprueba, una baja no se puede defender ante nadie';
    return undefined;
  };

  /**
   * Da de alta la obligacion —una, o las del rango—, contra `POST /rentas/deuda/altas`.
   *
   * **El rango viaja desde #538.** Hasta entonces el `record` del backend
   * declaraba `cuota` en singular y `cuotaDesde`/`cuotaHasta` no estaban en su
   * lista blanca: Jackson los descartaba sin decir nada y el asiento quedaba en
   * `periodo: 0`. Esta pantalla se defendia mandando solo «Cuota desde» y
   * diciendo que el rango no viajaba; ahora viaja, y lo que resuelve cual de las
   * tres formas se manda es `cuotasDelAlta`, nunca este metodo.
   *
   * **Y el aviso se lee de la RESPUESTA, no de lo tecleado.** Con un rango son
   * `n` asientos y el total es `n` veces el desglose; decirlo desde el
   * formulario seria repetir la cuenta que la pantalla ya hizo, en vez de
   * contar lo que de verdad se escribio.
   */
  const darDeAltaLaDeuda = async () => {
    setRegistrando(true);
    try {
      const unidad = unidadDelAlta();
      if (unidad === null) {
        toast(`«${unidadTecleada}» no es ninguna unidad del padrón: no se mandó nada.`, 'mal');
        return;
      }
      /* `impedimentoDelAlta` ya apago el boton si lo escrito no era una
         pregunta entera; esto es la guarda de programa, no la de pantalla. */
      const cuotas = cuotasDelAlta();
      if (cuotas === null) {
        toast('Las cuotas no se entienden: revisa «Cuota desde» y «Cuota hasta».', 'mal');
        return;
      }
      const cuerpo: PeticionDeMovimientoDeDeuda = {
        observacion: observacionDelActo.trim(),
        codContribuyente: sujetoDeDeuda!.codigo,
        tributo: texto('altaConcepto'),
        ano: texto('altaAnio'),
        ...cuotas,
        ...unidad,
        /* Sólo cuando de verdad se declaró: mandar `false` y no mandar nada son
           lo mismo para el servidor —los dos son `EXIGIDA`—, pero un `true` que
           nadie marcó es una afirmación inventada en la bitácora. */
        ...(declaracionDelAlta ? { deudaDeTitularAnterior: true } : {}),
        insoluto: importeQueViaja(texto('altaInsoluto')) || undefined,
        reajuste: importeQueViaja(texto('altaReajuste')) || undefined,
        interes: importeQueViaja(texto('altaInteres')) || undefined,
        gasto: importeQueViaja(texto('altaGastos')) || undefined,
        documentoOrigen: texto('altaNumDoc').trim(),
      };
      const registrado = await altaDeDeuda(cuerpo);
      setRechazoDelActo(null);
      setSucio(false);
      setObservacionDelActo('');
      /* Cuantas obligaciones se movieron y por cuanto, contado sobre lo que
         volvio. Con «cuotas 1 a 4» y 100,00 escritos, el servidor asienta
         cuatro de 100,00 y devuelve 400,00: el aviso dice esa cifra, que es la
         que va a aparecer en la cuenta. */
      const n = registrado.asientos.length;
      toast(
        `Alta registrada: ${n} ${n === 1 ? 'asiento' : 'asientos'} por S/ ${registrado.total.importe} al ${registrado.total.actualizadoA} · ${registrado.numeroDeDocumento}.`,
      );
    } catch (error) {
      setRechazoDelActo(error instanceof ErrorDeApi ? error : null);
      toast(error instanceof ErrorDeApi ? error.mensaje : 'No se pudo registrar el alta.', 'mal');
    } finally {
      setRegistrando(false);
    }
  };

  /**
   * Da de baja la obligación marcada, contra `POST /rentas/deuda/bajas`.
   *
   * **El cuerpo es otro, y ese era el defecto.** Los dos actos compartían uno
   * solo que leía siempre las claves `alta*`, así que en la baja no viajaba nada
   * de lo tecleado —ni la causal, ni la resolución, ni su fecha— y sí los valores
   * por omisión del alta: el tributo, el año, la cuota y hasta
   * `documentoOrigen: 'RD-2026-000418'`, que es el sustento documental del acto.
   * Las cuatro filas marcadas de la tabla no se miraban.
   *
   * Lo que identifica la obligación sale de la fila elegida —tributo, ejercicio,
   * cuota, unidad, fase— y los importes son los que el servidor acaba de publicar
   * para ella a esa misma fecha: es contra esas cifras contra las que
   * `RegistrarMovimientoDeDeuda` comprueba que la baja no exceda la deuda.
   *
   * **El reparto entre cuotas lo hace el servidor desde #598.** Una fila de
   * `consulta_deuda` AGREGA los periodos de la obligación —`periodoDesde` y
   * `periodoHasta` son el mínimo y el máximo del grupo— y publica **un solo
   * desglose para todo el grupo**, no el de cada cuota. Hasta #598 esa fila no
   * se podía dar de baja y la pantalla la apagaba diciéndolo: mandar el importe
   * agregado como `cuota: periodoDesde` lo cargaba entero sobre una cuota que
   * suele deber 0,00, y repartirlo aquí sería componer dinero en la pantalla
   * (RNF-083) sobre cifras que la lectura no publica.
   *
   * Ahora el cuerpo lleva `repartir: true` y lo declarado es el **total del
   * acto**. Lo que abarca se dice como el backend lo entiende: la fila que
   * nombra UNA cuota va con esa `cuota`, y la que agrega varias no manda
   * ninguna —«la obligación entera»—, que además es lo único expresable cuando
   * el grupo empieza en la anual, porque un rango no puede empezar en 0. Y la
   * fila ES la obligación: `ConsultarDeuda` agrupa por `ClaveDeObligacion`
   * —tributo, ejercicio y unidad, **sin** la fase—, así que «la obligación
   * entera» y «esta fila» son lo mismo, y la fase que se manda es la más
   * avanzada del grupo, que es la que el recurso publica.
   *
   * <h2>Y con el corte por cuota, el cuerpo es otro (#551)</h2>
   *
   * Cuando la tabla lee con `porPeriodo`, la fila **es** una cuota y trae su
   * propio desglose, así que no hay nada que repartir: viajan `cuota` y los
   * cuatro importes de esa obligación, que es contra lo que
   * `RegistrarMovimientoDeDeuda.registrar` valida parte por parte. Mandar
   * además `repartir` sería pedirle al servidor que reparta un total que ya
   * está repartido; el resultado sería el mismo y el cuerpo diría otra cosa de
   * la que se hizo.
   *
   * **Y la `fase` deja de ser la del grupo, que es lo que más cambia.** La fila
   * agregada publica la más avanzada de sus cuotas, y esa no es la de las
   * cuotas que de verdad deben. Medido contra el backend sobre `C-000001`:
   * «ARBITRIOS 2026 · predio 1» sale agregada como `VALOR` con 146,00, y por
   * cuota sale `VALOR` la cuota 0 —que debe 0— y `ORDINARIA` las cuotas 1 a 4,
   * que son las que deben esos 146,00. Dando de baja la fila agregada, los
   * cuatro abonos se asientan con `fase: VALOR` y `ProyeccionDelSaldo` se queda
   * con la fase del último asiento: las cuatro cuotas pasan a decir que las
   * rige un valor que nadie emitió. Con el corte por cuota viaja la de cada
   * una, y eso no ocurre.
   */
  const darDeBajaLaDeuda = async () => {
    setRegistrando(true);
    try {
      const o = obligacionDeLaBaja!;
      /* La causal no tiene campo propio en `PeticionDeMovimiento`, así que se
         antepone a la observación —que es donde queda auditada— en vez de
         perderse en un desplegable que no viaja. */
      const causal = texto('causal').trim();
      /* Por cuota: la fila ES una obligación, así que su periodo viaja como
         `cuota` y no se reparte nada. Por obligación: se reparte, y la cuota
         sólo se nombra cuando la fila agrega una sola —un rango no puede
         empezar en 0, y sin cuota el acto cubre la fila entera—. */
      const cuotas = bajaPorCuota || o.periodoDesde === o.periodoHasta ? { cuota: o.periodoDesde } : {};
      const cuerpo: PeticionDeMovimientoDeDeuda = {
        observacion: causal === '' ? observacionDelActo.trim() : `${causal}. ${observacionDelActo.trim()}`,
        codContribuyente: sujetoDeDeuda!.codigo,
        tributo: o.tributo,
        ano: String(o.ejercicio),
        ...cuotas,
        ...(bajaPorCuota ? {} : { repartir: true }),
        ...(declaracionDeLaBaja ? { deudaDeTitularAnterior: true } : {}),
        predioId: o.predioId ?? undefined,
        vehiculoId: o.vehiculoId ?? undefined,
        insoluto: o.deuda.insoluto.importe,
        reajuste: o.deuda.reajuste.importe,
        interes: o.deuda.interes.importe,
        gasto: o.deuda.gasto.importe,
        fase: o.fase,
        fechaValor: fechaDeLaBaja,
        documentoOrigen: texto('numRes').trim(),
      };
      const registrado = await bajaDeDeuda(cuerpo);
      setRechazoDelActo(null);
      setSucio(false);
      setObservacionDelActo('');
      setObligacionMarcada(null);
      deudaParaLaBaja.reintentar();
      /* Qué cuotas se movieron se lee de la RESPUESTA, nunca de la fila: las
         que no debían nada no producen asiento, así que «periodos 0 - 9» acaba
         siendo «1, 2, 3» y sólo los asientos que volvieron lo dicen. El total y
         su fecha son los del servidor (regla 9); aquí no se suma nada. */
      const cuotasMovidas = [...new Set(registrado.asientos.map((a) => a.periodo))].sort((a, b) => a - b);
      const n = registrado.asientos.length;
      toast(
        `Baja registrada: ${n} ${n === 1 ? 'asiento' : 'asientos'} sobre ${cuotasMovidas.length === 1 ? 'la cuota' : 'las cuotas'} ${cuotasMovidas.map((c) => (c === 0 ? 'anual' : String(c))).join(', ')} por S/ ${registrado.total.importe} al ${registrado.total.actualizadoA} · ${registrado.numeroDeDocumento}.`,
      );
    } catch (error) {
      setRechazoDelActo(error instanceof ErrorDeApi ? error : null);
      toast(error instanceof ErrorDeApi ? error.mensaje : 'No se pudo registrar la baja.', 'mal');
    } finally {
      setRegistrando(false);
    }
  };

  /**
   * Los cuatro indicadores del panel.
   *
   * Los tres estados de una lectura se dicen **distinto**, y ese era el defecto:
   * «…» mientras se lee, «—» con el motivo cuando no se pudo, y «—» con otro
   * motivo cuando el dato sencillamente no existe. Con el mismo «—» para los
   * tres, un 403 sobre el panel de recaudación y una municipalidad que aún no ha
   * cobrado nada se leen igual —y sólo el primero se arregla pidiendo el acceso—.
   *
   * La fecha va en la nota: `IndicadoresResource.fechaCalculo` llega y no se
   * dibujaba, y una cifra sin su fecha no es una cifra (regla 9, RNF-075).
   */
  const avanceDeCobranza = kpisDeRecaudacion.datos?.kpis.find((k) => k.label === 'Avance de cobranza');
  const alDia = (fecha: string | undefined) => (fecha === undefined ? '' : ` Al ${fecha}.`);
  const kpisDelPanel = [
    {
      valor: censoDelPadron.cargando
        ? '…'
        : censoDelPadron.error !== null
          ? '—'
          : censoDelPadron.datos
            ? censoDelPadron.datos.totalElementos.toLocaleString('es-PE')
            : '—',
      etiqueta: 'Contribuyentes en el padrón',
      nota: censoDelPadron.cargando
        ? 'Contando el padrón…'
        : censoDelPadron.error !== null
          ? 'No se pudo leer el padrón: el aviso de arriba dice por qué.'
          : 'Los que hay hoy, activos y de baja.',
    },
    {
      /* «Predial determinado» no lo publica ningún KPI: el panel de recaudación
         da recaudado, cartera y avance, no lo determinado por tributo. */
      valor: '—',
      etiqueta: `Predial determinado ${pref.ejercicio}`,
      nota: 'Ninguna lectura publica lo determinado por tributo.',
    },
    {
      valor: corrida.cargando ? '…' : corrida.error !== null ? '—' : corrida.datos ? String(corrida.datos.observados) : '—',
      etiqueta: 'Observados sin emisión',
      nota: corrida.cargando
        ? 'Leyendo la última corrida…'
        : corrida.error !== null
          ? 'No se pudo leer la última corrida: el aviso de arriba dice por qué.'
          : corrida.datos
            ? 'De la última corrida masiva.'
            : 'No hay ninguna corrida masiva todavía.',
    },
    {
      valor: kpisDeRecaudacion.cargando ? '…' : (avanceDeCobranza?.value ?? '—'),
      etiqueta: 'Recaudado del emitido',
      nota: kpisDeRecaudacion.cargando
        ? 'Leyendo el panel de recaudación…'
        : kpisDeRecaudacion.error !== null
          ? 'No se pudo leer el panel de recaudación: el aviso de arriba dice por qué.'
          : /* La nota del propio KPI trae la cifra sobre la que se calcula —«de
               S/ 13,783.75 cargados»—, y esa cifra necesita su fecha como
               cualquier otra. La pone `fechaCalculo`, que llegaba y no se
               dibujaba. */
            (avanceDeCobranza?.note ?? 'Del panel de recaudación.') + alDia(kpisDeRecaudacion.datos?.fechaCalculo),
    },
  ];

  /**
   * El embudo de la emisión.
   *
   * `CorridaPredialResource.Etapa` publica `(etapa, registros, monto,
   * observados, estado)` y **no `pct`**: la barra de avance del artboard no
   * tiene origen, así que se dibuja sobre los registros de la etapa mayor. Y
   * las etiquetas son las del backend —tres—, no las cinco del prototipo:
   * ninguna de las cinco coincide letra por letra con ninguna de las tres, y
   * traducirlas sería inventar el mapeo.
   */
  const etapasDeLaEmision = (() => {
    const etapas = corrida.datos?.etapas ?? [];
    if (etapas.length === 0) return [];
    const mayor = Math.max(...etapas.map((e) => e.registros), 1);
    return etapas.map((e) => ({
      etapa: e.etapa,
      pct: Math.round((e.registros / mayor) * 100),
      registros: e.registros.toLocaleString('es-PE'),
      estado: e.estado,
      tono: e.observados > 0 ? 'warn' : 'ok',
    }));
  })();

  const esExpediente = (dest === 'padron' && sujeto !== null) || esNuevo;
  const impedimentoDeLaHoja = hoja === 'alta' ? impedimentoDelAlta() : impedimentoDeLaBaja();

  /* Cifras derivadas: el total del alta sale de los mismos cuatro campos que se
     ven en pantalla, y es una previsualización de lo que se manda —no una cifra
     traída—. La suma de la baja ya NO se calcula aquí: la trae el servidor con
     la obligación, cada parte con su fecha. */
  /**
   * Que cuotas abarca el alta, resuelto de las DOS cajas del manual (#538).
   *
   * El formulario dibuja «Cuota desde» y «Cuota hasta», y el backend admite
   * desde #538 tres formas que **no se adivinan**:
   *
   * <ul>
   *   <li>las dos en blanco → ni `cuota` ni rango: la obligacion **anual**,
   *       `periodo = 0`, que es lo que significaba y sigue significando;
   *   <li>una sola cuota —«desde» sola, o las dos iguales— → `cuota`;
   *   <li>«desde» y «hasta» distintas → `cuotaDesde`/`cuotaHasta`, y el backend
   *       asienta **una por cuota**.
   * </ul>
   *
   * Las dos iguales van como `cuota` y no como un rango de uno, y no es
   * indiferente: con `0` en las dos, `cuotaDesde: 0` es un 422 —«0 es la
   * obligacion anual, no la cuota cero»— mientras que `cuota: 0` es
   * exactamente la anual. Una sola regla, y nunca pisa esa guarda.
   *
   * Devuelve `null` cuando lo escrito no es una pregunta entera; el motivo lo
   * dice `impedimentoDelAlta`, que es quien apaga el boton. Aqui no se elige por
   * nadie: adivinar cual de las dos mitades vale seria el defecto que #538
   * cierra, con otro nombre.
   */
  const cuotasDelAlta = (): { cuota?: number; cuotaDesde?: number; cuotaHasta?: number } | null => {
    const d = texto('altaCuotaD').trim();
    const h = texto('altaCuotaH').trim();
    const esCuota = (x: string) => /^\d{1,2}$/.test(x) && Number(x) >= 0 && Number(x) <= 12;
    if (d === '' && h === '') return {};
    if (!esCuota(d) || (h !== '' && !esCuota(h))) return null;
    if (d === '') return null;
    if (h === '' || Number(h) === Number(d)) return { cuota: Number(d) };
    if (Number(d) === 0 || Number(d) > Number(h)) return null;
    return { cuotaDesde: Number(d), cuotaHasta: Number(h) };
  };

  /** Cuantas obligaciones mueve el alta tal como esta escrita. `1` si no es un rango. */
  const cuantasCuotasDelAlta = (): number => {
    const c = cuotasDelAlta();
    if (c === null) return 1;
    return c.cuotaDesde === undefined || c.cuotaHasta === undefined ? 1 : c.cuotaHasta - c.cuotaDesde + 1;
  };

  const altaInsoluto = numero(texto('altaInsoluto'));
  const altaReajuste = numero(texto('altaReajuste'));
  const altaInteres = numero(texto('altaInteres'));
  const altaGastos = numero(texto('altaGastos'));
  const altaTotal = altaInsoluto + altaReajuste + altaInteres + altaGastos;
  /* La franja sólo enseña cifras cuando hay un acto del que hablar: un
     contribuyente elegido y al menos una de las cuatro partes escrita. */
  const PARTES_DEL_ALTA = ['altaInsoluto', 'altaReajuste', 'altaInteres', 'altaGastos'];
  const hayAlgoQueSumarEnElAlta = sujetoDeDeuda !== null && PARTES_DEL_ALTA.some((k) => texto(k).trim() !== '');
  const importeDelAlta = (clave: string, valor: number) =>
    hayAlgoQueSumarEnElAlta && texto(clave).trim() !== '' ? soles(valor) : '—';
  const obligacionesDelTransferente = deudaDelTransferente.datos?.deudasPendientes.contenido ?? [];

  const etiquetaDelDestino = modulo.destinos.find((x) => x.k === dest)?.label ?? 'Rentas';

  /* La miga y el título del expediente salen de quien está abierto. Eran dos
     constantes de la maqueta —«00000025673» y «Suc. Rufina Medina Medina»—, así
     que la cabecera de la página nombraba a una persona y la barra de contexto,
     tres líneas más abajo, a otra: la que se acababa de pulsar. */
  const miga = esNuevo
    ? ['Rentas', 'Contribuyentes', 'Nuevo']
    : esExpediente
      ? ['Rentas', 'Contribuyentes', contribuyenteAbierto?.codigo ?? sujeto ?? '—']
      : dest === 'reporte'
        ? ['Rentas', 'Documentos']
        : ['Rentas', etiquetaDelDestino];

  const titulo = esNuevo
    ? 'Nuevo contribuyente'
    : esExpediente
      ? (contribuyenteAbierto?.nombreRazonSocial ?? (expediente.cargando ? 'Leyendo el padrón…' : 'Contribuyente'))
      : dest === 'reporte'
        ? 'Declaración jurada'
        : dest === 'determinar'
          ? det.label
          : etiquetaDelDestino;

  const contexto: Contexto | undefined =
    esExpediente && !esNuevo
      ? {
          volver: { label: 'Padrón', onClick: () => setSujeto(null) },
          codigo: contribuyenteAbierto?.codigo ?? sujeto ?? '—',
          titular: expediente.cargando
            ? 'Leyendo el padrón…'
            : expediente.error
              ? 'No se pudo leer este contribuyente'
              : (contribuyenteAbierto?.nombreRazonSocial ?? 'Ese código no está en el padrón'),
          /* El tipo de persona va como el padrón lo guarda, por lo mismo que
             en la franja de aquí abajo: son cuatro y decir «Natural» de una
             sucesión indivisa cambia quién responde por la deuda. */
          ubic: contribuyenteAbierto
            ? `${contribuyenteAbierto.tipoDocumento} ${contribuyenteAbierto.numeroDocumento} · ${contribuyenteAbierto.tipoPersona}`
            : '',
          estado: sucio ? 'Cambios sin guardar' : contribuyenteAbierto ? 'Del padrón' : '',
          estadoColor: sucio ? 'var(--warn-fg)' : 'var(--ok-fg)',
        }
      : esDeuda
        ? /* La barra decía «00000006550 · DÍAZ MADRID, JULIO CÉSAR · S/ 9,412.15
             pendientes» pasara lo que pasara: un contribuyente, una deuda y una
             fecha de la maqueta encima del formulario que mueve deuda de verdad.
             Ahora dice a quién se eligió, o que no se ha elegido a nadie. */
          {
            volver: { label: 'Padrón', onClick: () => onDest('padron') },
            codigo: sujetoDeDeuda?.codigo ?? '—',
            titular: sujetoDeDeuda?.nombreRazonSocial ?? 'Sin contribuyente elegido',
            ubic: sujetoDeDeuda ? `${sujetoDeDeuda.tipoDocumento} ${sujetoDeDeuda.numeroDocumento}` : '',
            estado: hoja === 'alta' ? 'Alta de deuda' : 'Baja de deuda',
            estadoColor: 'var(--ink-3)',
          }
        : undefined;

  const paleta: EntradaDePaleta[] = OPCIONES_DE_RENTAS.map((o) => ({
    label: o[0],
    nota: 'Rentas',
    /* Las cuatro entradas del expediente llevan al padrón, no al código de la
       maqueta: `00000025673` no está en ningún padrón real, así que abrirlo daba
       un expediente que sólo puede decir que ese código no existe. Quién es se
       elige en la lista. */
    ir: () => onDest(o[1] === 'expediente' ? 'padron' : o[1]),
  }));

  return (
    <Shell modulo="rentas" dest={dest} onDest={onDest} miga={miga} titulo={titulo} contexto={contexto} paleta={paleta}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Rentas convierte lo que Catastro registró en una obligación de pago: quién debe, por qué unidad, cuánto y en qué cuotas. Todo
              cuelga del contribuyente; el resto son actos que se le aplican.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={H2}>Estado de la emisión {pref.ejercicio}</h2>
                <span style={META}>
                  {corrida.cargando
                    ? 'leyendo…'
                    : corrida.error !== null
                      ? 'no se pudo leer'
                      : corrida.datos
                        ? `${corrida.datos.etapas.length} etapas`
                        : 'sin corridas'}
                </span>
              </div>
              {corrida.error !== null && (
                <div style={{ padding: '14px 16px' }}>
                  <FalloDeLectura
                    error={corrida.error}
                    que="la última corrida de la emisión"
                    acceso="predial_masivo"
                    alReintentar={corrida.reintentar}
                  />
                </div>
              )}
              {corrida.error === null && etapasDeLaEmision.length === 0 && !corrida.cargando && (
                <p style={{ margin: 0, padding: '16px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  No hay ninguna corrida masiva del predial todavía, así que no hay emisión que seguir. El embudo aparece cuando se lance
                  la primera; dibujarlo ahora con ceros se leería como una corrida que salió vacía.
                </p>
              )}
              {etapasDeLaEmision.map((e) => (
                <div key={e.etapa} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ flex: '0 0 210px', fontSize: 13, color: 'var(--ink)' }}>{e.etapa}</span>
                  <span style={{ flex: 1, minWidth: 60, height: 6, borderRadius: 999, background: 'var(--accent-soft)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${e.pct}%`, background: 'var(--accent)', borderRadius: 999 }} />
                  </span>
                  <span style={{ flex: '0 0 88px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                    {e.registros}
                  </span>
                  <span style={{ flex: '0 0 auto' }}>
                    <Insignia tono={e.tono as Tono}>{e.estado}</Insignia>
                  </span>
                </div>
              ))}
              <p style={{ ...PIE, borderTop: 0 }}>
                Los contribuyentes observados quedan sin emisión hasta que se corrija la inconsistencia: predio sin arancel, ficha no
                conciliada o titularidad incompleta.
              </p>
            </section>

            {/* Un indicador que sale «—» porque la lectura falló y otro que sale «—»
                porque ninguna operación lo publica se leen igual, y no son lo
                mismo: el primero se puede reintentar y el segundo no. */}
            {censoDelPadron.error !== null && (
              <FalloDeLectura
                error={censoDelPadron.error}
                que="el censo del padrón"
                acceso="consulta_contribuyentes"
                alReintentar={censoDelPadron.reintentar}
              />
            )}
            {kpisDeRecaudacion.error !== null && (
              <FalloDeLectura
                error={kpisDeRecaudacion.error}
                que="el panel de recaudación"
                acceso="panel_recaudacion"
                alReintentar={kpisDeRecaudacion.reintentar}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {kpisDelPanel.map((k) => (
                <div
                  key={k.etiqueta}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    boxShadow: 'var(--shadow-1)',
                    padding: '16px 17px',
                  }}
                >
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>
                    {k.valor}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ PADRÓN DE CONTRIBUYENTES ══════════ */}
        {dest === 'padron' && !esExpediente && (
          <div style={COLUMNA}>
            <p style={ENTRADILLA}>
              Padrón único del contribuyente. Su código enlaza predios, vehículos, licencias, papeletas y la cuenta corriente: encontrarlo
              es el primer paso de casi todo lo que se hace aquí.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nombre, DNI, RUC, código o placa"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
                {q !== '' && (
                  <button
                    onClick={() => setQ('')}
                    aria-label="Limpiar la búsqueda"
                    className="hov-linea"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, width: 30, height: 30, display: 'grid', placeItems: 'center', background: 'var(--bg-card)', cursor: 'pointer', flex: '0 0 auto' }}
                  >
                    <Icono d={ICO.cerrar} tam={13} grosor={1.9} />
                  </button>
                )}
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '9px 16px',
                }}
              >
                {/* Los cuatro filtros rápidos del artboard —con deuda vencida,
                    predio sin conciliar, con beneficio, persona jurídica— no
                    existen en `ContribuyenteController`, que acota por código,
                    nombre, DNI y RUC y por nada más. Un chip que se pulsa y no
                    filtra es peor que no tenerlo, así que se dice dónde vive
                    cada uno. */}
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  El padrón acota por código, nombre, DNI y RUC. Quién tiene deuda vencida se pregunta en Consultas, quién no concilia en
                  Catastro, y el beneficio en su propia consulta: no son filtros de esta lista.
                </span>
              </div>
            </section>

            {cargando && (
              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div data-esq="1" style={{ width: 180, height: 15 }} />
                </div>
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div data-esq="1" style={{ width: 112, height: 13 }} />
                    <div data-esq="1" style={{ flex: 1, height: 13 }} />
                    <div data-esq="1" style={{ width: 74, height: 13 }} />
                  </div>
                ))}
              </section>
            )}

            {/* Una lectura que falla NO es un padrón vacío. Antes se dibujaba la
                tarjeta de resultados con «0 de 0» y la tabla sin filas: se lee
                como «esa persona no existe», y lo que la pantalla ofrece a
                continuación es crear un contribuyente —así que el desenlace
                natural de un 403 era duplicar en el padrón a alguien que sí
                figura—. */}
            {!cargando && padron.error !== null && (
              <FalloDeLectura
                error={padron.error}
                que="el padrón"
                acceso="consulta_contribuyentes"
                alReintentar={padron.reintentar}
              />
            )}

            {!cargando && vacio && (
              <section
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '44px 24px',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  background: 'var(--bg-card)',
                }}
              >
                <Icono d={ICO.lupa} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Ningún contribuyente con esos datos</p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  Puede estar registrado con el código antiguo, con otro documento, o no estar. Si viene a declarar por primera vez, créalo
                  aquí mismo.
                </p>
                <button
                  onClick={() => onDest('alta')}
                  className="hov-acento-2"
                  style={{
                    marginTop: 6,
                    border: 0,
                    borderRadius: 6,
                    padding: '9px 18px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Nuevo contribuyente
                </button>
              </section>
            )}

            {!cargando && !vacio && padron.error === null && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Contribuyentes encontrados</h2>
                  <span style={META}>
                    {filasDelPadron.length} de {(padron.datos?.totalElementos ?? 0).toLocaleString('es-PE')}
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                    <thead>
                      <tr>
                        {COLUMNAS_DEL_PADRON.map((c) => (
                          <th key={c[0]} style={c[1] ? THN : TH}>
                            {c[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filasDelPadron.map((r) => (
                        <tr
                          key={r.id}
                          {...filaPulsable(
                            `Abrir la ficha de ${r.nombreRazonSocial}, ${r.codigo}`,
                            () => abrirExpediente(r.codigo),
                          )}
                          className="hov-acento"
                          style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                        >
                          <td style={{ padding: '11px 14px' }}>
                            <Insignia tono={r.activo ? 'ok' : 'bad'}>{r.activo ? 'A' : 'I'}</Insignia>
                          </td>
                          <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                            {r.codigo}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{r.nombreRazonSocial}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                            {r.tipoDocumento} {r.numeroDocumento}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                            {r.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural'}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                            {r.condicionEspecial ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {padron.datos !== null && (
                  <Paginador
                    pagina={padron.datos.pagina}
                    totalPaginas={padron.datos.totalPaginas}
                    hayMas={padron.datos.hayMas}
                    ir={setPaginaPadron}
                  />
                )}
                {/* Por que faltan tres columnas del artboard, dicho donde se
                    echan en falta. */}
                <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  El domicilio fiscal, las unidades y la deuda no salen en esta lista: `ContribuyenteResource` no los publica. Los tres se
                  ven al abrir el expediente, que es donde se piden de uno en uno.
                </p>
                {/* El pie del artboard decía «La deuda es a la fecha de hoy e
                    incluye reajuste, interés y gastos», tres líneas debajo de la
                    nota que explica que la deuda NO está en esta tabla porque
                    `ContribuyenteResource` no la publica. Se queda lo que sí es
                    verdad de esta lista, y dónde se ve la deuda. */}
                <p style={PIE}>
                  La deuda de cada uno se ve al abrir su expediente y en «Consulta de deuda»: se calcula a una fecha, no se guarda, y por
                  eso cambia cada día.
                </p>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EXPEDIENTE DEL CONTRIBUYENTE ══════════ */}
        {esExpediente && (
          <div style={COLUMNA}>
            {expediente.error !== null && (
              <FalloDeLectura
                error={expediente.error}
                que="este contribuyente"
                acceso="consulta_contribuyentes"
                alReintentar={expediente.reintentar}
              />
            )}
            {!esNuevo && expediente.error === null && !expediente.cargando && contribuyenteAbierto === null && (
              <Aviso tono="warn" titulo={`El código ${sujeto ?? ''} no está en el padrón`}>
                La lista lo trajo y la ficha no lo encuentra: puede haberse dado de baja entre las dos lecturas, o la búsqueda haber
                devuelto otra municipalidad. No se dibuja nada suyo mientras no se sepa quién es.
              </Aviso>
            )}
            {/* El fallo de la ficha se dice UNA vez y aquí: de ella salen los
                campos de cuatro secciones y tres de las listas, así que
                repetirlo en cada bloque haría creer que fallaron siete cosas.
                Los controles quedan con el guion largo y las tablas remiten a
                este aviso. */}
            {ficha.error !== null && (
              <FalloDeLectura
                error={ficha.error}
                que="la ficha de este contribuyente"
                acceso="contribuyentes"
                alReintentar={ficha.reintentar}
              />
            )}
            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {resumenDelExpediente.map((r) => (
                  <div
                    key={r.etiqueta}
                    style={{
                      background: 'var(--bg-card)',
                      padding: '14px 16px',
                      borderLeft: '1px solid var(--line)',
                      borderTop: '1px solid var(--line)',
                      margin: '-1px 0 0 -1px',
                    }}
                  >
                    <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
                      {r.etiqueta}
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r.color }}>{r.valor}</p>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '11px 16px',
                  borderTop: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>
                  Actos sobre este contribuyente
                </span>
                {(
                  [
                    ['Determinar predial', () => { setTipo('predial'); onDest('determinar'); }],
                    ['Transferir predio', () => { setTrTipo('predio'); setTrPaso(0); onDest('transferir'); }],
                    /* Se lleva al contribuyente abierto: es lo que el propio
                       botón promete —«Actos sobre ESTE contribuyente»— y lo que
                       evita volver a buscarlo. */
                    ['Alta de deuda', () => { setHoja('alta'); sujetoDeDeudaAlLlegar.current = contribuyenteAbierto; onDest('deuda'); }],
                    ['Declaración jurada', () => onDest('reporte')],
                  ] as [string, () => void][]
                ).map((a) => (
                  <button
                    key={a[0]}
                    onClick={a[1]}
                    className="hov-linea"
                    style={{
                      border: '1px solid var(--line-2)',
                      borderRadius: 999,
                      padding: '5px 13px',
                      background: 'var(--bg-card)',
                      fontSize: 12,
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                    }}
                  >
                    {a[0]}
                  </button>
                ))}
              </div>
            </section>

            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <nav
                aria-label="Secciones del expediente"
                data-sm-hide="1"
                style={{ flex: '0 0 208px', width: 208, position: 'sticky', top: 112, display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <p style={{ margin: '0 0 6px 10px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                  En este expediente
                </p>
                {EXPEDIENTE.map((g) => (
                  /* El artboard enlaza con `href="#ident"`; aquí la ruta vive en
                     el hash, así que el índice desplaza con `scrollIntoView` en
                     vez de reescribir la URL y sacar al usuario del módulo. */
                  <button
                    key={g.id}
                    onClick={() => document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="hov-acento"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      border: 0,
                      borderRadius: 7,
                      padding: '8px 10px',
                      background: 'transparent',
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{g.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>{g.conteo}</span>
                  </button>
                ))}
                <p style={{ margin: '9px 10px 0', fontSize: 11, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                  Nueve pestañas se volvieron seis secciones apiladas. El índice desplaza; no esconde.
                </p>
              </nav>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {EXPEDIENTE.map((g, gi) => {
                  const c = plegable('exp|' + g.id, gi < 2);
                  return (
                    <section key={g.id} id={g.id} style={{ ...TARJETA, scrollMarginTop: 120 }}>
                      <Cabecera abierta={c.abierta} onToggle={c.toggle} label={g.label} hint={g.hint} marca={g.conteo} />
                      {c.abierta && (
                        <div style={{ borderTop: '1px solid var(--line)' }}>
                          {g.bloques.map((bl, bi) => (
                            <div key={bi} style={{ borderBottom: '1px solid var(--line)' }}>
                              {bl.titulo && (
                                <p
                                  style={{
                                    margin: 0,
                                    padding: '12px 16px 0',
                                    fontSize: 10,
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '.13em',
                                    color: 'var(--ink-3)',
                                  }}
                                >
                                  {bl.titulo}
                                </p>
                              )}
                              {bl.nota && (
                                <p style={{ margin: 0, padding: '8px 16px 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                                  {bl.nota}
                                </p>
                              )}
                              {bl.campos.length > 0 && <div style={REJILLA_DE_CAMPOS}>{bl.campos.map(campo)}</div>}
                              {/* Un bloque con `lectura` lo llena el backend; el
                                  resto sigue saliendo del catálogo. */}
                              {bl.tabla && bl.lectura === 'predios' && (
                                <TablaLeida
                                  tabla={bl.tabla}
                                  estado={prediosDelContribuyente}
                                  irAPagina={setPaginaDePredios}
                                  cuenta={(n) => `${n} ${n === 1 ? 'predio' : 'predios'}`}
                                  vacia="Este contribuyente está en el padrón y no tiene ningún predio inscrito a su nombre."
                                  sinPreguntar="No se ha preguntado: sin un contribuyente del padrón abierto no hay de quién listar predios. Pasa con un expediente nuevo, que todavía no está en el padrón, y con un código que el padrón no reconoce."
                                  fila={(p: PredioDelContribuyente) => [
                                    p.codigoReferenciaCatastral,
                                    p.direccion,
                                    p.tipo,
                                    p.uso ?? SIN_DATO,
                                    p.sector ?? SIN_DATO,
                                    p.areaTerreno ?? SIN_DATO,
                                    p.porcentajePropiedad,
                                    p.condicion ?? SIN_DATO,
                                  ]}
                                />
                              )}
                              {bl.tabla && bl.lectura === 'vehiculos' && (
                                <TablaLeida
                                  tabla={bl.tabla}
                                  estado={vehiculosDelContribuyente}
                                  irAPagina={setPaginaDeVehiculos}
                                  cuenta={(n) => `${n} ${n === 1 ? 'vehículo' : 'vehículos'}`}
                                  vacia="Este contribuyente está en el padrón y no tiene ningún vehículo a su nombre."
                                  sinPreguntar="No se ha preguntado: sin un contribuyente del padrón abierto no hay de quién listar vehículos. Pasa con un expediente nuevo, que todavía no está en el padrón, y con un código que el padrón no reconoce."
                                  fila={(v: VehiculoDelContribuyente) => [
                                    v.placa,
                                    v.clase ?? SIN_DATO,
                                    v.marca,
                                    v.modelo,
                                    String(v.anioFabricacion),
                                    `${String(v.afectoDesde)} — ${String(v.afectoHasta)}`,
                                    v.estado,
                                  ]}
                                />
                              )}
                              {bl.tabla && bl.lectura === 'beneficios' && (
                                <TablaLeida
                                  tabla={bl.tabla}
                                  estado={beneficios}
                                  irAPagina={setPaginaDeBeneficios}
                                  cuenta={(n) => `${n} ${n === 1 ? 'beneficio' : 'beneficios'}`}
                                  vacia="Este contribuyente no tiene ningún beneficio ni exoneración registrado."
                                  sinPreguntar="No se ha preguntado: sin un contribuyente del padrón abierto no hay de quién listar beneficios. Pasa con un expediente nuevo, que todavía no está en el padrón, y con un código que el padrón no reconoce."
                                  fila={(b: BeneficioDelContribuyente) => [
                                    b.tipo,
                                    b.tributo,
                                    b.clase,
                                    b.porcentaje ?? SIN_DATO,
                                    b.monto ?? SIN_DATO,
                                    /* Los dos extremos del tramo, tal como la
                                       lectura los da. Sin `vigenciaHasta` no es
                                       un error: es el que no vence. */
                                    `${b.vigenciaDesde} — ${b.vigenciaHasta ?? 'sin vencimiento'}`,
                                    b.baseLegal,
                                    b.documentoOrigen,
                                  ]}
                                />
                              )}
                              {bl.tabla && bl.lectura === 'domicilios' && (
                                <TablaDeLaFicha
                                  tabla={bl.tabla}
                                  estado={ficha}
                                  cuenta={(n) => `${n} ${n === 1 ? 'tramo' : 'tramos'}`}
                                  vacia="Este contribuyente no tiene ningún domicilio registrado. Sin uno vigente no hay a dónde notificarle."
                                  filas={(f) =>
                                    f.historialDeDomicilios.map((d) => [
                                      d.tipo,
                                      d.direccion,
                                      d.referencia ?? SIN_DATO,
                                      d.ubigeo ?? SIN_DATO,
                                      d.vigenciaDesde,
                                      /* Nulo es «el que rige», no un dato que
                                         falte: se dice con palabras y no con el
                                         guion largo, que aquí significaría que
                                         la fecha no se publica. */
                                      d.vigenciaHasta ?? 'vigente',
                                      d.documentoOrigen,
                                    ])
                                  }
                                />
                              )}
                              {bl.tabla && bl.lectura === 'contactos' && (
                                <TablaDeLaFicha
                                  tabla={bl.tabla}
                                  estado={ficha}
                                  cuenta={(n) => `${n} ${n === 1 ? 'registro' : 'registros'}`}
                                  vacia="Este contribuyente no tiene ningún teléfono, correo ni gestor registrado."
                                  filas={(f) =>
                                    f.contactos.map((c) => [
                                      c.tipo,
                                      c.valor,
                                      c.nombre ?? SIN_DATO,
                                      c.documento ?? SIN_DATO,
                                      c.observacion ?? SIN_DATO,
                                      c.vigente ? 'Sí' : 'No',
                                    ])
                                  }
                                />
                              )}
                              {bl.tabla && bl.lectura === 'responsables' && (
                                <TablaDeLaFicha
                                  tabla={bl.tabla}
                                  estado={ficha}
                                  cuenta={(n) => `${n} ${n === 1 ? 'vínculo' : 'vínculos'}`}
                                  vacia="Nadie responde solidariamente con este contribuyente."
                                  filas={(f) =>
                                    f.responsables.map((r) => [
                                      String(r.responsableId),
                                      r.vinculo,
                                      /* El porcentaje sólo lo llevan los
                                         vínculos que reparten; en los demás el
                                         recurso lo publica nulo. */
                                      r.porcentaje ?? SIN_DATO,
                                      r.vigenciaDesde,
                                      r.vigenciaHasta ?? 'abierto',
                                      r.documentoOrigen,
                                    ])
                                  }
                                />
                              )}
                              {bl.tabla && bl.lectura === undefined && (
                                <BloqueDeTabla tabla={bl.tabla} onAnadir={() => toast('Se abriría el alta de una fila de esta lista.')} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ DETERMINACIONES ══════════ */}
        {dest === 'determinar' && (
          <div style={COLUMNA}>
            <p style={ENTRADILLA}>
              Seis determinaciones que antes eran seis pantallas distintas y hacían lo mismo: fijar el sujeto, enseñar de dónde sale la cifra
              y escribirla. Ahora tienen una sola forma y la cuenta se lee como cuenta.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIPOS_DE_DETERMINACION.map((k) => (
                <button key={k} onClick={() => setTipo(k)} aria-pressed={tipo === k} className="hov-linea" style={pastilla(tipo === k)}>
                  {DETERMINACIONES[k].label}
                </button>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>{det.titulo}</h2>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', background: 'var(--bg-elev)', borderRadius: 999, padding: '4px 10px' }}>
                  {det.endpoint}
                </code>
              </div>
              <p style={{ margin: 0, padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '80ch', textWrap: 'pretty' }}>
                {det.desc}
              </p>
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                  gap: '14px 16px',
                  padding: '15px 16px',
                  alignItems: 'end',
                }}
              >
                {det.filtros.map((f, i) => {
                  /* El campo condicional no se dibuja hasta que su alcance está
                     elegido (#577). No es lo mismo que apagarlo: apagado diría
                     que no sirve, y sirve —con SU alcance—; dibujarlo siempre
                     ofrecería una caja que la corrida no va a leer. El índice se
                     conserva porque es la clave del valor tecleado: saltarse uno
                     al pintar no puede correr los demás. */
                  if (f.soloCon !== undefined && f.soloCon !== alcanceDeLaCorrida) return null;
                  const clave = `${tipo}|${i}`;
                  const valor = filtros[clave] ?? f.v;
                  const cambiar = (v: string) => setFiltros((s) => ({ ...s, [clave]: v }));
                  /* El desplegable de sector no tiene opciones escritas: son las
                     del catastro, y mientras se leen no hay ninguna que elegir. */
                  const opciones = f.k === 'sector' ? ['', ...codigosDeSector] : (f.o ?? []);
                  const apagado = f.bloqueado !== undefined;
                  const ayuda =
                    f.bloqueado ??
                    (f.k === 'sector' && sectores.error !== null
                      ? 'No se pudieron leer los sectores del catastro: hace falta el acceso «sectores».'
                      : undefined);
                  return (
                    <label key={f.l} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }} title={ayuda}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: apagado ? 'var(--ink-4)' : 'var(--ink-3)' }}>
                        {f.l}
                        {apagado && ' · no acota'}
                      </span>
                      {f.t === 'sel' ? (
                        <select
                          value={valor}
                          disabled={apagado}
                          onChange={(e) => cambiar(e.target.value)}
                          style={{ ...IN, ...(apagado ? APAGADO : null) }}
                        >
                          {f.k === 'sector' && sectores.cargando && <option value="">leyendo los sectores…</option>}
                          {opciones.map((o) => (
                            <option key={o} value={o}>
                              {o === '' ? '(elige un sector)' : o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={valor}
                          disabled={apagado}
                          onChange={(e) => cambiar(e.target.value)}
                          placeholder={f.ph}
                          style={{ ...IN, ...(apagado ? APAGADO : null) }}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
              {/* El motivo se dice una vez y en pantalla, no cuatro veces dentro
                  de la rejilla ni sólo en un `title` que nadie llega a leer
                  (RNF-082). Se agrupa por motivo porque no todos los apagados lo
                  están por lo mismo. */}
              {motivosDeLosFiltrosApagados(det.filtros).map(([motivo, cuales]) => (
                <p key={motivo} style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                  <strong style={{ fontWeight: 500 }}>{cuales}</strong> {motivo}
                </p>
              ))}
              {/* Sólo con SECTOR elegido: el aviso señala una caja, y con otro
                  alcance esa caja no está dibujada. Quien elija SECTOR se entera
                  en el mismo gesto, que es cuando le importa. */}
              {tipo === 'masivo' && alcanceDeLaCorrida === 'SECTOR' && sectores.error !== null && (
                <p style={{ ...PIE, color: 'var(--bad-ink, var(--ink-2))' }}>
                  No se pudieron leer los sectores del catastro —hace falta el acceso «sectores»—, así que la corrida por sector no se
                  puede pedir: el backend exige un código que exista y aquí no hay ninguno que ofrecer.
                </p>
              )}
              {tipo === 'masivo' && (
                <p style={PIE}>
                  «Alcance» ofrece los cuatro valores que <code>DeterminarPredialMasivo</code> admite, con sus palabras y no con los
                  rótulos del manual —«TODO EL PADRÓN», «POR SECTOR», «POR RANGO DE CÓDIGO», «SOLO OBSERVADOS»—: traducirlos sería una
                  segunda copia de la regla, y una copia se queda vieja en silencio. Dos de ellos piden lo suyo y hasta entonces no se
                  preguntan: <strong style={{ fontWeight: 500 }}>«Sector»</strong> sale con <code>SECTOR</code> y los códigos del catastro,
                  no los seis que dibujaba la maqueta; <strong style={{ fontWeight: 500 }}>«Código desde» y «Código hasta»</strong> salen
                  con <code>RANGO_DE_CODIGO</code>, y son los dos extremos del tramo, incluidos los dos.
                </p>
              )}
              {tipo === 'masivo' && alcanceDeLaCorrida === 'OBSERVADOS' && (
                <p style={PIE}>
                  <code>OBSERVADOS</code> no es «todo el padrón» con otro nombre: recorre a los que dejó fuera la{' '}
                  <strong style={{ fontWeight: 500 }}>última corrida de este ejercicio</strong>, que es la lista que no se puede recomponer
                  leyendo el padrón —un observado es, por definición, el que no tiene determinación—. Si el ejercicio todavía no se ha
                  corrido, la corrida no recorre a nadie, y eso no significa que la emisión esté limpia: «ninguno quedó observado» y
                  «todavía no se ha corrido» son dos cosas distintas, y sólo la primera se puede emitir.
                </p>
              )}
            </section>

            {det.tabla && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>{tipo === 'vehicular' && filasDeLaDeterminacion(tipo, determinacion).length > 0 ? 'Determinación del ejercicio, por vehículo' : det.tabla.titulo}</h2>
                  <span style={META}>
                    {determinacion === null
                      ? det.tabla.conteo
                      : `${filasDeLaDeterminacion(tipo, determinacion).length} de la determinación`}
                  </span>
                </div>
                <TablaDeDatos
                  cols={tipo === 'vehicular' ? COLS_DE_LA_DETERMINACION_VEHICULAR : det.tabla.cols}
                  filas={filasDeLaDeterminacion(tipo, determinacion)}
                  min={det.tabla.min}
                  vacia={
                    determinacion === null
                      ? VACIA_EN_LA_DETERMINACION[tipo]
                      : 'La determinación no trajo ninguna fila para esta tabla.'
                  }
                />
                {tipo === 'vehicular' && (
                  <p style={PIE}>
                    El artboard dibujaba «Determinación por ejercicio» con los tres años en que el vehículo permanece afecto, y esta
                    operación determina <strong>un</strong> ejercicio y devuelve una fila por vehículo. Las columnas son las que el recurso
                    publica: con las del artboard, dos vehículos darían dos filas del mismo año sin decir de cuál es cada importe.
                  </p>
                )}
                {det.tabla.nota && <p style={PIE}>{det.tabla.nota}</p>}
              </section>
            )}

            {det.memoria && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>{det.memoria.titulo}</h2>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>De dónde sale la cifra</span>
                </div>
                <div style={{ padding: '6px 16px 14px' }}>
                  {lineasDeLaMemoria(tipo, det.memoria.lineas, determinacion).map((l, i) => {
                    const fuerte = l[4] === 'total';
                    const sub = l[4] === 'sub';
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 12,
                          padding: fuerte ? '12px 16px' : '9px 0',
                          borderBottom: fuerte || sub ? '1px solid var(--ink-3)' : '1px solid var(--line)',
                          ...(fuerte ? { background: 'var(--accent-soft)', margin: '0 -16px', borderRadius: 6 } : null),
                        }}
                      >
                        <span style={{ flex: '0 0 22px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-4)', textAlign: 'center' }}>
                          {l[0]}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, color: fuerte ? 'var(--ink)' : 'var(--ink-2)' }}>{l[1]}</span>
                          {l[2] && (
                            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2, textWrap: 'pretty' }}>{l[2]}</span>
                          )}
                        </span>
                        <span
                          style={{
                            flex: '0 0 auto',
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: fuerte ? 17 : sub ? 14.5 : 13.5,
                            fontWeight: fuerte || sub ? 500 : 400,
                            color: fuerte ? 'var(--accent-ink)' : 'var(--ink)',
                          }}
                        >
                          {/* El prefijo lo dice la línea: una alícuota no lleva «S/». */}
                          {l[5] === '' ? l[3] : `${l[5] ?? 'S/'} ${l[3]}`}
                        </span>
                      </div>
                    );
                  })}
                  <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {determinacion === null
                      ? det.memoria.nota
                      : 'Todas las cifras de arriba son las que devolvió el servidor: ni una se compone aquí (RNF-083), y los tramos —cuántos son, dónde está su tope y qué alícuota lleva cada uno— salen del conjunto sellado del ejercicio.'}
                  </p>
                </div>
              </section>
            )}

            {(det.secciones ?? []).map((sec, i) => {
              const c = plegable(`det|${tipo}|${i}`, i === 0);
              return (
                <section key={sec.label} style={TARJETA}>
                  <Cabecera abierta={c.abierta} onToggle={c.toggle} label={sec.label} hint={sec.hint} />
                  {c.abierta && <div style={{ borderTop: '1px solid var(--line)', ...REJILLA_DE_CAMPOS }}>{sec.campos.map(campo)}</div>}
                </section>
              );
            })}

            {det.totales && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
                  gap: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                {totalesDeLaDeterminacion(tipo, det.totales, determinacion).map((t) => (
                  <div key={t[0]} style={celdaDeTotal(t[2] === 1)}>
                    <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
                  </div>
                ))}
              </div>
            )}

            {/* La fecha y el conjunto con que se calculó. Sin las dos, la cifra
                de arriba no se puede recalcular ni fechar: toda cifra dice a qué
                fecha está (regla 9, RNF-075) y una determinación dice además con
                qué juego de valores sellado, porque dos conjuntos del mismo
                ejercicio dan dos importes distintos y los dos correctos. */}
            {determinacion !== null && (
              <div
                aria-label="Fecha y parámetros de la determinación"
                style={{
                  display: 'flex',
                  gap: 14,
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  padding: '10px 14px',
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--ink-3)',
                }}
              >
                <span>
                  Simulado al <strong style={{ color: 'var(--ink-2)' }}>{bandaDeLaDeterminacion(determinacion).fecha}</strong>
                </span>
                <span>
                  Conjunto de parámetros <strong style={{ color: 'var(--ink-2)' }}>{bandaDeLaDeterminacion(determinacion).conjunto}</strong>
                </span>
                <span style={{ marginLeft: 'auto' }}>No se asentó nada: la petición llevó la marca de simulación.</span>
              </div>
            )}

            {/* Lo que el servidor contestó cuando no pudo calcular.
                El mensaje se enseña TAL CUAL porque es el único que nombra lo
                que falta —«El ejercicio 2026 no tiene un conjunto de parametros
                sellado», `TRAMO_PREDIAL_LIMITE:2`, `DERECHO_EMISION_PREDIAL`— y
                reescribirlo aquí perdería justo eso (#540, RNF-080). Y
                «Reintentar» sólo sale cuando reintentar puede cambiar algo:
                `ErrorDeApi.reintentable` es falso en un 422, y ofrecerlo encima
                de una ordenanza sin publicar manda a pulsar el botón para
                siempre. */}
            {falloDeLaDeterminacion !== null && (
              <Aviso tono="bad" titulo="No se calculó la determinación">
                {explicacionDelFallo(
                  falloDeLaDeterminacion,
                  tipo === 'masivo' ? 'predial_masivo' : tipo === 'vehicular' ? 'vehicular_calculo' : 'predial_individual',
                )}
                {/* «Reintentar» sólo donde reintentar puede cambiar algo. */}
                {falloDeLaDeterminacion.reintentable && (
                  <div style={{ marginTop: 9 }}>
                    <button onClick={() => void simular()} style={BOTON_SECUNDARIO}>
                      Reintentar
                    </button>
                  </div>
                )}
              </Aviso>
            )}

            {/* Simular no es asentar. Las seis siguen sin poder ESCRIBIR la
                determinación, y la primaria decía «Determinación asentada en la
                cuenta corriente»: un acto que afirma haber escrito deuda y no
                salió de la pantalla. Se apagan las seis con lo que le falta a
                cada una. */}
            <Aviso tono="warn" titulo={det.simula === undefined ? 'Aquí todavía no se determina nada' : 'Aquí se simula; asentar todavía no'}>
              {IMPEDIMENTO_DE_LA_DETERMINACION[tipo]}
            </Aviso>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{det.aviso}</p>
              {det.acciones.map((a) => {
                /* La acción viva es UNA y la nombra el catálogo (`simula`): con
                   un booleano acabaría rotulada con lo que no hace, que es el
                   defecto que #421 cerró. */
                const laQueSimula = det.simula !== undefined && a[0] === det.simula;
                const impedimento = laQueSimula ? impedimentoDeSimular() : (a[2] ?? IMPEDIMENTO_DE_LA_DETERMINACION[tipo]);
                const viva = laQueSimula && impedimento === undefined && !simulando;
                return (
                  <button
                    key={a[0]}
                    disabled={!viva}
                    aria-disabled={viva ? undefined : 'true'}
                    title={impedimento}
                    onClick={viva ? () => void simular() : undefined}
                    style={{
                      ...(a[1] ? BOTON_PRIMARIO : BOTON_SECUNDARIO),
                      ...(viva ? null : { opacity: 0.55, cursor: 'not-allowed' }),
                    }}
                  >
                    {laQueSimula && simulando ? 'Simulando…' : a[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ TRANSFERENCIAS ══════════ */}
        {dest === 'transferir' && (
          <div style={COLUMNA}>
            <p style={ENTRADILLA}>
              Una transferencia da de baja al transferente y de alta al adquirente. El orden importa y por eso va por pasos: sin validar la
              deuda del transferente no se registra nada.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['predio', 'vehiculo'] as ClaveDeTransferencia[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setTrTipo(k);
                    setTrPaso(0);
                  }}
                  aria-pressed={trTipo === k}
                  className="hov-linea"
                  style={pastilla(trTipo === k)}
                >
                  {TRANSFERENCIAS[k].label}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '15px 17px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 11 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{pasoActual.label}</p>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                  Paso {paso + 1} de {trDef.pasos.length}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {trDef.pasos.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setTrPaso(i)}
                    aria-label={`Ir al paso ${i + 1}: ${p.label}`}
                    aria-current={i === paso ? 'step' : undefined}
                    style={{
                      flex: 1,
                      height: 6,
                      border: 0,
                      borderRadius: 999,
                      cursor: 'pointer',
                      background: i <= paso ? 'var(--accent)' : 'var(--accent-soft)',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 11 }}>
                {trDef.pasos.map((p, i) => (
                  /* `aria-current="step"` es lo que dice CUÁL es el paso
                     abierto. Sin él, el único que lo decía era el color —una
                     barrera para quien no lo distingue (RNF-082)— y además
                     `flujos.mjs` contaba el paso ya activo como un botón inerte:
                     pulsarlo no hace nada, y hace bien. */
                  <button
                    key={p.label}
                    onClick={() => setTrPaso(i)}
                    aria-current={i === paso ? 'step' : undefined}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      color: i === paso ? 'var(--accent-ink)' : 'var(--ink-4)',
                      fontWeight: i === paso ? 600 : 400,
                      textDecoration: i === paso ? 'underline' : 'none',
                      textUnderlineOffset: 3,
                    }}
                  >
                    {i + 1}. {p.label}
                  </button>
                ))}
              </div>
            </div>

            {pasoActual.campos.length > 0 && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{pasoActual.label}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    {pasoActual.nota}
                  </p>
                </div>
                <div style={REJILLA_DE_CAMPOS}>{pasoActual.campos.map(campoDeLaTransferencia)}</div>
              </section>
            )}

            {pasoActual.campos.length === 0 && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Deuda del transferente</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    La obligación del vendedor corre hasta el 31 de diciembre del año de la transferencia. Lo que quede pendiente se queda
                    con él, no viaja al comprador.
                  </p>
                </div>
                {codigoDelTransferente === null && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {esPredio
                      ? 'Aún no se sabe quién transfiere: teclea su documento en «Las partes» y el padrón dirá quién es.'
                      : 'Aún no se sabe quién transfiere: teclea la placa en «El acto» y el padrón vehicular dirá quién es su titular.'}
                  </p>
                )}
                {deudaDelTransferente.error !== null && (
                  <div style={{ padding: '14px 16px' }}>
                    <FalloDeLectura
                      error={deudaDelTransferente.error}
                      que="la deuda del transferente"
                      acceso="consulta_unificada"
                      alReintentar={deudaDelTransferente.reintentar}
                    />
                  </div>
                )}
                {deudaDelTransferente.cargando && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo su cuenta corriente…</p>
                )}
                {obligacionesDelTransferente.map((o) => (
                  <div
                    key={`${o.tributo}|${o.ejercicio}|${o.predioId ?? ''}|${o.vehiculoId ?? ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
                  >
                    <span style={{ flex: '0 0 auto' }}>
                      <Insignia tono="warn">Pendiente</Insignia>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>
                        {o.tributo} {o.ejercicio}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                        Insoluto {o.insoluto.importe} · reajuste {o.reajuste.importe} · interés {o.interes.importe} · gasto {o.gasto.importe}
                      </span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>
                      S/ {o.total.importe}
                    </span>
                  </div>
                ))}
                {deudaDelTransferente.datos !== null && obligacionesDelTransferente.length === 0 && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                    {nombreDelTransferente} no tiene deuda pendiente al {deudaDelTransferente.datos.aLaFecha}.
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', background: 'var(--bg-elev)' }}>
                  <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    La transferencia se puede registrar con deuda pendiente; lo que no se puede es emitir constancia de no adeudo.
                  </span>
                  {/* El total lo compone el servidor y llega con su fecha: sumar
                      aquí las filas sería componer dinero en la pantalla (RNF-083),
                      y además el pie del artboard traía una cifra congelada de la
                      maqueta que se dibujaba igual para cualquier transferente. */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--ink)' }}>
                    {deudaDelTransferente.datos ? `S/ ${deudaDelTransferente.datos.resumenDeSaldos.total.importe}` : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {deudaDelTransferente.datos ? `al ${deudaDelTransferente.datos.resumenDeSaldos.total.actualizadoA}` : 'sin fecha: no hay cifra'}
                  </span>
                </div>
              </section>
            )}

            {esElUltimoPaso && impedimentoDeLaTransferencia() !== undefined && (
              <p
                role="status"
                style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 6, padding: '9px 12px', textWrap: 'pretty' }}
              >
                {impedimentoDeLaTransferencia()}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <PasoAtras paso={paso} atras={() => setTrPaso(paso - 1)} />
              {paso >= trDef.pasos.length - 1 ? (
                <label style={{ flex: 1, minWidth: 220 }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>
                    Observación · obligatoria
                  </span>
                  <input
                    value={observacionDelActo}
                    onChange={(e) => setObservacionDelActo(e.target.value)}
                    placeholder="Por qué se registra, y con qué documento"
                    style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg-card)', fontSize: 13 }}
                  />
                </label>
              ) : (
                <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Nada se escribe hasta el último paso: los datos viajan en el borrador.
                </p>
              )}
              {/* El impedimento se calcula antes, no dentro del envío: el acto o
                  se puede hacer y el botón lo dice, o no se puede y dice qué
                  falta. Antes sólo miraba la observación, y con ella puesta
                  mandaba una transferencia sin transferente resuelto. */}
              <button
                onClick={() => {
                  if (paso >= trDef.pasos.length - 1) void registrarTransferencia();
                  else setTrPaso(paso + 1);
                }}
                disabled={registrando || (esElUltimoPaso && impedimentoDeLaTransferencia() !== undefined)}
                title={esElUltimoPaso ? impedimentoDeLaTransferencia() : undefined}
                className="hov-acento-2"
                style={{
                  ...BOTON_PRIMARIO,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  opacity: registrando || (esElUltimoPaso && impedimentoDeLaTransferencia() !== undefined) ? 0.55 : 1,
                }}
              >
                {paso >= trDef.pasos.length - 1 ? 'Registrar transferencia' : 'Continuar'}
                <Icono d={ICO.flechaDer} tam={14} grosor={1.8} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════ MOVIMIENTOS DE DEUDA ══════════ */}
        {esDeuda && (
          <div style={COLUMNA}>
            <p style={ENTRADILLA}>
              Alta y baja son el mismo objeto con dos actos opuestos: una obligación de la cuenta corriente. Aquí conviven, con la búsqueda a
              cuestas, para no volver a teclear el contribuyente al pasar de una a otra.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['alta', 'Alta de deuda'],
                  ['baja', 'Baja de deuda'],
                ] as ['alta' | 'baja', string][]
              ).map((h) => (
                <button key={h[0]} onClick={() => setHoja(h[0])} aria-pressed={hoja === h[0]} className="hov-linea" style={pastilla(hoja === h[0])}>
                  {h[1]}
                </button>
              ))}
            </div>

            {/* La franja del contribuyente, de verdad. Enseñaba «00000006550 ·
                DÍAZ MADRID, JULIO CÉSAR · 3 predios · 1 vehículo» de la maqueta y
                «Cambiar contribuyente» no tenía `onClick`: no había forma de
                decirle a quién se le da de alta o de baja la deuda, y el cuerpo
                salía con `codContribuyente: ''`. */}
            <section style={TARJETA}>
              {sujetoDeDeuda !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '13px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 6, padding: '4px 10px' }}>
                    {sujetoDeDeuda.codigo}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>{sujetoDeDeuda.nombreRazonSocial}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {sujetoDeDeuda.tipoDocumento} {sujetoDeDeuda.numeroDocumento} ·{' '}
                    {sujetoDeDeuda.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural'}
                  </span>
                  <button
                    onClick={() => {
                      setSujetoDeDeuda(null);
                      setQDeuda('');
                      setObligacionMarcada(null);
                    }}
                    className="hov-linea"
                    style={{ ...BOTON_DE_TABLA, marginLeft: 'auto' }}
                  >
                    Cambiar contribuyente
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px' }}>
                    <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                    <input
                      value={qDeuda}
                      onChange={(e) => setQDeuda(e.target.value)}
                      aria-label="Buscar el contribuyente del movimiento"
                      placeholder="Nombre, DNI, RUC o código del contribuyente"
                      style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                    />
                  </div>
                  {busquedaDeDeuda.error !== null && (
                    <div style={{ padding: '0 16px 14px' }}>
                      <FalloDeLectura
                        error={busquedaDeDeuda.error}
                        que="el padrón"
                        acceso="consulta_contribuyentes"
                        alReintentar={busquedaDeDeuda.reintentar}
                      />
                    </div>
                  )}
                  {(busquedaDeDeuda.datos?.contenido ?? []).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSujetoDeDeuda(c)}
                      className="hov-acento"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        border: 0,
                        borderTop: '1px solid var(--line)',
                        background: 'transparent',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{c.codigo}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink)' }}>{c.nombreRazonSocial}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                        {c.tipoDocumento} {c.numeroDocumento}
                      </span>
                    </button>
                  ))}
                  {busquedaDeDeuda.datos !== null &&
                    busquedaDeDeuda.error === null &&
                    (busquedaDeDeuda.datos.contenido ?? []).length === 0 && (
                      <p style={{ margin: 0, padding: '0 16px 14px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                        Ningún contribuyente con esos datos.
                      </p>
                    )}
                  <p style={PIE}>
                    Elige a quién se le aplica el movimiento: sin contribuyente no hay obligación que mover, y ni el alta ni la baja se
                    pueden mandar.
                  </p>
                </>
              )}
            </section>

            {hoja === 'baja' && sujetoDeDeuda !== null && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Deuda seleccionable para baja</h2>
                  {/* El corte, ANTES de la tabla y no después: elegirlo cambia
                      lo que cada fila significa, y una casilla marcada sobre la
                      tabla anterior sería un acto sobre otra obligación. Dos
                      pastillas y no un desplegable por lo mismo que arriba: las
                      dos opciones se leen a la vez y se ve cuál está puesta. */}
                  <div style={{ display: 'flex', gap: 6 }} role="group" aria-label="Cómo corta la tabla">
                    {(
                      [
                        [false, 'Por obligación'],
                        [true, 'Por cuota'],
                      ] as [boolean, string][]
                    ).map((c) => (
                      <button
                        key={c[1]}
                        onClick={() => setBajaPorCuota(c[0])}
                        aria-pressed={bajaPorCuota === c[0]}
                        className="hov-linea"
                        style={{ ...pastilla(bajaPorCuota === c[0]), padding: '5px 12px', fontSize: 12 }}
                      >
                        {c[1]}
                      </button>
                    ))}
                  </div>
                  {/* «N de M», no «N»: la lectura pide 50 y no pagina, así que
                      con el corte por cuota —que multiplica las filas por tres o
                      cuatro— una obligación podría quedarse fuera de la página
                      sin que nada lo dijera. La nota de abajo lo dice cuando
                      pasa. */}
                  <span style={META}>
                    {deudaParaLaBaja.datos
                      ? `${obligaciones.length} de ${deudaParaLaBaja.datos.totalElementos} ${bajaPorCuota ? 'cuotas' : 'obligaciones'}`
                      : '—'}
                    {obligacionDeLaBaja !== null ? ' · 1 marcada' : ''}
                  </span>
                </div>
                {fechaDeLaBaja === '' && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    Escribe abajo la fecha de la resolución: la deuda se lee a esa fecha, que es contra la que el servidor comprueba que la
                    baja no exceda lo que se debía.
                  </p>
                )}
                {deudaParaLaBaja.error !== null && (
                  <div style={{ padding: '14px 16px' }}>
                    <FalloDeLectura
                      error={deudaParaLaBaja.error}
                      que="la deuda de este contribuyente"
                      acceso="consulta_deuda"
                      alReintentar={deudaParaLaBaja.reintentar}
                    />
                  </div>
                )}
                {deudaParaLaBaja.cargando && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo su cuenta corriente…</p>
                )}
                {deudaParaLaBaja.error === null && !deudaParaLaBaja.cargando && obligaciones.length === 0 && fechaDeLaBaja !== '' && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                    No tiene ninguna deuda pendiente al {fechaDeLaBaja}: no hay nada que extinguir.
                  </p>
                )}
                {obligaciones.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />
                          {COLS_DE_LA_BAJA.map((c) => (
                            <th key={c[0]} style={c[1] ? THN : TH}>
                              {c[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {obligaciones.map((o, i) => {
                          /* Una fila que agrupa varias cuotas SÍ se puede dar de
                             baja desde #598: el acto va con `repartir: true` y el
                             reparto lo hace el servidor, que es el único que sabe
                             cuánto queda vivo en cada cuota a la fecha valor.
                             Hasta entonces esta casilla venía apagada, porque
                             repartir el desglose del grupo aquí habría sido
                             componer dinero en la pantalla (RNF-083) sobre
                             cifras que esta lectura no publica.

                             Con el corte por cuota `agrupada` es siempre falso:
                             el servidor devuelve `periodoDesde === periodoHasta`
                             en todas. Se deja calculado del dato y no del
                             conmutador para que la fila diga lo que trae y no lo
                             que se pidió — si alguna vez las dos cosas dejaran de
                             coincidir, la que manda es la respuesta. */
                          const agrupada = o.periodoDesde !== o.periodoHasta;
                          /* El 0 no es la cuota cero: es la obligación anual, la
                             que no se divide. Se escribe con su nombre cuando va
                             sola; dentro de un rango se queda en cifra, porque
                             «Anual - 4» no nombra ningún tramo. */
                          const cuota = agrupada ? `${o.periodoDesde} - ${o.periodoHasta}` : o.periodoDesde === 0 ? 'Anual' : String(o.periodoDesde);
                          const queEs = agrupada
                            ? `${o.tributo} ${o.ejercicio}, cuotas ${o.periodoDesde} a ${o.periodoHasta}`
                            : `${o.tributo} ${o.ejercicio}, ${o.periodoDesde === 0 ? 'obligación anual' : `cuota ${o.periodoDesde}`}`;
                          const on = obligacionMarcada === i;
                          return (
                            <tr
                              key={`${o.tributo}|${o.ejercicio}|${o.predioId ?? ''}|${o.vehiculoId ?? ''}|${o.periodoDesde}`}
                              className="hov-elev"
                              style={{
                                borderTop: '1px solid var(--line)',
                                background: on ? 'var(--accent-soft)' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '11px 14px' }}>
                                <input
                                  type="radio"
                                  name="obligacion-de-la-baja"
                                  checked={on}
                                  onChange={() => setObligacionMarcada(i)}
                                  aria-label={`Elegir ${queEs}`}
                                  style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                                />
                              </td>
                              <td style={TD1}>{o.ejercicio}</td>
                              {/* «Unidad»: `ObligacionConDeudaResource` publica el
                                  identificador interno del predio o del vehículo,
                                  no el código predial ni la placa, que es lo que
                                  aquí se leería. */}
                              <td style={TD}>—</td>
                              <td style={TD}>{cuota}</td>
                              <td style={TD}>{o.tributo}</td>
                              <td style={TD}>{o.fase}</td>
                              <td style={TDN}>{o.deuda.insoluto.importe}</td>
                              <td style={TDN}>{o.deuda.reajuste.importe}</td>
                              <td style={TDN}>{o.deuda.interes.importe}</td>
                              <td style={TDN}>{o.deuda.gasto.importe}</td>
                              <td style={TDN}>{o.deuda.total.importe}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* De quién es la unidad de la fila marcada, debajo de la tabla y
                    antes de la franja del importe (#635). Aquí y no en el
                    formulario de sustento por lo mismo que en el alta: la
                    declaración es la respuesta a esta frase, y sin ella no
                    significa nada. */}
                {obligacionDeLaBaja !== null && fechaDeLaBaja !== '' && (
                  <div style={{ padding: '0 16px 14px' }}>
                    <UnidadDeLaBajaCruzada
                      obligacion={obligacionDeLaBaja}
                      cargando={cruceDeLaBaja.cargando}
                      error={cruceDeLaBaja.error}
                      cruce={cruceDeLaBaja.datos}
                      contribuyente={sujetoDeDeuda}
                      declarado={declaraTitularAnteriorEnLaBaja}
                      onDeclarar={setDeclaraTitularAnteriorEnLaBaja}
                    />
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--line)',
                    background: 'var(--bg-elev)',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    Una baja queda en la bitácora de auditoría con quién la hizo, cuándo y con qué resolución. Se extingue{' '}
                    <strong>una fila por acto</strong> —la marcada—: para varias, se repite.
                  </span>
                  {/* Qué abarca el acto, dicho con palabras y no sólo por la
                      pastilla de arriba: es lo último que se lee antes de
                      firmar, y «PREDIAL 2026» entero y «PREDIAL 2026 cuota 3»
                      se parecen demasiado para dejarlo a la memoria. Sale de la
                      fila marcada, así que dice lo que va a viajar. */}
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                    {obligacionDeLaBaja === null
                      ? 'A extinguir'
                      : obligacionDeLaBaja.periodoDesde !== obligacionDeLaBaja.periodoHasta
                        ? `A extinguir · ${obligacionDeLaBaja.tributo} ${obligacionDeLaBaja.ejercicio}, cuotas ${obligacionDeLaBaja.periodoDesde} a ${obligacionDeLaBaja.periodoHasta}`
                        : `A extinguir · ${obligacionDeLaBaja.tributo} ${obligacionDeLaBaja.ejercicio}, ${obligacionDeLaBaja.periodoDesde === 0 ? 'obligación anual' : `cuota ${obligacionDeLaBaja.periodoDesde}`}`}
                  </span>
                  {/* El importe es el que el servidor publicó para esa obligación
                      a esa fecha, no una suma de columnas (RNF-083): es contra
                      esas cuatro cifras contra las que valida la baja. */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--ink)' }}>
                    {obligacionDeLaBaja ? `S/ ${obligacionDeLaBaja.deuda.total.importe}` : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {obligacionDeLaBaja ? `al ${obligacionDeLaBaja.deuda.total.actualizadoA}` : 'sin obligación marcada'}
                  </span>
                </div>
                {/* El pie explica la tabla, así que sin tabla no se dibuja: decir
                    de qué sale el «—» de una columna que no está en pantalla es
                    ruido, no honestidad. */}
                {obligaciones.length > 0 && (
                  <p style={PIE}>
                    {bajaPorCuota ? (
                      <>
                        Cada fila es <strong>una cuota</strong>, con el desglose que el servidor calculó para ella a la fecha de la
                        resolución. La baja va con esa cuota y esos cuatro importes, sin repartir nada: es el corte que hace falta cuando la
                        resolución alcanza a una cuota y no a las otras. La cuota «Anual» es la obligación que no se divide —la tasa de una
                        licencia, la de un anuncio, una costa—, no la cuota cero.{' '}
                      </>
                    ) : (
                      obligaciones.some((o) => o.periodoDesde !== o.periodoHasta) && (
                        <>
                          Una fila con dos periodos —«0 - 9»— agrupa las cuotas de esa obligación y publica un solo desglose para todo el
                          grupo, no el de cada cuota. Se da de baja igual: lo que se declara es el total del acto y el reparto entre las
                          cuotas lo hace el servidor, sin que ninguna reciba más de lo que debe a la fecha de la resolución; las que no deben
                          nada no producen asiento, y el aviso de después dice cuáles se movieron (#598). La «Fase» de una fila agregada es
                          la más avanzada de sus cuotas, así que para extinguir sólo lo que está en una fase concreta hay que verlas por
                          cuota.{' '}
                        </>
                      )
                    )}
                    {deudaParaLaBaja.datos !== null && deudaParaLaBaja.datos.totalElementos > obligaciones.length && (
                      <>
                        Se leen las primeras {obligaciones.length} de {deudaParaLaBaja.datos.totalElementos}: esta lectura no pagina todavía,
                        así que lo que falta no está en pantalla y no se puede marcar.{' '}
                      </>
                    )}
                    La columna «Unidad» sale «—» porque el recurso publica el identificador interno del predio, no su código.
                  </p>
                )}
              </section>
            )}

            <section style={TARJETA}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                  {hoja === 'alta' ? 'Deuda a dar de alta' : 'Sustento de la baja'}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                  {hoja === 'alta'
                    ? 'Incorpora manualmente una obligación cuando no viene de la emisión masiva: determinaciones de fiscalización, multas o deuda migrada.'
                    : 'Extingue deuda por prescripción, resolución que la deja sin efecto, error material o compensación. Exige resolución.'}
                </p>
              </div>
              <div style={REJILLA_DE_CAMPOS}>{(hoja === 'alta' ? CAMPOS_DEL_ALTA : CAMPOS_DE_LA_BAJA).map(campo)}</div>
              {/* Lo que la caja «Unidad» resolvió, debajo de ella y antes de los
                  importes (#554). Sin esto, lo que viaja —un identificador
                  interno que nadie teclea— no se ve por ninguna parte, y la
                  única forma de saber si el alta va sobre el predio que se
                  quería era mirar la cuenta corriente después. */}
              {hoja === 'alta' && sujetoDeDeuda !== null && unidadTecleada !== '' && (
                <div style={{ padding: '0 16px 16px' }}>
                  <UnidadDelAltaResuelta
                    escrito={unidadTecleada}
                    enVuelo={unidadEnVuelo}
                    error={resolucionDeLaUnidad.error}
                    unidad={unidadResuelta}
                    contribuyente={sujetoDeDeuda}
                    declarado={declaraTitularAnteriorEnElAlta}
                    onDeclarar={setDeclaraTitularAnteriorEnElAlta}
                  />
                </div>
              )}
            </section>

            {hoja === 'alta' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
                  gap: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                {/* Un total de nada no es cero: es nada. Sobre el formulario en
                    blanco la franja decía «S/ 0.00» cuatro veces —y debajo,
                    «Elige primero el contribuyente»—, que es una cifra afirmada
                    sobre un acto que ni siquiera tiene sujeto. Sale «—» hasta
                    que haya contribuyente y algo tecleado; y cada casilla dice
                    «—» por su cuenta mientras su campo esté vacío, para que el
                    total no parezca completo con tres partes sin escribir. */}
                {(
                  [
                    ['Insoluto', importeDelAlta('altaInsoluto', altaInsoluto), false],
                    ['Reajuste', importeDelAlta('altaReajuste', altaReajuste), false],
                    ['Interés', importeDelAlta('altaInteres', altaInteres), false],
                    /* El total del ACTO, no el de una cuota: con un rango, el
                       desglose se repite en cada una y son `n` veces esta suma.
                       Ver `PIE_DEL_RANGO`. */
                    ['Total del alta', hayAlgoQueSumarEnElAlta ? soles(altaTotal * cuantasCuotasDelAlta()) : '—', true],
                  ] as [string, string, boolean][]
                ).map((t) => (
                  <div key={t[0]} style={celdaDeTotal(t[2])}>
                    <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Lo que el backend pidio que la pantalla dijera, y no podia decir
                por si sola: con un rango, las cuatro cajas de arriba son **de
                cada cuota**, no del año. Las dos lecturas del formulario del
                manual —«Insoluto (S/)» a secas junto a «Cuota desde» y «Cuota
                hasta»— son plausibles y se diferencian en un factor `n`. */}
            {hoja === 'alta' && hayAlgoQueSumarEnElAlta && cuantasCuotasDelAlta() > 1 && (
              <p
                role="status"
                style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)', background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 6, padding: '9px 12px', textWrap: 'pretty' }}
              >
                {PIE_DEL_RANGO(cuantasCuotasDelAlta(), soles(altaTotal), soles(altaTotal * cuantasCuotasDelAlta()))}
              </p>
            )}

            {/* Cada hoja tiene su propio acto, su propio cuerpo y su propio
                impedimento. Antes las dos llamaban a una sola función que leía
                siempre las claves `alta*`, así que la baja mandaba el tributo, el
                año, la cuota y los importes del ALTA —y su `documentoOrigen`—, y
                nada de lo tecleado en su formulario. */}
            {impedimentoDeLaHoja !== undefined && (
              <p
                role="status"
                style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 6, padding: '9px 12px', textWrap: 'pretty' }}
              >
                {impedimentoDeLaHoja}
              </p>
            )}
            {/* Lo que el servidor contestó al último intento, y se queda (#597).
                Un 422 dice qué cambiar y por qué; en un aviso que se va a los
                3,2 s no se puede releer con el formulario delante. `alert` y no
                `status`: es un acto que no se registró, no una nota al margen. */}
            {rechazoDelActo !== null && (
              <div role="alert">
                {/* El 409 NO es un fallo, y decirlo importa (#588). Desde `V75`
                    hay un índice único que ata el alta a su obligación y a su
                    documento de sustento, así que mandar dos veces lo mismo
                    responde «ya está» — que es exactamente lo que tiene que
                    pasar—. Con el título de un rechazo cualquiera, quien atiende
                    puede leerlo como «no entró» y volver a mandarlo cambiando el
                    documento de origen, que es el duplicado que la guarda existe
                    para impedir: dos cargos de la misma deuda al mismo
                    contribuyente, sin ninguna cifra que parezca mal. */}
                <Aviso
                  tono={rechazoDelActo.codigo === 'CONFLICTO' ? 'warn' : 'bad'}
                  titulo={
                    rechazoDelActo.codigo === 'CONFLICTO'
                      ? hoja === 'alta'
                        ? 'Esta deuda ya estaba dada de alta'
                        : 'Esta baja ya estaba registrada'
                      : `El servidor no registró ${hoja === 'alta' ? 'el alta' : 'la baja'}`
                  }
                >
                  {rechazoDelActo.mensaje}
                  {rechazoDelActo.codigo === 'CONFLICTO' && hoja === 'alta' && (
                    <>
                      {' '}
                      <strong>No se ha cargado dos veces</strong>, y volver a mandarlo con otro documento de origen sí la cargaría:
                      comprueba en la consulta de deuda si el alta que buscabas ya está.
                    </>
                  )}
                  {rechazoDelActo.incidencia !== undefined && (
                    <>
                      {' '}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>Incidencia {rechazoDelActo.incidencia}</span>
                    </>
                  )}
                </Aviso>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {/* La frase de la baja depende del corte, porque lo que hace el
                    servidor con el importe es distinto: por obligación reparte,
                    por cuota no hay nada que repartir. Dejar la de repartir para
                    las dos diría de un acto lo que hace el otro. */}
                {hoja === 'alta'
                  ? 'Un alta manual entra en la cuenta corriente y se cobra como cualquier otra deuda. Queda en la bitácora con tu usuario. Con «Cuota desde» y «Cuota hasta» se registra una obligación por cuota, y el desglose se repite en cada una. Mandar dos veces la misma con el mismo documento de origen no la carga dos veces: el servidor contesta que ya está (#588).'
                  : bajaPorCuota
                    ? 'Elige arriba la cuota que se extingue: una por acto. El importe que se da de baja es el que el servidor publicó para esa cuota a la fecha de la resolución, y viaja tal cual —no se reparte nada—; la causal se antepone a la observación, porque el cuerpo no tiene campo propio para ella.'
                    : 'Elige arriba la obligación que se extingue: una por acto. El importe que se da de baja es el que el servidor publicó para ella a la fecha de la resolución, y si la fila agrupa varias cuotas es él quien lo reparte entre ellas; la causal se antepone a la observación, porque el cuerpo no tiene campo propio para ella.'}
              </p>
              <label style={{ flex: 1, minWidth: 220 }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>
                  Observación · obligatoria
                </span>
                <input
                  value={observacionDelActo}
                  onChange={(e) => setObservacionDelActo(e.target.value)}
                  placeholder={hoja === 'alta' ? 'Por qué se da de alta esta deuda' : 'Por qué se extingue'}
                  style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg-card)', fontSize: 13 }}
                />
              </label>
              <button
                onClick={() => void (hoja === 'alta' ? darDeAltaLaDeuda() : darDeBajaLaDeuda())}
                disabled={registrando || impedimentoDeLaHoja !== undefined}
                title={impedimentoDeLaHoja}
                className="hov-acento-2"
                style={{ ...BOTON_PRIMARIO, opacity: registrando || impedimentoDeLaHoja !== undefined ? 0.55 : 1 }}
              >
                {hoja === 'alta' ? 'Dar de alta' : 'Dar de baja'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ DECLARACIÓN JURADA ══════════ */}
        {dest === 'reporte' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div data-noprint="1" style={{ width: '100%', maxWidth: 820, display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ flex: 1, minWidth: 190 }}>
                <span style={ROTULO_DE_LA_HOJA}>N.º de declaración</span>
                <input
                  value={djNro}
                  onChange={(e) => setDjNro(e.target.value)}
                  placeholder="el número que lleva impreso el cargo"
                  style={{ ...IN, fontFamily: 'var(--font-mono)' }}
                />
              </label>
              <label>
                <span style={ROTULO_DE_LA_HOJA}>Fecha de corte</span>
                <input type="date" value={djFecha} onChange={(e) => setDjFecha(e.target.value)} style={IN} />
              </label>
              {/* El año es el del selector del shell, que es el mismo que la hoja
                  imprime bajo el título: la ruta pide número Y año, y tener aquí
                  un segundo campo de ejercicio dejaría la cabecera diciendo uno
                  y la lectura preguntando por otro. */}
              <label>
                <span style={ROTULO_DE_LA_HOJA}>Ejercicio</span>
                <input value={pref.ejercicio} disabled title="Es el ejercicio de trabajo: se cambia en la cabecera" style={{ ...IN, ...APAGADO, width: 90 }} />
              </label>
              {/* «Imprimir» saca por la impresora LO QUE HAY EN PANTALLA. Sin la
                  guarda, un 404, un 403 o la respuesta que aún no ha llegado
                  sacarían el membrete, el «Declaro bajo juramento» y las dos
                  líneas de firma con las celdas en blanco: un papel oficial en
                  blanco sigue siendo un papel oficial, y éste además afirma algo
                  (#563 AC 4). Es la misma guarda que la constancia de Consultas. */}
              <button
                onClick={() => window.print()}
                disabled={impedimentoDeImprimirLaDj !== undefined}
                title={impedimentoDeImprimirLaDj}
                className={impedimentoDeImprimirLaDj === undefined ? 'hov-acento-2' : undefined}
                style={{ ...BOTON_PRIMARIO, ...(impedimentoDeImprimirLaDj !== undefined ? { opacity: 0.55, cursor: 'not-allowed' } : null) }}
              >
                Imprimir
              </button>
            </div>

            <div data-noprint="1" style={{ width: '100%', maxWidth: 820, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                El manual emite tres formularios con la declaración: hoja resumen (HR), predio urbano (PU) y predio rústico (PR). Aquí se
                emite <strong>la HR</strong>, que es la que resume la declaración y la que se firma.
              </p>
              {/* Los tres eran CONMUTADORES, dos de ellos encendidos, y no
                  cambiaban nada: prometían que al pulsar «Imprimir» saldrían tres
                  hojas. Ahora son tres rótulos de lo que hay, que es lo que de
                  verdad son —sólo la HR tiene de dónde salir; PU y PR llevan la
                  ficha del predio campo a campo y ninguna lectura la publica en
                  esa forma—, y desmarcar la única que se emite tampoco cambiaría
                  lo que sale por la impresora. El motivo de cada una va en su
                  `title` Y en el pie de abajo, porque un `title` solo no lo lee
                  nadie (RNF-082). */}
              {(['HR', 'PU', 'PR'] as const).map((k) => {
                const hay = k === 'HR';
                return (
                  <span
                    key={k}
                    title={hay ? 'Es lo que esta pantalla emite, y lo único que hay' : SIN_FORMULARIO_DE_PREDIO}
                    style={{
                      border: `1px solid ${hay ? 'var(--accent)' : 'var(--line-2)'}`,
                      borderRadius: 6,
                      padding: '8px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      background: hay ? 'var(--accent-soft)' : 'var(--bg-card)',
                      color: hay ? 'var(--accent-ink)' : 'var(--ink-4)',
                      opacity: hay ? 1 : 0.55,
                      textDecoration: hay ? undefined : 'line-through',
                    }}
                  >
                    {k}
                  </span>
                );
              })}
            </div>

            <p data-noprint="1" style={{ margin: 0, width: '100%', maxWidth: 820, fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
              {SIN_FORMULARIO_DE_PREDIO}
            </p>

            {/* Las tres respuestas que NO son una hoja, dichas por separado: no se
                ha preguntado todavía, se está preguntando, y el servidor contestó
                que no. Ninguna de las tres dibuja el papel. */}
            {djBuscada === '' && (
              <div data-noprint="1" style={{ width: '100%', maxWidth: 820 }}>
                <Aviso tono="neutro" titulo="Escribe el número de la declaración">
                  La hoja resumen es la de <strong>una</strong> declaración jurada: sale de{' '}
                  <code>GET /rentas/declaraciones/{'{'}n{'}'}/hoja</code>, que pide el número y el año. Hasta que haya número no hay a quién
                  consultar, y el papel no se dibuja en blanco.
                </Aviso>
              </div>
            )}
            {hojaDj.cargando && (
              <p data-noprint="1" style={{ margin: 0, width: '100%', maxWidth: 820, fontSize: 12.5, color: 'var(--ink-3)' }}>
                Consultando la declaración…
              </p>
            )}
            {hojaDj.error !== null && (
              <div data-noprint="1" style={{ width: '100%', maxWidth: 820 }}>
                <FalloDeLectura
                  error={hojaDj.error}
                  que={`la declaración jurada ${djBuscada} del ${pref.ejercicio}`}
                  acceso="declaracion_jurada"
                  alReintentar={hojaDj.reintentar}
                />
              </div>
            )}

            {hojaDj.datos && (
              <section style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '40px 44px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 12, borderBottom: '2px solid var(--ink)' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>{pref.entidad}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>
                      Gerencia de Administración Tributaria — Unidad de Rentas
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    <p style={{ margin: 0 }}>{hojaDj.datos.declaracion.numero} · HR</p>
                    <p style={{ margin: '3px 0 0' }}>{hojaDj.datos.declaracion.fechaPresentacion}</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>
                    Declaración jurada — hoja resumen
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                    Impuesto predial del ejercicio {hojaDj.datos.declaracion.ejercicio}
                  </p>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(186px,1fr))',
                    gap: '14px 20px',
                    margin: '24px 0',
                    padding: '16px 0',
                    borderTop: '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  {/* El rótulo es «Documento» y no «D.N.I.» como en el manual: el
                      padrón publica el documento con su tipo delante —«DNI 03593174»,
                      «RUC 20100047218»— porque una sucesión indivisa o una empresa
                      no tienen DNI, y escribir «D.N.I.» encima de un RUC es rotular
                      un dato con el nombre de otro. */}
                  {celdasDelDeclarante(hojaDj.datos).map((m) => (
                    <div key={m[0]}>
                      <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{m[0]}</p>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>{m[1]}</p>
                    </div>
                  ))}
                </div>
                {/* Un declarante nulo no es un nombre que falte: es que el código de
                    la DJ ya no está en el padrón. Se dice, porque las cuatro celdas
                    con un guion se leen como «no consta» y no como «esta persona no
                    existe». */}
                {hojaDj.datos.declarante === null && (
                  <p style={{ margin: '-10px 0 20px', fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    El contribuyente de esta declaración ya no está en el padrón, así que la hoja no puede consignar ni su nombre ni su
                    documento ni su domicilio. No se imprime hasta que se aclare de quién es.
                  </p>
                )}
                {/* Son TODOS los predios del contribuyente y no sólo el que la
                    declaración nombra, y así lo compone el servidor: la base del
                    predial es por contribuyente —los tramos progresivos se aplican
                    al conjunto de sus predios— y una hoja con uno solo consignaría
                    una base que no es la que se determina. Con cero filas, el aviso
                    lo dice: una cabecera sola se lee como «no tiene ninguno». */}
                <TablaDeDatos
                  cols={COLS_DE_LA_HOJA}
                  filas={hojaDj.datos.predios.map(filaDeLaHoja)}
                  min="640px"
                  vacia="El contribuyente no tiene ningún predio con titularidad vigente a la fecha de corte, así que no hay ninguno que consignar."
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
                    gap: 14,
                    marginTop: 20,
                    paddingTop: 14,
                    borderTop: '1px solid var(--ink)',
                  }}
                >
                  {/* Los dos primeros salen de la última determinación del ejercicio
                      y son nulos cuando no la hay; los dos últimos NO viajan nunca
                      —el derecho de emisión es `DERECHO_EMISION_PREDIAL` del conjunto
                      sellado, cifra de ordenanza local (D-02b)—, y el total a pagar
                      no se compone aquí sumándole el derecho al insoluto (RNF-083).
                      El porqué de cada guion está abajo, en `faltan`, y sale impreso. */}
                  {totalesDeLaHoja(hojaDj.datos).map((t) => (
                    <div key={t[0]}>
                      <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink)' }}>{t[1]}</p>
                    </div>
                  ))}
                </div>
                {/* Regla 9 sobre el papel y no sólo sobre la pantalla: el domicilio,
                    la titularidad y el % de propiedad son los VIGENTES A ESTA FECHA,
                    y una hoja reimpresa en otro mes sale distinta sin que nada lo
                    diga si no lleva la fecha impresa. Es una sola para toda la hoja,
                    porque el recurso publica una sola. */}
                <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  Valores y titularidad al {hojaDj.datos.aLaFecha}
                </p>
                {/* `faltan` va DENTRO del papel, no en un aviso de pantalla: quien
                    firma es quien tiene que leer por qué hay guiones donde el manual
                    dibuja cifras. El servidor lo publica como lista de motivos y no
                    como un booleano precisamente para esto. */}
                {hojaDj.datos.faltan.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    <p style={{ margin: '0 0 5px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                      Lo que esta hoja no consigna, y por qué
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {hojaDj.datos.faltan.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p style={{ margin: '22px 0 0', fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                  Declaro bajo juramento que los datos consignados son verdaderos y que conozco que la omisión o falsedad genera las sanciones
                  previstas en el Código Tributario.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 56 }}>
                  <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
                    Funcionario receptor
                  </div>
                  <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
                    Contribuyente o representante
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ══════════ LA BARRA DE CAMBIOS SIN GUARDAR ══════════
          En el artboard va fuera de `main`, pegada al fondo. Aquí vive dentro,
          y los márgenes negativos le devuelven el ancho completo que el
          `padding` de `main` le quitaría. */}
      {/* Sale con el borrador del EXPEDIENTE y no con `sucio`. `set()` marca
          `sucio` con cualquier campo del módulo, así que la barra salía también
          sobre el formulario de la transferencia y sobre las dos hojas de deuda
          —donde teclear es redactar el acto, no editar una ficha— diciendo
          «Cambios sin guardar» de algo que este botón no guarda. Y sale también
          con sólo la observación escrita, porque descartarla es descartar algo. */}
      {esExpediente && hayBorradorDelExpediente && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            margin: '18px -20px -96px',
            padding: '12px 20px',
            borderTop: '1px solid var(--line-2)',
            background: 'var(--bg-card)',
            boxShadow: '0 -6px 18px rgba(26,22,18,.06)',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: 'var(--warn-fg)',
              background: 'var(--warn-bg)',
              borderRadius: 999,
              padding: '5px 12px',
              flex: '0 0 auto',
            }}
          >
            <Icono d={ICO.reloj} tam={13} grosor={2} />
            {cambiosDeLaCorreccion.length === 0
              ? 'Sin cambios'
              : `${cambiosDeLaCorreccion.length} ${cambiosDeLaCorreccion.length === 1 ? 'campo' : 'campos'} sin guardar`}
          </span>
          {/* La observación es del acto y es obligatoria (regla 10, RNF-052):
              va aquí, junto al botón que guarda, y no arriba entre los campos
              del contribuyente —donde se leería como un dato suyo, que es lo que
              era el campo «Observación» de la maqueta—. */}
          <label style={{ flex: 1, minWidth: 220 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>
              Observación · obligatoria
            </span>
            <input
              value={observacionDeLaCorreccion}
              onChange={(e) => setObservacionDeLaCorreccion(e.target.value)}
              placeholder="Qué se corrige, y con qué documento"
              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg-card)', fontSize: 13 }}
            />
          </label>
          <button
            onClick={() => {
              soltarElBorradorDelExpediente();
              toast('Cambios descartados.');
            }}
            className="hov-linea"
            style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
          >
            Deshacer
          </button>
          {/* «Guardar cambios» decía «Contribuyente guardado» y no mandaba nada
              (#552). Ahora manda `PUT /rentas/contribuyentes/{id}` con la
              observación y **sólo los campos que esa petición admite**, y sólo
              los que de verdad cambiaron: lo que no viene, no cambia. */}
          <button
            onClick={() => void guardarLaCorreccion()}
            disabled={corrigiendo || impedimentoDeLaCorreccion() !== undefined}
            aria-disabled={corrigiendo || impedimentoDeLaCorreccion() !== undefined}
            aria-describedby="motivo-de-la-correccion"
            title={impedimentoDeLaCorreccion()}
            className="hov-acento-2"
            style={{
              border: 0,
              borderRadius: 6,
              padding: '10px 22px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 500,
              opacity: corrigiendo || impedimentoDeLaCorreccion() !== undefined ? 0.55 : 1,
              cursor: corrigiendo || impedimentoDeLaCorreccion() !== undefined ? 'not-allowed' : 'pointer',
              flex: '0 0 auto',
            }}
          >
            {corrigiendo ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {/* El motivo se LEE, no sólo se pasa por encima con el ratón: un
              `title` en un botón apagado no lo alcanza ni el teclado ni el
              lector de pantalla (RNF-082). */}
          <p
            id="motivo-de-la-correccion"
            role="status"
            style={{ margin: 0, flexBasis: '100%', fontSize: 12, lineHeight: 1.5, color: 'var(--warn-fg)', textWrap: 'pretty' }}
          >
            {impedimentoDeLaCorreccion() ??
              `Se mandarán ${cambiosDeLaCorreccion.map((c) => `«${c[0]}»`).join(', ')} y la observación. Lo demás no viaja.`}
          </p>
        </div>
      )}
    </Shell>
  );
}


/**
 * A que filtros va lo tecleado. Devuelve **una lista**, y por un motivo concreto.
 *
 * El backend acota por cuatro campos distintos y la pantalla tiene uno solo, asi
 * que hay que elegir por la forma: ocho digitos es un DNI y lo que no son solo
 * digitos es un nombre. Pero **once digitos son a la vez un RUC y un codigo del
 * padron** —los 10 603 codigos de Catacaos tienen once posiciones con ceros por
 * delante—, y no hay nada en la cadena que los distinga. Elegir uno dejaba el
 * otro inalcanzable: `codigo=00000000008` devuelve una fila y `rUC=00000000008`
 * ninguna, asi que teclear un codigo del padron acababa en «Ningun contribuyente
 * con esos datos» y con la oferta de crearlo —duplicar en el padron a quien si
 * figura—. Se preguntan los dos y se une lo que vuelva; son dos igualdades
 * exactas sobre columnas indexadas, no dos barridos.
 */
function filtrosDelPadron(criterio: string): {
  codigo?: string;
  nombreRazonSocial?: string;
  dNI?: string;
  rUC?: string;
}[] {
  if (criterio === '') return [{}];
  const soloDigitos = /^[0-9]+$/.test(criterio);
  if (soloDigitos && criterio.length === 8) return [{ dNI: criterio }];
  if (soloDigitos && criterio.length === 11) return [{ rUC: criterio }, { codigo: criterio }];
  if (soloDigitos) return [{ codigo: criterio }];
  return [{ nombreRazonSocial: criterio }];
}

/**
 * El padron acotado por lo tecleado, con las dos lecturas del caso ambiguo ya
 * unidas.
 *
 * La union conserva el sobre paginado de la **primera** consulta que devuelva
 * algo, y suma los totales: no hay forma de paginar de verdad sobre dos
 * consultas, pero el caso que las necesita —once digitos exactos— devuelve una
 * fila o ninguna.
 */
async function padronPorCriterio(
  criterio: string,
  paginacion: { pagina?: number; tamano?: number },
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Contribuyente>> {
  const filtros = filtrosDelPadron(criterio);
  const respuestas = await Promise.all(filtros.map((f) => buscarContribuyentes(f, paginacion, senal)));
  if (respuestas.length === 1) return respuestas[0]!;
  const vistos = new Set<number>();
  const contenido: Contribuyente[] = [];
  for (const r of respuestas)
    for (const c of r.contenido)
      if (!vistos.has(c.id)) {
        vistos.add(c.id);
        contenido.push(c);
      }
  const primera = respuestas[0]!;
  return {
    ...primera,
    contenido,
    totalElementos: contenido.length,
    totalPaginas: contenido.length === 0 ? 0 : 1,
    hayMas: false,
  };
}

/* ══════════ La hoja resumen de la declaración jurada (#563) ══════════ */

/** El rótulo de los tres controles de la hoja. Es el de la constancia de Consultas. */
const ROTULO_DE_LA_HOJA: CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  color: 'var(--ink-3)',
  marginBottom: 5,
};

/**
 * Por qué PU y PR no se emiten, aunque la HR sí.
 *
 * La hoja resumen tiene lectura desde #563; los dos formularios de predio no, y
 * no es la misma hoja filtrada: llevan la ficha del predio campo a campo
 * —construcciones, materiales, estado de conservación, antigüedad—, que es lo
 * que guarda la ficha catastral y lo que ninguna operación del contrato publica
 * en esa forma. Decirlo es la mitad del trabajo: un formulario que no sale y no
 * dice por qué se lee como un formulario que esta declaración no necesita.
 */
const SIN_FORMULARIO_DE_PREDIO =
  'PU y PR no se emiten todavía: no son la hoja resumen filtrada, sino la ficha del predio campo a campo —construcciones, ' +
  'materiales, estado de conservación, antigüedad— y ninguna lectura del contrato la publica en la forma de esos dos formularios. ' +
  'Lo que hay de cada predio se ve en Catastro, en su ficha.';

/**
 * Las columnas de la tabla de predios, cambiadas por las que el recurso publica.
 *
 * El manual dibuja cinco y la tercera dice **«Uso»**: `PredioDeLaHojaResource`
 * publica `tipo`, que es `URBANO` o `RUSTICO`. No es el mismo dato con otro
 * nombre —el uso es el de la ficha catastral, «Casa habitación», «Terreno sin
 * construir»— y ninguna lectura de la hoja lo publica, así que la columna se
 * rotula por lo que lleva dentro (RNF-080, y el precedente de #427: parecerse
 * no es serlo).
 *
 * Y son siete y no cinco porque el recurso publica también el autovalúo y lo
 * exonerado de cada predio: son las dos cifras que explican de dónde sale el
 * valúo afecto, y esconderlas dejaría el papel diciendo un resultado sin su
 * cuenta.
 */
const COLS_DE_LA_HOJA: ColDef[] = [
  ['Código predial', 0],
  ['Ubicación', 0],
  ['Tipo', 0],
  ['% prop.', 1],
  ['Autovalúo S/', 1],
  ['Exonerado S/', 1],
  ['Valuo afecto S/', 1],
];

/**
 * Una fila de la tabla, con lo que el servidor publicó y no más.
 *
 * Las tres cifras son nulas cuando no hay determinación del ejercicio, y ahí va
 * el guion: un cero en «Autovalúo» dice que el predio no vale nada, y lo dice
 * en un papel firmado.
 */
function filaDeLaHoja(p: PredioDeLaHoja): string[] {
  return [
    p.codRefCatastral,
    p.direccion,
    p.tipo,
    p.porcentajePropiedad,
    p.autovaluo ?? SIN_DATO,
    p.valuoExonerado ?? SIN_DATO,
    p.valuoAfecto ?? SIN_DATO,
  ];
}

/**
 * Las celdas de la cabecera del papel.
 *
 * Sin declarante van todas con guion: `declarante` nulo significa que el
 * contribuyente de la DJ ya no está en el padrón, y ahí no hay nombre que
 * poner. Las cuatro de la declaración —tipo, ejercicio, presentación y estado—
 * salen de la propia DJ y siempre están.
 */
function celdasDelDeclarante(h: HojaDeDeclaracion): [string, string][] {
  const quien = h.declarante;
  return [
    ['Contribuyente', quien?.nombre ?? SIN_DATO],
    ['Código', quien?.codigo ?? SIN_DATO],
    ['Documento', quien?.documento ?? SIN_DATO],
    ['Domicilio fiscal', quien?.domicilioFiscal ?? SIN_DATO],
    ['Tipo de declaración', h.declaracion.tipo],
    ['Ejercicio', String(h.declaracion.ejercicio)],
    ['Presentada', h.declaracion.fechaPresentacion + (h.declaracion.fueraDePlazo ? ' · fuera de plazo' : '')],
    ['Estado', h.declaracion.estado],
  ];
}

/**
 * Los cuatro totales del pie, con lo que el servidor publicó y no más.
 *
 * Los dos primeros salen de la última determinación predial del ejercicio y son
 * nulos cuando no la hay. Los dos últimos **no viajan nunca**: el derecho de
 * emisión es `DERECHO_EMISION_PREDIAL` del conjunto sellado —cifra de ordenanza
 * local, D-02b— y sin él no hay total a pagar que escribir; componerlo aquí
 * sumándole un cero al insoluto sería inventar la cifra que se cobra (regla 5,
 * RNF-083). El motivo de cada guion sale impreso debajo, en `faltan`.
 */
function totalesDeLaHoja(h: HojaDeDeclaracion): [string, string][] {
  return [
    ['Valuo afecto', h.valuoAfectoTotal ?? SIN_DATO],
    ['Impuesto insoluto', h.impuestoInsoluto ?? SIN_DATO],
    ['Derecho de emisión', SIN_DATO],
    ['Total a pagar', SIN_DATO],
  ];
}

/**
 * Lo que la franja dice cuando el alta abarca mas de una cuota (#538).
 *
 * **El desglose se repite en cada cuota, no se reparte entre ellas.** Medido
 * contra el backend: `cuotaDesde: 1`, `cuotaHasta: 4` e `insoluto: "100.00"`
 * devuelven **cuatro asientos y `total: 400.00`**, uno de 100,00 por cuota.
 *
 * Decirlo es cosa de la pantalla y el propio backend lo dejo escrito: el rotulo
 * del manual es «Insoluto (S/)» a secas junto a «Cuota desde» y «Cuota
 * hasta», y no dice si esa cifra es la del año o la de cada cuota. Las dos
 * lecturas son plausibles y se diferencian en un factor `n`; quien teclee
 * «cuotas 1 a 4 · S/ 100» puede estar esperando cualquiera de las dos, y el
 * recibo dira una.
 */
const PIE_DEL_RANGO = (cuantas: number, porCuota: string, total: string): string =>
  `Son ${cuantas} obligaciones, una por cuota: el desglose de arriba se repite en cada una y no se reparte entre ellas. ` +
  `${porCuota} × ${cuantas} = ${total}, que es lo que quedará en la cuenta corriente.`;

/**
 * Por qué ninguna de las seis determinaciones puede escribir todavía.
 *
 * La primaria de las seis avisaba «Determinación asentada en la cuenta
 * corriente» y no mandaba nada: un acto que afirma haber escrito deuda sobre un
 * contribuyente y se queda en la pantalla. Las seis se apagan con su motivo, que
 * no es el mismo para todas.
 */
/* ══════════ La determinación, pedida al servidor ══════════
   #540 arregló el borde: lo que falta publicar ya no sale como 500 opaco con un
   UUID de incidencia sino como **422 nombrando la llave**. Eso es lo que hace
   conectable esta pantalla, y de una forma muy concreta: la acción secundaria
   —«Simular»— pide la determinación con `simulacion: true`, y lo que se dibuja
   es o bien las cifras que el servidor calculó, o bien la frase con la que el
   servidor dice qué falta. Ninguna de las dos se escribe aquí.

   Lo que NO cambia: la primaria sigue apagada. Simular no es asentar, y asentar
   necesita la observación (regla 10) y —en el predial— el autovalúo declarado de
   cada predio, que ninguna sección del manual dibuja. */

/**
 * Los motivos por los que hay filtros apagados, agrupados y con sus rótulos.
 *
 * Agrupar no es cosmética: en el predial los tres apagados lo están por lo mismo
 * —acotar por declaración jurada sería otro cálculo, no un filtro, y por eso
 * #576 los retiró del contrato— y en el masivo las dos cajas de cifra lo están
 * por otro —son valores del conjunto sellado—; repetir el párrafo por campo
 * empuja la rejilla y hace que deje de leerse, y decir un solo motivo para
 * todos sería decir el equivocado para alguno.
 */
function motivosDeLosFiltrosApagados(filtros: readonly FiltroDef[]): [motivo: string, cuales: string][] {
  const porMotivo = new Map<string, string[]>();
  for (const f of filtros) {
    if (f.bloqueado === undefined) continue;
    porMotivo.set(f.bloqueado, [...(porMotivo.get(f.bloqueado) ?? []), `«${f.l}»`]);
  }
  return [...porMotivo].map(([motivo, cuales]) => [motivo, cuales.join(', ') + ':']);
}

/** Lo que devolvió la simulación, con la hoja que la pidió. */
type ResultadoDeDeterminacion =
  | { clase: 'predial'; datos: DeterminacionPredial }
  | { clase: 'masivo'; datos: CorridaDePredial }
  | { clase: 'vehicular'; datos: CalculoVehicular };

/** Lo que se dibuja donde el servidor no publicó una cifra. */
const SIN_CIFRA_DEL_SERVIDOR = '—';

/**
 * La memoria del predial, rehecha con lo que contestó el servidor.
 *
 * Los tramos son **uno por renglón y salen de la respuesta**: cuántos son,
 * dónde está el tope de cada uno y qué alícuota lleva son cifras del conjunto
 * sellado del ejercicio (regla 5), así que la escala se dibuja porque el
 * servidor la mandó y no porque esté escrita aquí. Sin determinación pedida, la
 * memoria es la de siempre: los pasos, y ni un número.
 */
function memoriaDelPredial(d: DeterminacionPredial): LineaDeMemoria[] {
  const tramos = d.tramos.map(
    (t): LineaDeMemoria => [
      '×',
      `Tramo ${t.orden} — ${t.limiteSuperior === null ? 'sin tope' : `hasta S/ ${t.limiteSuperior}`} · ${t.alicuota} %`,
      `Porción gravada S/ ${t.porcionGravada}`,
      t.aporte,
    ],
  );
  return [
    ['', 'Valuo total del conjunto', 'La suma de sus predios, cada uno ponderado por su % de propiedad', d.valuoTotal],
    ['−', 'Valuo exonerado', 'Lo que el beneficio deja fuera de la base', d.valuoExonerado],
    ['=', 'Valuo afecto', '', d.valuoAfecto, 'sub'],
    ...tramos,
    ['=', 'Impuesto insoluto anual', `Con la UIT del conjunto sellado: S/ ${d.uit}`, d.impuestoInsoluto, 'total'],
    ['', 'Mínimo imponible', 'Se compara con el insoluto y gana el mayor', d.minimoImponible],
  ];
}

/**
 * La memoria del vehicular, con los dos operandos que el recurso NO publica.
 *
 * `CalculoVehicularResource` da la base imponible ya resuelta —el mayor entre el
 * valor de adquisición y el referencial del MEF—, la alícuota y el mínimo, y no
 * los dos valores que se compararon. Se dice: un «—» con su motivo es lo único
 * honesto donde el artboard dibujaba las dos cifras del ejemplo.
 */
function memoriaDelVehicular(c: CalculoVehicular): LineaDeMemoria[] {
  const unico = c.determinaciones.length === 1 ? c.determinaciones[0] : undefined;
  return [
    ['', 'Valor de adquisición', 'Declarado por el titular. La respuesta del cálculo no lo publica: sólo la base ya resuelta', SIN_CIFRA_DEL_SERVIDOR],
    ['', 'Valor referencial del MEF', 'El de la tabla del año de fabricación. Tampoco viaja por separado', SIN_CIFRA_DEL_SERVIDOR],
    [
      '=',
      'Base imponible — el mayor de los dos',
      unico === undefined ? 'Son varios vehículos: la base de cada uno está en la tabla' : `Vehículo ${unico.placa}`,
      unico?.baseImponible ?? SIN_CIFRA_DEL_SERVIDOR,
      'sub',
    ],
    ['×', 'Alícuota del ejercicio', 'Del conjunto sellado, como todo lo que multiplica un importe', `${c.alicuota} %`, undefined, ''],
    [
      '=',
      'Impuesto anual',
      unico === undefined ? 'Uno por vehículo: sumarlos aquí sería componer dinero en la pantalla (RNF-083)' : '',
      unico?.montoDeterminado ?? SIN_CIFRA_DEL_SERVIDOR,
      'total',
    ],
    ['', 'Mínimo imponible', 'Se compara con el impuesto y gana el mayor', c.minimoImponible],
  ];
}

/** Las líneas que se dibujan: las del servidor si hubo determinación, y si no las del cálculo a secas. */
function lineasDeLaMemoria(
  tipo: ClaveDeDeterminacion,
  base: LineaDeMemoria[],
  resultado: ResultadoDeDeterminacion | null,
): LineaDeMemoria[] {
  if (resultado === null) return base;
  if (tipo === 'predial' && resultado.clase === 'predial') return memoriaDelPredial(resultado.datos);
  if (tipo === 'vehicular' && resultado.clase === 'vehicular') return memoriaDelVehicular(resultado.datos);
  return base;
}

/**
 * Las filas de la tabla de cada hoja, en la forma que su recurso publica.
 *
 * Las tres cuadran columna a columna con su `record`, y la del vehicular sólo
 * porque sus columnas cambiaron: ver `COLS_DE_LA_DETERMINACION_VEHICULAR`.
 */
function filasDeLaDeterminacion(
  tipo: ClaveDeDeterminacion,
  resultado: ResultadoDeDeterminacion | null,
): string[][] {
  if (resultado === null) return [];
  if (tipo === 'predial' && resultado.clase === 'predial') {
    return resultado.datos.predios.map((x) => [
      x.codigoPredial,
      x.ubicacion,
      x.uso ?? SIN_CIFRA_DEL_SERVIDOR,
      x.porcentajePropiedad,
      x.autovaluo,
      x.valuoExonerado,
      x.valuoAfecto,
    ]);
  }
  if (tipo === 'masivo' && resultado.clase === 'masivo') {
    return resultado.datos.etapas.map((e) => [
      e.etapa,
      e.registros.toLocaleString('es-PE'),
      /* Las etapas que no mueven dinero mandan la cadena vacía, no un cero: un
         cero en «Monto S/» se leería como «esta etapa emitió nada». */
      e.monto === '' ? SIN_CIFRA_DEL_SERVIDOR : e.monto,
      e.observados.toLocaleString('es-PE'),
      e.estado,
    ]);
  }
  if (tipo === 'vehicular' && resultado.clase === 'vehicular') {
    const alicuota = resultado.datos.alicuota;
    return resultado.datos.determinaciones.map((d) => [
      d.placa,
      d.ejercicio,
      d.baseImponible,
      `${alicuota} %`,
      d.montoDeterminado,
      d.simulacion ? 'SIMULADA' : 'ASENTADA',
    ]);
  }
  return [];
}

/**
 * Las columnas del vehicular, cambiadas por las que el recurso publica.
 *
 * El artboard dibujaba «Determinación por ejercicio» con los tres años en que el
 * vehículo permanece afecto, y `POST /rentas/vehicular/calculo` determina **un**
 * ejercicio y devuelve **una fila por vehículo**. Con las columnas del artboard,
 * un contribuyente con dos vehículos daría dos filas con el mismo año y dos
 * importes distintos, sin ninguna columna que dijera de cuál es cada uno.
 */
const COLS_DE_LA_DETERMINACION_VEHICULAR: ColDef[] = [
  ['Placa', 0],
  ['Ejercicio', 0],
  ['Base imponible S/', 1],
  ['Alícuota', 0],
  ['Impuesto S/', 1],
  ['Estado', 0],
];

/** Los cuatro totales del pie, con lo que el servidor publicó y no más. */
function totalesDeLaDeterminacion(
  tipo: ClaveDeDeterminacion,
  base: TotalDef[],
  resultado: ResultadoDeDeterminacion | null,
): TotalDef[] {
  if (resultado === null) return base;
  if (tipo === 'predial' && resultado.clase === 'predial') {
    const d = resultado.datos;
    return [
      ['Valuo afecto', d.valuoAfecto, 0],
      ['Impuesto insoluto', d.impuestoInsoluto, 0],
      ['Derecho de emisión', d.derechoDeEmision, 0],
      ['Total a pagar', d.totalAPagar, 1],
    ];
  }
  if (tipo === 'vehicular' && resultado.clase === 'vehicular') {
    /* Dos de los cuatro no se pueden llenar y no es por descuido: el recurso no
       publica cronograma vehicular, y «total tres ejercicios» exigiría sumar
       tres determinaciones que esta operación no hace —determina UNO— (RNF-083). */
    const unico = resultado.datos.determinaciones.length === 1 ? resultado.datos.determinaciones[0] : undefined;
    return [
      ['Base imponible', unico?.baseImponible ?? SIN_CIFRA_DEL_SERVIDOR, 0],
      ['Impuesto anual', unico?.montoDeterminado ?? SIN_CIFRA_DEL_SERVIDOR, 0],
      ['Cuota trimestral', SIN_CIFRA_DEL_SERVIDOR, 0],
      ['Total tres ejercicios', SIN_CIFRA_DEL_SERVIDOR, 1],
    ];
  }
  return base;
}

/**
 * La fecha y el conjunto con que se calculó, que es lo que hace la cifra
 * reproducible.
 *
 * Toda cifra dice a qué fecha está (regla 9, RNF-075), y una determinación dice
 * además con qué conjunto sellado: dos conjuntos del mismo ejercicio dan dos
 * importes distintos y los dos correctos.
 */
function bandaDeLaDeterminacion(resultado: ResultadoDeDeterminacion): { fecha: string; conjunto: string } {
  const conjunto =
    resultado.clase === 'predial'
      ? resultado.datos.conjunto
      : resultado.clase === 'masivo'
        ? resultado.datos.conjunto
        : resultado.datos.conjunto;
  return { fecha: resultado.datos.fechaCalculo, conjunto: conjunto === '' ? SIN_CIFRA_DEL_SERVIDOR : conjunto };
}

/**
 * Qué dice cada tabla de la determinación mientras no tenga filas.
 *
 * Las cinco traían las de la maqueta —dos predios con su valúo, cinco etapas de
 * una corrida de 62 418 cuentas, cuatro servicios de arbitrios con su tasa
 * mensual, tres ejercicios vehiculares al 1.0 %, tres espectáculos con su 10 %—.
 * Una cabecera sola no basta: se lee como «este contribuyente no tiene ninguno».
 */
const VACIA_EN_LA_DETERMINACION: Record<ClaveDeDeterminacion, string> = {
  predial: 'Los predios que integran la base salen del cálculo: pulsa «Simular» y los trae el servidor. Los del contribuyente se ven mientras tanto en Catastro.',
  masivo: 'Las etapas salen de la corrida: pulsa «Simular» y se recorre el padrón sin asentar nada.',
  arbitrios:
    'La determinación por servicio depende de las tasas de la ordenanza local con su ratificación provincial, que todavía no están cargadas (D-02b).',
  vehicular: 'La determinación del ejercicio sale del cálculo: escribe la placa o el contribuyente y pulsa «Simular».',
  espectaculos: 'Ninguna lectura del contrato lista los espectáculos declarados: no hay de dónde traer estas filas.',
  alcabala: 'Sin filas.',
};

const IMPEDIMENTO_DE_LA_DETERMINACION: Record<ClaveDeDeterminacion, string> = {
  predial:
    'Simular sí: la petición sale con la marca que impide asentar, y lo que el servidor conteste se lee aquí —hoy, un 422 que dice que ' +
    'ningún ejercicio tiene conjunto de parámetros sellado (#540)—. Asentar no, y por dos cosas: el cuerpo que escribe exige la ' +
    'observación de quien determina (regla 10, RNF-052) y el autovalúo declarado de CADA predio. Ese autovalúo sólo se puede omitir ' +
    'cuando el ejercicio ya tiene una determinación de la que releerlo, y no la hay: el sistema todavía no sabe valorizar un predio y ' +
    'esta pantalla no dibuja ningún campo para escribirlo.',
  masivo:
    'Simular recorre el padrón y no asienta nada. Ejecutar no: hoy la corrida lee «Padrón leído: 0 registros» —ningún predio tiene ' +
    'autovalúo declarado—, así que ejecutarla dejaría una emisión de ceros como la última del ejercicio, y además exige la observación ' +
    'de quien la lanza. Las dos casillas que el manual dibuja aquí, «Incluye arbitrios» y «Genera cuponera PDF», el backend las ' +
    'rechaza con 422: los arbitrios son otro tributo con su propia determinación y la cuponera es un documento.',
  arbitrios:
    'GET /rentas/arbitrios es una lectura —no hay nada que simular: sus cifras llegarían al abrir— y la acción de esta hoja es emitir ' +
    'la cuponera, que es un documento y esa capa no está. Las cifras de los arbitrios son de ordenanza local con su ratificación ' +
    'provincial (D-02b, #189).',
  vehicular:
    'Simular sí, con la placa o con el contribuyente. Asentar no: exige la observación de quien determina (regla 10). Y «Emitir ' +
    'cuponera» no es un cálculo sino un documento, que es la capa que todavía no está.',
  alcabala:
    'El backend registra el acto y no acepta ninguna marca de «calcula y no asientes nada», así que «Liquidar» no tiene a dónde ir sin ' +
    'escribir. Y le falta el dato con el que se identifica lo que se liquida: `transferenciaId`, un identificador interno que ninguna ' +
    'lectura del contrato publica (#432). El autovalúo ajustado depende además del % de actualización, sin fuente identificada (D-11).',
  espectaculos:
    'El POST registra el acto —no hay marca de simulación— y le falta campo para las entradas vendidas, que es uno de los dos ' +
    'operandos de la base imponible del art. 56; la alícuota se pide además por una llave que no coincide con ninguno de los rótulos ' +
    'del desplegable.',
};

/** El filtro con que se pregunta por un documento: DNI si son ocho, RUC si once. */
function filtroDelDocumento(documento: string): { dNI?: string; rUC?: string } {
  const limpio = documento.replace(/[^0-9]/g, '');
  return limpio.length === 11 ? { rUC: limpio } : { dNI: limpio };
}

/**
 * Las columnas del padron, en la forma que `ContribuyenteResource` publica.
 *
 * El artboard dibuja ademas «Domicilio fiscal», «Unidades» y «Deuda hoy S/», y
 * el recurso no trae ninguna de las tres: el domicilio vive en la ficha, las
 * unidades hay que contarlas en catastro y en el padron vehicular, y la deuda
 * es de cuenta corriente —componerla aqui es lo que RNF-083 prohibe—. En su
 * sitio van «Persona» y «Condicion especial», que si vienen y decidian dos
 * cosas del calculo.
 */
const COLUMNAS_DEL_PADRON: ColDef[] = [
  ['Est.', 0],
  ['Codigo', 0],
  ['Nombre / razon social', 0],
  ['Documento', 0],
  ['Persona', 0],
  ['Condicion especial', 0],
];

/**
 * El codigo de contribuyente de un documento.
 *
 * El formulario del manual pide el documento —«Transferente — documento»— y las
 * peticiones del backend quieren el codigo del padron. Sin esta traduccion, lo
 * tecleado viaja como codigo y produce un 404 sobre una persona que SI esta
 * registrada, que es de los errores mas dificiles de leer en ventanilla.
 */
async function contribuyentePorDocumento(documento: string, senal?: AbortSignal): Promise<Contribuyente | null> {
  const limpio = documento.replace(/[^0-9]/g, '');
  if (limpio === '') return null;
  const r = await buscarContribuyentes(filtroDelDocumento(limpio), { tamano: 2 }, senal);
  return r.contenido.find((c) => c.numeroDocumento === limpio) ?? null;
}
