import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import {
  listarOmisos,
  listarProgramas,
  listarMuestra,
  registrarPrograma,
  sortearMuestra,
  listarActas,
  registrarActaPredial,
  listarResultados,
  listarHistorico,
  liquidarFiscalizacion,
  reliquidarFiscalizacion,
  cambiarEstadoDeLaLiquidacion,
  leerEstadoDeCuenta,
  leerResolucion,
  descargarResolucion,
  type OrdenDeOmisos,
  type OrdenDeActas,
  type ProgramaDeFiscalizacion,
  type FilaDeMuestra,
  type ActaDeFiscalizacion,
  type LiquidacionDeFiscalizacion,
  type CorreccionDeLineaDeLiquidacion,
  type ResolucionDeDeterminacion,
  type ResultadoDelSorteo,
  type VersionDeLiquidacion,
} from '../../api/fiscalizacion';
import { useRecurso, useRebote } from '../../api/useRecurso';
import { FalloDeLectura } from '../../api/Fallo';
import { Descargas } from '../../api/descarga';
import { ErrorDeApi, type RespuestaPaginada } from '../../api/cliente';
import { ICO } from '../../ds/iconos';
import { Aviso, Insignia, Paginador, PasoAtras, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { usarPreferencias } from '../../shell/preferencias';
import {
  DEFECTOS,
  DET_PREDIAL,
  DET_VEHICULAR,
  DIFF,
  ESTADOS_DE_LIQUIDACION_DEL_BACKEND,
  HALLAZGOS_DEL_MANUAL_QUE_NO_EXISTEN,
  OPCIONES,
  TIPOS_DE_FISCALIZACION,
  PASOS_ACTA,
  REP_COLS,
  REP_COLS_AREA,
  type CampoDeActa,
  type ColDef,
} from '../../datos/fiscalizacion';

/* ══════════ Los estilos de tabla del artboard ══════════ */
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
  padding: '13px 16px',
  borderBottom: '1px solid var(--line)',
};
const H2: CSSProperties = { margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 };
const META: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' };
const PIE: CSSProperties = {
  margin: 0,
  padding: '11px 16px',
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
const FLECHA: CSSProperties = { color: 'var(--ink-4)', flex: '0 0 auto' };

const estiloDeCelda = (j: number, cols: ColDef[]): CSSProperties =>
  j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD;

/**
 * Una cabecera de tabla: su rotulo, si es numerica y —si lo es— por que campo
 * ordena.
 *
 * `C` es el conjunto de ordenes que ESA consulta admite, y lo trae quien la
 * llama: la deteccion lo instancia con `OrdenDeOmisos`, medido contra el
 * backend. Por eso una columna no puede ofrecer un orden que no exista —`orden:
 * 'titular'` no compila— y las tablas que no admiten ninguno se declaran con
 * `sinOrden(...)`, que fija `C` en `never`: ahi la propiedad no se puede ni
 * escribir.
 *
 * El campo se declara EN la columna y no en una lista aparte, para que sea
 * imposible que la cabecera que se pulsa y el orden que viaja se separen.
 */
type ColumnaDeTabla<C extends string> = { rotulo: string; numerica: 0 | 1; orden?: C };

/** Por que campo ordena la tabla ahora mismo, y como se le pide otro. */
type OrdenDeTabla<C extends string> = {
  /**
   * Campo y sentido van JUNTOS o no va ninguno: `null` es «nadie ha pedido
   * ningun orden», y en ese estado no hay ningun sentido que ensenar. Dos
   * campos sueltos obligarian a inventarle una direccion por omision al estado
   * en que no la hay, que es justo la flecha que no se debe pintar.
   */
  activo: { campo: C; sentido: 'ASCENDENTE' | 'DESCENDENTE' } | null;
  alternar: (campo: C) => void;
};

/**
 * Declara las columnas de una tabla comprobando que **ofrecen todos** los
 * ordenes que su consulta admite.
 *
 * Esto existe por como nacio este issue. La deteccion se dejaba ordenar por
 * tres campos desde que el backend los admitio, y la pantalla seguia ofreciendo
 * **uno**: las dos listas eran dos, vivian en dos sitios y se separaron sin que
 * nada lo dijera —no hay sintoma, la tabla ordena, solo que por menos cosas de
 * las que se puede—. Con esto, ampliar `OrdenDeOmisos` sin darle su cabecera a
 * la columna que lo ensena **no compila**: el arreglo del backend no se puede
 * quedar a medio camino en la interfaz.
 *
 * Lo que NO comprueba, y por eso la columna se elige a mano: que el orden este
 * en la cabecera de la columna que ensena ese dato. Poner `orden: 'sector'` en
 * «Condición» compila igual de bien, y seria una cabecera que mueve las filas
 * por algo que no esta en pantalla. Contra eso solo hay leerlo.
 */
function columnasQueOfrecenTodo<C extends string>() {
  /* La comprobacion va en el tipo de RETORNO y no en el del argumento, y no es
     un detalle: puesta en el argumento, el molde de la rama del fallo se traga
     el error de la lista blanca —una columna con `orden: 'titular'` dejaba de
     decir «no es asignable a OrdenDeOmisos» y pasaba a quejarse de la
     cobertura, que es otra cosa—. Asi cada defecto se queja de lo suyo: el
     orden inexistente contra la restriccion de `T`, y el orden sin cabecera
     contra el tipo con el que se anota `COLUMNAS_DE_OMISOS`, que lo NOMBRA. */
  return <const T extends readonly ColumnaDeTabla<C>[]>(
    cols: T,
  ): [C] extends [Extract<T[number], { orden: string }>['orden']]
    ? readonly ColumnaDeTabla<C>[]
    : { 'orden admitido al que ninguna columna le da cabecera': Exclude<C, Extract<T[number], { orden: string }>['orden']> } =>
    cols as never;
}

/**
 * Las columnas de una tabla que no ofrece ningun orden.
 *
 * Convierte los `ColDef` del prototipo —pares `[rotulo, numerica]`— en columnas
 * sin `orden`. Existe para que «esta tabla no se ordena» sea algo que se
 * escribe una vez y se ve en el sitio de la llamada, en vez de deducirse de que
 * a `Cabeceras` no se le paso `orden`.
 */
function sinOrden(cols: ColDef[]): ColumnaDeTabla<never>[] {
  return cols.map((c) => ({ rotulo: c[0], numerica: c[1] }));
}

/**
 * Las cabeceras, y las que traigan `orden` se pueden pulsar.
 *
 * <h2>Por invitacion y una a una, no por omision</h2>
 *
 * Cinco tablas de este modulo usan este componente y solo la deteccion admite
 * ordenar; de sus ocho columnas, **tres** (#608). Una cabecera que se pulsa y
 * contesta «orden no admitido» es peor que una que no se pulsa: el 422 llega
 * como un fallo de lectura, la tabla desaparece y quien la pulso no tiene como
 * saber que lo que fallo fue el orden. Asi que la que no esta invitada se
 * dibuja como siempre —sin boton, sin flecha y **sin `aria-sort`**—, que es lo
 * que le dice a un lector de pantalla que esa columna no ordena.
 *
 * <h2>Y una cabecera no ordena por lo que no ensena</h2>
 *
 * El backend admite ordenar por `sector`, asi que la tabla dibuja la columna
 * «Sector». Ofrecer el orden sin la columna deja a quien lo pulsa viendo las
 * filas moverse sin poder ver segun que, que es un orden que no se puede
 * comprobar.
 */
function Cabeceras<C extends string>({ cols, orden }: { cols: readonly ColumnaDeTabla<C>[]; orden?: OrdenDeTabla<C> }) {
  return (
    <>
      {cols.map((c) => {
        const campo = c.orden;
        if (orden === undefined || campo === undefined) {
          return (
            <th key={c.rotulo} style={c.numerica ? THN : TH}>
              {c.rotulo}
            </th>
          );
        }
        /* Activa es la que ordena AHORA, y solo puede haber una: `aria-sort`
           no admite dos columnas ordenadas a la vez, y de hecho el backend
           tampoco —`ordenarPor` es un solo campo—. Las otras dos siguen
           pulsables y dicen «none», que no es «no ordena» sino «no ahora». */
        const sentido = orden.activo !== null && orden.activo.campo === campo ? orden.activo.sentido : null;
        const activa = sentido !== null;
        const flecha = sentido === null ? '↕' : sentido === 'ASCENDENTE' ? '↑' : '↓';
        return (
          <th
            key={c.rotulo}
            style={c.numerica ? THN : TH}
            aria-sort={sentido === null ? 'none' : sentido === 'ASCENDENTE' ? 'ascending' : 'descending'}
          >
            <button
              type="button"
              onClick={() => orden.alternar(campo)}
              title={
                sentido === null
                  ? 'Ordenar por esta columna, de menor a mayor.'
                  : sentido === 'ASCENDENTE'
                    ? 'Ordenado de menor a mayor. Pulsa para invertirlo.'
                    : 'Ordenado de mayor a menor. Pulsa para invertirlo.'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                border: 0,
                padding: 0,
                background: 'none',
                font: 'inherit',
                letterSpacing: 'inherit',
                textTransform: 'inherit',
                /* El sentido no se dice solo con la flecha: la activa ademas
                   cambia de color y de peso, porque una flecha de 11 px es lo
                   primero que se pierde en una tabla de ocho columnas. */
                color: activa ? 'var(--accent-ink)' : 'inherit',
                fontWeight: activa ? 600 : 'inherit',
                cursor: 'pointer',
              }}
            >
              {c.rotulo}
              <span aria-hidden="true" style={{ fontSize: 11, opacity: activa ? 1 : 0.55 }}>
                {flecha}
              </span>
            </button>
          </th>
        );
      })}
    </>
  );
}

/**
 * La celda «Titular»: el NOMBRE, y debajo el código con el que se entra a su ficha.
 *
 * <h2>Por que el codigo se dibuja y no se esconde (#545)</h2>
 *
 * Hasta #545 esta columna enseñaba `C-000001`, que es lo que el recurso traia
 * en `titular`. Ahora `titular` trae el NOMBRE y el codigo viaja aparte, en
 * `codigoDelTitular`. Se dibujan **los dos**: el nombre es lo que se lee, y el
 * codigo es lo unico con lo que se vuelve a encontrar a esa persona —Rentas ·
 * Contribuyentes busca por `codigo`—. Quitarlo dejaria una grilla en la que se
 * ve a quien fiscalizar y no hay forma de abrir su expediente.
 *
 * <h2>Los dos casos en que no hay UN codigo, dichos por separado</h2>
 *
 * `codigoDelTitular` llega `null` en dos situaciones distintas, y la celda no
 * las mezcla porque no significan lo mismo:
 *
 * <ul>
 *   <li><b>Sin titular vigente</b> (`titulares` vacia). No es un borde raro:
 *       medido, **1 480 de 3 000 filas de Catacaos**. Es el predio que nadie
 *       reclama —el primero que hay que fiscalizar— y sale en la lista a
 *       proposito, asi que la celda lo dice en vez de quedarse en blanco: un
 *       blanco se lee como «no tiene» y aqui significa «no lo tiene NADIE».
 *   <li><b>Varios titulares.</b> Los nombres llegan unidos y se dibujan asi, y
 *       no hay codigo porque no hay UNO: el backend lo deja nulo a proposito, y
 *       elegir el de uno de los dos seria decir que el predio es suyo. Medido en
 *       la muni 1: 3 de 23 filas.
 * </ul>
 *
 * Un titular con `codigo` y `nombre` nulos tambien existe —significa que ya no
 * esta en el padron— y el backend solo une los nombres que si resolvio, asi que
 * el recuento y la cadena pueden no cuadrar: por eso el pie de la copropiedad
 * cuenta **titulares**, que es lo que se sabe, y no nombres.
 */
function CeldaDelTitular({ titular, codigo, cuantos }: { titular: string | null; codigo: string | null; cuantos: number }) {
  if (titular === null) {
    return (
      <>
        <span style={{ display: 'block', color: 'var(--ink-3)' }}>{SIN_DATO} sin titular vigente</span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)' }}>El predio está inscrito y nadie lo reclama a la fecha de corte.</span>
      </>
    );
  }
  return (
    <>
      <span style={{ display: 'block' }}>{titular}</span>
      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)' }}>
        {codigo ?? `${cuantos} titulares — sin un código único`}
      </span>
    </>
  );
}

/**
 * La celda «Condición»: el hallazgo del cruce y, aparte, si declaró fuera de plazo.
 *
 * <h2>Son dos hechos y no uno, y confundirlos cuesta caro (#570, AC 3 de #49)</h2>
 *
 * Presentar la declaracion vencido el plazo **no convierte a nadie en omiso**:
 * quien declaro tarde es un declarante —CONFORME si lo declarado coincide,
 * SUBVALUADOR si no— y lo que le toca es la multa del art. 176, no la
 * determinacion de oficio. Por eso `declaroFueraDePlazo` viaja aparte de
 * `condicion` en `OmisoResource`, que lo dice con esas palabras en su javadoc.
 *
 * Se dibuja como una **segunda insignia** y no como un tono de la primera:
 * teñir la condicion seria exactamente la mezcla que el AC 3 existe para
 * impedir, y una determinacion de oficio sobre quien SI presento su declaracion
 * se anula en reclamacion. Y se ve **sin pasar el raton**: lo que vive en un
 * `title` no lo lee nadie (RNF-082, precedente de #385).
 *
 * <h2>Hoy no se ve nunca, y eso tambien esta medido</h2>
 *
 * Llega `false` en las 23 filas de la muni 1 y en las 10 000 recorridas de
 * Catacaos, y **no puede ser otra cosa todavia**: la subconsulta rotula OMISO
 * cuando `dj.id IS NULL`, asi que una fila con `declaroFueraDePlazo: true`
 * tiene declaracion y sale CONFORME o SUBVALUADOR — y no hay ninguna
 * declaracion jurada sembrada en ninguna de las dos municipalidades (#546). Se
 * dibuja igualmente porque **la ausencia era el defecto**: el dia que exista la
 * primera declaracion tardia, la grilla la distingue en vez de callarla.
 *
 * **No hay filtro por plazo**, y no es un olvido: el contrato no declara ningun
 * parametro para el, y un filtro que se teclea y no acota es peor que no
 * tenerlo (#322, #398, #431 parte B).
 */
function CeldaDeLaCondicion({ condicion, fueraDePlazo }: { condicion: string; fueraDePlazo: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Insignia tono={tonoDeCondicion(condicion)}>{etiquetaDeCondicion(condicion)}</Insignia>
      {fueraDePlazo && <Insignia tono="warn">Declaró fuera de plazo</Insignia>}
    </span>
  );
}

/**
 * Las celdas de una fila.
 *
 * Toma `ReactNode` y no `string` porque dos de las de la deteccion son mas de un
 * dato: el titular lleva su nombre y debajo el codigo con el que se entra a su
 * ficha (#545), y la condicion lleva la insignia del hallazgo y —si lo hay— la
 * de «declaro fuera de plazo», que es otro hecho (#570). Componerlas aqui
 * obligaria a esta funcion a saber de omisos; las compone quien tiene los datos
 * y aqui solo se colocan.
 *
 * `envuelve` levanta el `white-space: nowrap` de la celda: sin el, las dos
 * lineas del titular se dibujan seguidas en la misma linea.
 */
function Celdas({ fila, cols, envuelve }: { fila: ReactNode[]; cols: ColDef[]; envuelve?: number[] }) {
  return (
    <>
      {fila.map((c, j) => (
        <td key={j} style={envuelve !== undefined && envuelve.includes(j) ? { ...estiloDeCelda(j, cols), whiteSpace: 'normal' } : estiloDeCelda(j, cols)}>
          {c}
        </td>
      ))}
    </>
  );
}

/**
 * Lo que se dibuja cuando la muestra de un programa no se pudo leer.
 *
 * <h2>Un programa que no esta no es una lectura que falla (#546)</h2>
 *
 * Desde #546 `GET /fiscalizacion/programas/{id}/muestra` contesta **404** al
 * programa inexistente en vez de 200 con la lista vacia. Eso separa dos cosas
 * que la pantalla trataba igual y que no se parecen en nada:
 *
 * <ul>
 *   <li>200 con cero filas: el programa existe y todavia no ha sorteado su
 *       muestra. Se dice con su aviso, y ahora se puede AFIRMAR.
 *   <li>404: ese programa ya no esta. La lista de la que salio es de hace un
 *       momento, asi que lo que hay que hacer es volver a pedirla, no insistir
 *       en el mismo id ni entender que el programa esta vacio.
 * </ul>
 *
 * Y por eso no vale con dejar pasar el 404 al aviso generico: `FalloDeLectura`
 * lo rotularia «No se encontró la muestra del programa», que se lee como que la
 * muestra es lo que falta —que es justamente el otro caso—.
 */
function FalloDeLaMuestra({
  error,
  reintentarMuestra,
  recargarProgramas,
}: {
  error: ErrorDeApi;
  reintentarMuestra: () => void;
  recargarProgramas: () => void;
}) {
  if (error.codigo === 'NO_ENCONTRADO') {
    return (
      /* Ni «Reintentar» ni tono de fallo: pedir dos veces el mismo id que no
         existe da dos veces 404. Lo que hay que volver a pedir es la LISTA. */
      <Aviso tono="warn" titulo="Ese programa ya no está">
        {error.mensaje} La lista de programas es de hace un momento y ese ya no figura: vuelve a pedirla y elige otro. No es que no haya
        sorteado su muestra — eso se contesta con una lista vacía, no con un 404.{' '}
        <button
          type="button"
          onClick={recargarProgramas}
          style={{ border: 0, padding: 0, background: 'none', font: 'inherit', color: 'var(--accent-ink)', textDecoration: 'underline', cursor: 'pointer' }}
        >
          Volver a pedir la lista de programas
        </button>
        .
      </Aviso>
    );
  }
  return <FalloDeLectura error={error} que="la muestra del programa" acceso="fisc_programa" alReintentar={reintentarMuestra} />;
}

/**
 * Cuantos caracteres exige el servidor en una observacion, medido.
 *
 * No es «que no este vacia»: el backend contesta «La observacion debe explicar
 * el cambio: al menos 5 caracteres, y no espacios en blanco (ADR-0008)», asi
 * que una primaria encendida con «ok» tecleado dentro manda una peticion que ya
 * se sabe rechazada. Se comprueba aqui con la misma regla —recortada y por
 * longitud— para que el 422 no sea la forma de enterarse.
 */
const OBSERVACION_MINIMA = 5;

/** Un control del alta de programa: todos miden y se ven igual. */
const CAMPO: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 10px',
  background: 'var(--bg-elev)',
  fontSize: 13.5,
};

/**
 * Los dos parrafos a los que apuntan las primarias apagadas de este modulo.
 *
 * El motivo de un acto que no se puede hacer se DIBUJA, y el boton lo señala
 * con `aria-describedby` en vez de repetirlo en un `title`: un boton apagado no
 * recibe el foco, asi que su `title` no lo lee un lector de pantalla ni lo
 * descubre quien no pasa el raton (RNF-082). Con el identificador aqui, el
 * parrafo y el boton no pueden dejar de apuntarse.
 */
const MOTIVO_DEL_ALTA = 'fisc-motivo-del-alta';
const MOTIVO_DEL_SORTEO = 'fisc-motivo-del-sorteo';
const MOTIVO_DEL_ACTA = 'fisc-motivo-del-acta';
const MOTIVO_DE_LA_LIQUIDACION = 'fisc-motivo-de-la-liquidacion';
const MOTIVO_DE_LA_RELIQUIDACION = 'fisc-motivo-de-la-reliquidacion';
const MOTIVO_DEL_ESTADO = 'fisc-motivo-del-estado';

/** El rotulo de un control del alta. */
const ROTULO: CSSProperties = { fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' };

/** Si la observacion tecleada cumple lo que el servidor va a exigir. */
function observacionBastante(texto: string): boolean {
  return texto.trim().length >= OBSERVACION_MINIMA;
}

/**
 * La nota que dice si un control del acta llega al servidor.
 *
 * Va **junto al control** y no en un pie de tabla: quien levanta un acta rellena
 * campo a campo, de pie y con una tablet, y una advertencia a seis controles de
 * distancia no la lee nadie. Es la misma decision que RNF-082 obliga a tomar con
 * el motivo de un boton apagado.
 */
const NO_VIAJA: CSSProperties = {
  display: 'block',
  marginTop: 5,
  fontSize: 11,
  lineHeight: 1.4,
  color: 'var(--ink-4)',
  textWrap: 'pretty',
};

/** Lo que se dibuja en un boton apagado: se ve, no se pulsa, y dice por que. */
const BOTON_APAGADO: CSSProperties = {
  borderRadius: 6,
  opacity: 0.5,
  cursor: 'not-allowed',
};

/**
 * Lo que la tabla de deteccion dice de si misma: cuantas filas hay y de cuantas.
 *
 * <h2>El total vuelve a contar coincidencias, asi que aqui no hay salvedad (#545)</h2>
 *
 * `DeteccionDeOmisos` aplicaba `condicion` **despues de paginar**, asi que el
 * total del sobre era el del padron y no el de las filas que sobrevivian al
 * filtro: con la condicion puesta no se podia escribir «0 de 25» porque 25 no
 * era «de», y esta franja tenia que decir cuantas traia ESTA pagina y avisar de
 * que una pagina vacia no significaba nada. El filtro se movio al `WHERE` de la
 * subconsulta y el recuento lo acompaña.
 *
 * Medido contra el backend con el arreglo dentro, muni 1:
 * `?condicion=SUBVALUADOR` → `contenido: []` con **`totalElementos: 0`**
 * —antes, `[]` con `totalElementos: 25`—; `?condicion=OMISO` → 23 de 23;
 * `?sector=01` → 11 de 11. El aviso sobra y el recuento vuelve a ser el normal.
 */
function EstadoDeLaDeteccion({
  cargando,
  filas,
  pagina,
}: {
  cargando: boolean;
  filas: number;
  pagina: RespuestaPaginada<unknown> | null;
}) {
  if (cargando) {
    return <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando el padrón…</p>;
  }
  if (pagina === null) return null;

  const total = pagina.totalElementos;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
        {filas} de {total} {total === 1 ? 'predio' : 'predios'}
      </span>
      {filas === 0 && (
        <Aviso tono="neutro" titulo="Sin resultados">
          {total === 0
            ? 'Ningún predio del padrón entró en la detección con estos filtros.'
            : 'Esta página no trae ninguno; el filtro sí encontró predios en otras.'}
        </Aviso>
      )}
    </div>
  );
}


/* ══════════ Las tres piezas que comparten los actos de la liquidacion ══════════
 *
 * Existen porque los tres actos de la liquidacion —emitirla, reliquidarla y
 * moverla de estado— dibujan lo mismo: lo que falta, la observacion de la regla
 * 10 y una primaria que se señala con su motivo. Escrito tres veces son unas
 * doscientas lineas repetidas, y **lo peligroso no es el tamaño**: es que la
 * proxima vez que alguien arregle uno de los tres —el `aria-describedby` que
 * falta, el `title` que sobra— lo arregle en una copia y deje las otras dos.
 * Es el mismo motivo por el que `@sgtm/lectura` existia en la interfaz anterior.
 */

/**
 * Lo que le falta a un acto para poder mandarse, **dibujado**.
 *
 * No vive en el `title` de un boton apagado: un boton deshabilitado no recibe
 * el foco, asi que su `title` no lo lee un lector de pantalla ni lo descubre
 * quien no pasa el raton por encima (RNF-082).
 */
function QueFalta({ titulo, filas }: { titulo: string; filas: { que: string; ok: boolean }[] }) {
  return (
    <>
      <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
        <p style={{ ...H2, margin: 0, fontSize: 14 }}>{titulo}</p>
        <span style={META}>{filas.every((f) => f.ok) ? 'listo' : filas.filter((f) => !f.ok).length + ' sin llenar'}</span>
      </div>
      {filas.map((r) => (
        <div key={r.que} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 20,
              height: 20,
              borderRadius: '50%',
              flex: '0 0 auto',
              background: r.ok ? 'var(--ok-bg)' : 'var(--warn-bg)',
              color: r.ok ? 'var(--ok-fg)' : 'var(--warn-fg)',
            }}
          >
            <Icono d={r.ok ? ['M5 12.5l4.5 4.5L19 7'] : ['M12 7.5V13M12 16.5h.02']} tam={12} grosor={2.4} />
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{r.que}</span>
        </div>
      ))}
    </>
  );
}

/** La observacion de la regla 10, con la nota que dice lo que el servidor exige. */
function CampoDeObservacion({
  valor,
  onCambio,
  placeholder,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', ...ROTULO, marginBottom: 5 }}>Observación · obligatoria</span>
        <textarea
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          rows={2}
          placeholder={placeholder}
          style={{ ...CAMPO, background: 'var(--bg-card)', resize: 'vertical' }}
        />
      </label>
      <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
        Queda en la bitácora junto a quién lo hizo y cuándo. Sin ella no se guarda, y el servidor pide al menos cinco caracteres que no
        sean espacios (regla 10, RNF-052).
      </p>
    </div>
  );
}

/**
 * La barra de un acto: el motivo escrito y la primaria que lo señala.
 *
 * `motivo` es `null` cuando el acto se puede hacer, y entonces el parrafo dice
 * lo que va a pasar —que en los tres es irreversible—. Cuando no, el parrafo ES
 * el motivo y el boton lo apunta con `aria-describedby`, de modo que el parrafo
 * y el boton no pueden dejar de apuntarse.
 */
function BarraDelActo({
  id,
  motivo,
  cuandoSePuede,
  etiqueta,
  etiquetaOcupado,
  ocupado,
  onClick,
}: {
  id: string;
  motivo: string | null;
  cuandoSePuede: string;
  etiqueta: string;
  etiquetaOcupado: string;
  ocupado: boolean;
  onClick: () => void;
}) {
  const sePuede = motivo === null && !ocupado;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px 14px', borderTop: '1px solid var(--line)' }}>
      <p
        id={id}
        style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, lineHeight: 1.5, color: motivo === null ? 'var(--ink-3)' : 'var(--warn-fg)', textWrap: 'pretty' }}
      >
        {motivo ?? cuandoSePuede}
      </p>
      <button
        onClick={onClick}
        disabled={!sePuede}
        aria-describedby={id}
        style={
          sePuede
            ? { border: 0, borderRadius: 7, background: 'var(--accent)', color: '#fff', padding: '11px 22px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }
            : { ...BOTON_APAGADO, border: 0, background: 'var(--accent)', color: '#fff', padding: '11px 22px', fontSize: 13.5, fontWeight: 500 }
        }
      >
        {ocupado ? etiquetaOcupado : etiqueta}
      </button>
    </div>
  );
}

/** Lo que el servidor contesto y no se pudo hacer, en la franja roja de siempre. */
function FalloDelActo({ que, fallo }: { que: string; fallo: string | null }) {
  if (fallo === null) return null;
  return (
    <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bad-bg)', color: 'var(--bad-fg)', fontSize: 12.5, lineHeight: 1.5, textWrap: 'pretty' }}>
      {que}: {fallo}
    </p>
  );
}

/* ══════════ Un campo del acta ══════════ */
function CampoDelActa({
  f,
  valor,
  grande,
  onCambio,
}: {
  f: CampoDeActa;
  valor: string | boolean;
  grande: boolean;
  onCambio: (v: string | boolean) => void;
}) {
  const base: CSSProperties = grande
    ? { width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 8, padding: '13px 12px', background: 'var(--bg-elev)', fontSize: 15, minHeight: 48 }
    : { width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 };
  const areaStyle: CSSProperties = { ...base, fontFamily: 'var(--font-sans)', resize: 'vertical' };
  const chkStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: grande ? '14px 12px' : '9px 10px',
    border: '1px solid var(--line-2)',
    borderRadius: grande ? 8 : 6,
    background: 'var(--bg-elev)',
    minHeight: grande ? 48 : 'auto',
  };
  const texto = typeof valor === 'string' ? valor : '';

  return (
    <label data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
        <span>{f.l}</span>
      </span>
      {(f.t === undefined || f.t === 'text') && (
        <input value={texto} onChange={(e) => onCambio(e.target.value)} placeholder={f.ph} maxLength={f.max} style={base} />
      )}
      {f.t === 'date' && <input type="date" value={texto} onChange={(e) => onCambio(e.target.value)} style={base} />}
      {f.t === 'sel' && (
        <select value={texto} onChange={(e) => onCambio(e.target.value)} style={base}>
          {/* La opcion vacia va primera y no es adorno: sin ella el desplegable
              abre en «PROPIETARIO», «INSPECCION REALIZADA» o «AMPLIACION NO
              DECLARADA» y eso se lee como una eleccion del fiscalizador. Es el
              defecto que #331 midio en el concepto del alta de deuda. */}
          <option value="">— sin elegir —</option>
          {(f.o ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {f.t === 'area' && (
        <textarea value={texto} onChange={(e) => onCambio(e.target.value)} rows={3} placeholder={f.ph} maxLength={f.max} style={areaStyle} />
      )}
      {f.t === 'chk' && (
        <span style={chkStyle}>
          <input
            type="checkbox"
            checked={valor === true}
            onChange={(e) => onCambio(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 18, height: 18, flex: '0 0 auto' }}
          />
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{f.ph}</span>
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
            color: texto === '' ? 'var(--ink-4)' : 'var(--ink-2)',
          }}
        >
          {/* Vacio significa que no se ha podido leer de la fila de la muestra
              —porque no hay ninguna elegida, o porque la lectura fallo—, y eso
              se dice con el guion largo. Una caja de solo lectura EN BLANCO se
              lee como un dato que todavia no se ha cargado; el guion dice que
              no lo hay (#702). El motivo entero esta en la barra del paso 4. */}
          {texto === '' ? SIN_DATO : texto}
        </span>
      )}
      {f.ayuda && <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>}
      {/* Cual de los veintitres controles llega al servidor, dicho donde se
          teclea. Hasta #431 daba igual —no viajaba ninguno, y el formulario
          entero lo decia (#702)—; desde que el acta se manda, un control mudo
          es perdida silenciosa de lo que alguien anoto en campo. */}
      {f.noViaja !== undefined && <span style={NO_VIAJA}>No viaja al acta. {f.noViaja}</span>}
    </label>
  );
}

/* ══════════ El módulo ══════════ */
/**
 * <h2>El sujeto se LEE de `PantallaProps` y se ESCRIBE con `ir` (#431)</h2>
 *
 * `sujeto` es el mecanismo de #685 y es el que se usa. Lo que no se usa es su
 * pareja `onSujeto`, y no por descuido: el salto que abre un acta va de la
 * muestra —destino `programas`— al formulario —destino `acta`— **y** lleva un
 * sujeto, y ninguno de los dos ayudantes de `PantallaProps` hace las dos cosas
 * a la vez. `onDest` borra el sujeto a proposito («el predio abierto no
 * significa nada en Territorio») y `onSujeto` conserva el destino, de modo que
 * usarlos en cadena escribiria el hash dos veces y dejaria dos entradas de
 * historial por cada acta abierta — «Atras» habria que pulsarlo dos veces para
 * volver a la muestra, que es justo el defecto que #685 cerro en Catastro.
 * `ir(modulo, dest, sujeto)` es una sola escritura.
 */
export default function Fiscalizacion({ dest, onDest, sujeto }: PantallaProps) {
  const { pref, toast, ir } = usarPreferencias();
  const m = moduloDe('fiscalizacion');

  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [sucio, setSucio] = useState(false);
  const [detTab, setDetTab] = useState(0);
  const [resTab, setResTab] = useState(0);
  const [paso, setPaso] = useState(0);
  const [modoCampo, setModoCampo] = useState(false);
  /* El programa elegido es el ID de uno REAL, no el codigo de la maqueta.
     `PF-2026-014` no existe en ninguna de las dos municipalidades: la tabla
     `programa_fiscalizacion` tiene cero filas (#546). */
  const [programa, setPrograma] = useState<number | null>(null);
  /* Nace VACIA. Con `{0: true, 3: true}` la pantalla abria con dos predios
     REALES ya marcados —en la muni 1, C-000001 y C-000003— que nadie eligio, y
     programar una fiscalizacion abre un procedimiento sobre una persona
     concreta. La llave es la identidad de la fila, no su posicion. */
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const grande = modoCampo;
  const esActa = dest === 'actas' || dest === 'acta';
  const esResolucion = dest === 'reporte';

  const set = (k: string, v: string | boolean) => {
    setVals((s) => ({ ...s, [k]: v }));
    setSucio(true);
  };
  const val = (k: string): string | boolean => (vals[k] === undefined ? DEFECTOS[k] : vals[k]);

  /* «Levantar acta» del panel es un acta nueva: cuatro pasos desde el primero
     y sin nada escrito. El shell la manda por su propio destino.

     El aviso decia «cada uno se guarda al avanzar», y no se guarda ninguno:
     avanzar solo cambia de paso, y lo tecleado vive en el estado de React hasta
     que se cierra el acta (#702). Y ahora dice ademas de donde sale el sujeto,
     porque el acta sin fila no se puede mandar y eso conviene saberlo al
     entrar, no al llegar al ultimo paso. */
  useEffect(() => {
    if (dest === 'acta') {
      setPaso(0);
      setSucio(false);
    }
  }, [dest]);

  /* ── Detección ─────────────────────────────────────────────── */
  /* ── Deteccion predial, contra `GET /fiscalizacion/omisos` ──── */
  const [sectorDet, setSectorDet] = useState('');
  const [condicionDet, setCondicionDet] = useState('');
  const [paginaDet, setPaginaDet] = useState(0);
  /**
   * Por que campo y en que sentido esta ordenada la deteccion (#546, #608).
   *
   * Nace en `null` —«nadie ha pedido ningun orden»— y no vuelve nunca a el.
   * `null` no es lo mismo que «por codigo, ascendente» aunque hoy el backend
   * conteste igual a las dos: sin `ordenarPor` el orden lo elige la consulta
   * —el controlador pone `codRefCatastral` por omision, pero eso es suyo y
   * puede cambiar—, y pintar la flecha en una cabecera que nadie pulso es
   * afirmar un orden que la pantalla no pidio.
   *
   * `campo` esta tipado con `OrdenDeOmisos`, asi que aqui tampoco se puede
   * guardar un orden que el backend no admita.
   */
  const [ordenDet, setOrdenDet] = useState<{ campo: OrdenDeOmisos; sentido: 'ASCENDENTE' | 'DESCENDENTE' } | null>(null);

  /**
   * Pulsar una cabecera: la activa se invierte, otra empieza por ascendente.
   *
   * Cambiar de columna **no hereda** el sentido de la anterior: «de mayor a
   * menor» dice cosas distintas en el codigo predial y en la diferencia de
   * area, y arrastrarlo dejaria la tabla abierta por el final de una columna
   * que se acaba de elegir sin haberlo pedido.
   */
  const alternarOrdenDet = (campo: OrdenDeOmisos) =>
    setOrdenDet((s) =>
      s !== null && s.campo === campo
        ? { campo, sentido: s.sentido === 'ASCENDENTE' ? 'DESCENDENTE' : 'ASCENDENTE' }
        : { campo, sentido: 'ASCENDENTE' },
    );
  useEffect(() => setPaginaDet(0), [sectorDet, condicionDet, pref.ejercicio, ordenDet]);

  /* La seleccion pertenece a la consulta que la produjo. Cambiar de sector, de
     condicion, de ejercicio, de pagina o de pestaña la vacia: si sobreviviera,
     seguiria contando predios que ya no estan en pantalla, y quien atiende
     leeria «3 seleccionados» sin ver una sola casilla marcada.

     Reordenar NO esta en esa lista, y la diferencia importa: la llave es el
     codigo del predio (#545), asi que la marca sigue al predio aunque cambie de
     sitio en la tabla. Lo que se vacia es lo que se lleva filas de la pagina;
     reordenar cambia cuales se ven, y de eso ya se encarga el reinicio de
     pagina de la linea de arriba. */
  useEffect(() => setMarcadas({}), [sectorDet, condicionDet, pref.ejercicio, paginaDet, detTab]);

  const omisos = useRecurso(
    (senal) =>
      listarOmisos(
        {
          ejercicio: pref.ejercicio,
          sector: sectorDet || undefined,
          condicion: condicionDet || undefined,
        },
        {
          pagina: paginaDet,
          tamano: TAMANO_DE_PAGINA,
          /* Los dos salen del MISMO estado, asi que van juntos o no va ninguno:
             `direccion` sin `ordenarPor` no ordena nada, y `ordenarPor` con una
             `direccion` que el backend no conoce es un 422 («El parametro
             'direccion' no admite el valor 'PATATA'», medido). */
          ordenarPor: ordenDet?.campo,
          direccion: ordenDet?.sentido,
        },
        senal,
      ),
    [pref.ejercicio, sectorDet, condicionDet, paginaDet, ordenDet],
    dest === 'deteccion' && detTab === 0,
  );

  /**
   * Las filas de la deteccion predial, en la forma que el recurso publica.
   *
   * Las cuatro columnas de dinero llegan `null` y **seguiran llegando `null`**:
   * valorar un predio exige el cuadro de valores unitarios, la depreciacion y
   * el arancel, y ninguno esta firmado (D-02a). Salen «—», no cero: un cero se
   * lee como «no debe nada».
   *
   * Y se añaden las tres que el backend SI publica con cifra y el artboard no
   * dibuja: el area catastral, la declarada y su diferencia. Son lo unico
   * cuantificado que hoy distingue a un subvaluador.
   *
   * <h2>La llave vuelve a ser el codigo predial, y esta MEDIDO (#545)</h2>
   *
   * Hasta #545 el padron de omisos **multiplicaba por copropietario** —25 filas
   * para 22 predios en la muni 1, 25 pares (predio, titular)— asi que el codigo
   * solo no bastaba y la llave era ese par. El commit del arreglo se titula «la
   * fila es el predio»: un predio con dos conyuges es ahora UNA fila con
   * `titulares` de dos.
   *
   * Se volvio a medir antes de simplificar, que es lo unico que lo justifica:
   *
   * <ul>
   *   <li>muni 1: 23 filas, **23 codigos distintos**, 0 repetidos — y 3 de esas
   *       filas traen dos titulares, que antes habrian sido seis filas;
   *   <li>Catacaos: 3 000 filas recorridas de 14 422, **3 000 codigos
   *       distintos**, 0 repetidos.
   * </ul>
   *
   * Y lo sostiene el esquema, no la suerte: la consulta es `FROM predio p` con
   * `LEFT JOIN` y un `LATERAL … LIMIT 1` —ninguna union abanica— sobre
   * `predio_codigo_uq UNIQUE (municipalidad_id, codigo_ref_catastral)`, columna
   * `NOT NULL` (V1).
   *
   * Simplificarla no es cosmetica. `titular` es un texto **derivado** —los
   * nombres unidos con « y »— y llega `null` en el predio que nadie reclama,
   * asi que la llave anterior cambiaba sola si alguien corregia un nombre en el
   * padron, y con ella la seleccion se soltaba sin decir nada. Equivocarse aqui
   * es marcar el predio que no es, y programar una fiscalizacion abre un
   * procedimiento sobre alguien concreto.
   */
  const filasDeOmisos: FilaDeDeteccion[] = (omisos.datos?.contenido ?? []).map((o) => ({
    llave: o.codRefCatastral,
    /* El rotulo se dibuja desde el enumerado, no desde su texto: asi renombrar
       la etiqueta no puede cambiar el color, y un valor que no conozcamos sale
       tal cual en vez de disfrazado del que mas se le parezca. */
    condicion: o.condicion,
    titular: o.titular,
    celdas: [
      o.codRefCatastral,
      /* El sector, que hasta #608 viajaba y no se dibujaba. Puede ser nulo —la
         consulta lo une con un `LEFT JOIN`, y el predio sin sector es uno de
         los casos que la deteccion busca—, asi que sale «—» en vez de en
         blanco: en blanco no se distingue de una celda que no se cargo. */
      o.sector ?? SIN_DATO,
      <CeldaDelTitular key="t" titular={o.titular} codigo={o.codigoDelTitular} cuantos={o.titulares.length} />,
      /* Dos hechos, dos insignias: el hallazgo del cruce y —si lo hay— que la
         declaracion llego vencido el plazo (#570). */
      <CeldaDeLaCondicion key="c" condicion={o.condicion} fueraDePlazo={o.declaroFueraDePlazo} />,
      /* Las tres ya no traen « m2» dentro (#546): son cantidades, y la unidad
         la dice la cabecera. `areaEnMetros` agrupa los miles sobre la cadena
         —sin pasar por `Number`, que es como se pierde un decimal— y devuelve
         «—» donde no hay area. */
      areaEnMetros(o.areaCatastral),
      areaEnMetros(o.areaDeclarada),
      areaEnMetros(o.diferenciaDeArea),
      o.impuestoOmitidoS ?? SIN_DATO,
    ],
  }));

  const detAct = detTab === 0 ? DET_PREDIAL : DET_VEHICULAR;

  /* Las filas que la tabla dibuja de verdad, con su llave. Las del cruce
     vehicular siguen siendo las del prototipo —ese cruce no tiene backend— y
     se llavean por la placa, que ahi si es unica. */
  /**
   * Las filas del cruce VEHICULAR no se dibujan, y no es un olvido.
   *
   * `DET_VEHICULAR` son cuatro vehiculos del artboard —`V1H-882`, `C2P-704`…—
   * con su hallazgo y su deuda omitida: «S/ 3,384.00», «S/ 1,446.00». Ninguna
   * de esas cifras existe, y no hay **ninguna** operacion del cruce registral
   * en el contrato (#546, #504): la pestaña no pedia nada al backend y
   * enseñaba cuatro personas con nombre y una deuda inventada al lado. Un
   * fiscalizador que abre un procedimiento por «baja indebida · 1 446,00»
   * lo abre sobre un numero que nadie calculo.
   */
  const filasVisibles: FilaDeDeteccion[] = detTab === 0 ? filasDeOmisos : [];

  /* El contador se calcula sobre lo que hay EN PANTALLA, no sobre otro arreglo:
     asi el pie y las casillas no pueden discrepar ni aunque la seleccion
     sobreviva a algo. Antes contaba sobre `DET_PREDIAL`, del prototipo, que
     tiene cuatro filas: marcar las veinte de la pagina decia «(4)». */
  const marcadasN = filasVisibles.filter((f) => marcadas[f.llave] === true).length;

  const paginaDeOmisos = omisos.datos;

  /* ── Programas, contra `GET /fiscalizacion/programas` (#431) ── */
  const [buscaPrograma, setBuscaPrograma] = useState('');
  const programas = useRecurso(
    (senal) => listarProgramas({ nDePrograma: buscaPrograma || undefined }, { pagina: 0, tamano: TAMANO_DE_PAGINA }, senal),
    [buscaPrograma],
    /* Tambien en `actas`, y no para dibujarlos: son el desplegable del unico
       filtro que ese listado tiene, y de paso lo que traduce el `programaId`
       interno de cada acta al codigo que se lee en el papel. */
    dest === 'programas' || dest === 'panel' || dest === 'actas',
  );
  const listaDeProgramas: ProgramaDeFiscalizacion[] = programas.datos?.contenido ?? [];

  /* El primero de la lista, mientras nadie elija otro. Sin programas no hay
     ninguno elegido y todo lo que cuelga de el se queda sin pedir. */
  const programaActivo: ProgramaDeFiscalizacion | null =
    listaDeProgramas.find((x) => x.id === programa) ?? listaDeProgramas[0] ?? null;

  /* ── La muestra del programa elegido (#481) ─────────────────── */
  const [paginaMuestra, setPaginaMuestra] = useState(0);
  useEffect(() => setPaginaMuestra(0), [programaActivo?.id]);
  const muestra = useRecurso(
    (senal) => listarMuestra(programaActivo?.id ?? 0, {}, { pagina: paginaMuestra, tamano: TAMANO_DE_PAGINA }, senal),
    [programaActivo?.id, paginaMuestra],
    (dest === 'programas' || dest === 'panel') && programaActivo !== null,
  );

  /* ── El alta de un programa, contra `POST /fiscalizacion/programas` (#550) ──
     ────────────────────────────────────────────────────────────────────────
     Es la mitad de frontend del AC 4. La operacion existia desde antes y no la
     alcanzaba ninguna pantalla: el unico boton que la nombraba —«+ Nuevo
     programa»— estaba apagado porque aqui no habia donde teclear sus cuatro
     campos obligatorios. Sin ella, un programa solo podia nacer por `curl`, y
     con el no nacia tampoco la muestra ni el acta que cuelgan de el.

     Los cinco campos que el servidor exige y su orden estan medidos en
     `registrarPrograma`, no leidos del backend. */
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [alta, setAlta] = useState<Record<string, string>>({});
  const campoDelAlta = (k: string): string => alta[k] ?? '';
  const fijarAlta = (k: string, v: string) => setAlta((s) => ({ ...s, [k]: v }));
  const [observacionDelAlta, setObservacionDelAlta] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [falloDelAlta, setFalloDelAlta] = useState<string | null>(null);

  /**
   * Lo que le falta al alta para poder mandarse, y **se dibuja**.
   *
   * No vive en el `title` de un boton apagado: un boton deshabilitado no recibe
   * el foco, asi que su `title` no lo lee un lector de pantalla ni lo descubre
   * quien no pasa el raton por encima (RNF-082). Esta lista es el motivo, y por
   * eso quitarla deja la pantalla sin decir por que no se puede registrar.
   *
   * Los cuatro primeros son los que el servidor exige. El quinto —ejercicio,
   * criterio y fiscalizador— **el servidor lo admite en blanco y esta pantalla
   * no**, y el motivo esta medido: `POST /fiscalizacion/programas/{id}/muestra`
   * contesta «El programa no declara 'X', y sin el no se puede sortear su
   * muestra» por cada uno de los tres, y **no hay ninguna ruta de edicion de un
   * programa** —«reprogramar es registrar otro»—, de modo que lo que nace sin
   * ellos es una fila esteril que nadie puede arreglar. Dejar pasar aqui el
   * dato que falta traslada el fallo a un acto despues y sin vuelta atras.
   *
   * Los tres se descubrieron **de uno en uno y operando la pantalla**, que es
   * lo que este orden de comprobacion obliga a hacer: el 422 nombra el primero
   * que falta y calla los demas, asi que un programa con ejercicio y criterio
   * —el que esta pantalla dejaba registrar antes de medirlo— pasaba las dos
   * comprobaciones y moria en la tercera.
   */
  const faltaDelAlta: { que: string; ok: boolean }[] = [
    { que: 'El código del programa', ok: campoDelAlta('codigo').trim() !== '' },
    { que: 'La descripción: qué se va a fiscalizar', ok: campoDelAlta('descripcion').trim() !== '' },
    { que: 'El tipo, predial o vehicular', ok: campoDelAlta('tipo') !== '' },
    { que: 'La fecha de inicio', ok: campoDelAlta('fechaInicio') !== '' },
    {
      que: 'El ejercicio, el criterio de riesgo y el fiscalizador, que son con los que sorteará su muestra',
      ok:
        campoDelAlta('ejercicio').trim() !== '' &&
        campoDelAlta('criterio') !== '' &&
        campoDelAlta('fiscalizador').trim() !== '',
    },
    { que: 'La observación de quien lo registra', ok: observacionBastante(observacionDelAlta) },
  ];
  const puedeRegistrarPrograma = faltaDelAlta.every((f) => f.ok);

  const registrarElPrograma = async () => {
    setRegistrando(true);
    setFalloDelAlta(null);
    try {
      /* Los cuatro opcionales van con `|| undefined` y no con la cadena vacia:
         `solicitar` no filtra el cuerpo —solo los parametros de consulta—, asi
         que un `""` viajaria y quedaria guardado como el sector llamado «». */
      const creado = await registrarPrograma({
        observacion: observacionDelAlta.trim(),
        codigo: campoDelAlta('codigo').trim(),
        descripcion: campoDelAlta('descripcion').trim(),
        tipo: campoDelAlta('tipo'),
        fechaInicio: campoDelAlta('fechaInicio'),
        ejercicio: campoDelAlta('ejercicio').trim() || undefined,
        sector: campoDelAlta('sector').trim() || undefined,
        criterio: campoDelAlta('criterio') || undefined,
        fiscalizador: campoDelAlta('fiscalizador').trim() || undefined,
      });
      setAltaAbierta(false);
      setAlta({});
      setObservacionDelAlta('');
      /* Se elige el que acaba de nacer, y se vuelve a pedir la lista: el
         programa que se registra es sobre el que se va a sortear ahora mismo,
         y buscarlo a mano en una lista que todavia no lo trae seria el paso
         que sobra. */
      setPrograma(creado.id);
      programas.reintentar();
      toast(`Programa ${creado.codigo} registrado. Todavía no tiene muestra: se sortea aquí abajo.`);
    } catch (error) {
      setFalloDelAlta(error instanceof ErrorDeApi ? error.mensaje : 'no hubo respuesta del servidor');
    } finally {
      setRegistrando(false);
    }
  };

  /* ── El sorteo de la muestra (#550, ADR-0023) ──────────────────────────
     El cuerpo lleva SOLO la observacion, y eso no es una omision: a quien se
     fiscaliza lo deciden los parametros del programa. Por eso este acto vive
     aqui —donde el programa esta elegido y sus parametros se leen— y no en la
     deteccion, donde lo que hay marcado son predios que no viajan. */
  const [observacionDelSorteo, setObservacionDelSorteo] = useState('');
  const [sorteando, setSorteando] = useState(false);
  const [falloDelSorteo, setFalloDelSorteo] = useState<string | null>(null);
  const [ultimoSorteo, setUltimoSorteo] = useState<ResultadoDelSorteo | null>(null);
  /* El recuento del sorteo es del programa que se sorteo: al cambiar de
     programa se va, porque si no diria las cifras de otro bajo esta muestra. */
  useEffect(() => {
    setUltimoSorteo(null);
    setFalloDelSorteo(null);
  }, [programaActivo?.id]);

  /**
   * Por que NO se puede sortear ahora mismo, o `null` si se puede.
   *
   * Las tres primeras causas se saben **antes de pulsar**, porque
   * `ProgramaResource` publica `ejercicio` y `criterio` y el sobre de la muestra
   * dice cuantas filas tiene: descubrirlas en el 422 de la respuesta seria
   * mandar a quien atiende a averiguar por ensayo lo que la pantalla ya sabe.
   */
  const motivoParaNoSortear: string | null =
    programaActivo === null
      ? 'No hay ningún programa elegido: el sorteo es un acto de un programa concreto.'
      : programaActivo.ejercicio === null
        ? `El programa ${programaActivo.codigo} no declara ejercicio, y sin él no hay padrón sobre el que sortear. No se le puede añadir: no existe ninguna ruta de edición de un programa.`
        : programaActivo.criterio === null
          ? `El programa ${programaActivo.codigo} no declara criterio de riesgo, y la muestra se sortea por uno. No se le puede añadir: no existe ninguna ruta de edición de un programa.`
          : programaActivo.fiscalizador === null
            ? `El programa ${programaActivo.codigo} no declara fiscalizador, y el sorteo lo exige aunque el alta lo admita en blanco. No se le puede añadir: no existe ninguna ruta de edición de un programa.`
            : (muestra.datos?.totalElementos ?? 0) > 0
              ? `El programa ${programaActivo.codigo} ya sorteó su muestra, y una muestra no se regenera: hay actas que cuelgan de ella.`
              : !observacionBastante(observacionDelSorteo)
                ? 'Falta la observación de quien sortea, de al menos cinco caracteres.'
                : null;

  const sortearLaMuestraDelPrograma = async () => {
    if (programaActivo === null) return;
    setSorteando(true);
    setFalloDelSorteo(null);
    try {
      const resultado = await sortearMuestra(programaActivo.id, observacionDelSorteo.trim());
      setUltimoSorteo(resultado);
      setObservacionDelSorteo('');
      muestra.reintentar();
      toast(`Muestra sorteada: ${resultado.predios} de ${resultado.detectados} detectados.`);
    } catch (error) {
      setFalloDelSorteo(error instanceof ErrorDeApi ? error.mensaje : 'no hubo respuesta del servidor');
    } finally {
      setSorteando(false);
    }
  };

  /**
   * Abre el alta con los filtros de la deteccion ya puestos (ADR-0023 §1).
   *
   * Es lo unico que la deteccion le pasa al programa, y es la salida (a) del
   * ADR escrita en un boton: **los predios marcados no viajan**, viajan el
   * sector y la condicion con los que se encontraron. La condicion vacia es
   * «Todas», que en un programa no existe —contesta 422 diciendo que no es un
   * criterio sino la ausencia de filtro—, asi que llega en blanco y el
   * formulario la pide.
   */
  const programarConLosFiltrosDeLaDeteccion = () => {
    setAlta({ tipo: 'PREDIAL', sector: sectorDet.trim(), criterio: condicionDet, ejercicio: pref.ejercicio });
    setObservacionDelAlta('');
    setFalloDelAlta(null);
    setAltaAbierta(true);
    onDest('programas');
  };

  /* ── Las actas levantadas, contra `GET /fiscalizacion/actas` (#599) ── */
  /**
   * El filtro del listado: el programa, por su ID interno y vacio para todas.
   *
   * No es `programaActivo`, que es el de la derecha del panel y nace en el
   * primero de la lista: aqui «ninguno elegido» significa **todas las actas de
   * la municipalidad**, que es la respuesta util cuando lo que se busca es un
   * acta y no se recuerda de que programa salio.
   */
  const [programaActas, setProgramaActas] = useState('');
  const [paginaActas, setPaginaActas] = useState(0);
  /** Igual que en la deteccion: nace `null`, y `null` no es «por id, ascendente». */
  const [ordenActas, setOrdenActas] = useState<{ campo: OrdenDeActas; sentido: 'ASCENDENTE' | 'DESCENDENTE' } | null>(null);
  const alternarOrdenActas = (campo: OrdenDeActas) =>
    setOrdenActas((s) =>
      s !== null && s.campo === campo
        ? { campo, sentido: s.sentido === 'ASCENDENTE' ? 'DESCENDENTE' : 'ASCENDENTE' }
        : { campo, sentido: 'ASCENDENTE' },
    );
  useEffect(() => setPaginaActas(0), [programaActas, ordenActas]);

  const actas = useRecurso(
    (senal) =>
      listarActas(
        { programa: programaActas || undefined },
        {
          pagina: paginaActas,
          tamano: TAMANO_DE_PAGINA,
          /* Los dos salen del MISMO estado y viajan juntos, por lo mismo que en
             la deteccion: `direccion` sin `ordenarPor` no ordena nada. */
          ordenarPor: ordenActas?.campo,
          direccion: ordenActas?.sentido,
        },
        senal,
      ),
    [programaActas, paginaActas, ordenActas],
    dest === 'actas',
  );

  /* ══════════════════════════════════════════════════════════════════════
     EL ACTA SE LEVANTA SOBRE UNA FILA DE LA MUESTRA (#431 AC 2, #481, #506)
     ══════════════════════════════════════════════════════════════════════

     El acta no tenia sujeto: los cinco campos de solo lectura del paso 1 salian
     con el guion largo y «Cerrar acta» estaba apagado, porque
     `POST /fiscalizacion/predial/actas` pide tres identificadores INTERNOS
     —`programaId`, `contribuyenteId`, `predioId`— y el formulario del manual
     dibuja en su lugar el codigo del programa, el nombre del contribuyente y el
     codigo predial, que no son lo mismo (#702).

     <h2>El sujeto va en la RUTA, y por que con esta forma</h2>

     `#/fiscalizacion/acta/‹codigo del programa›/‹predioId›`. Es el mecanismo de
     #685 —`sujeto` de `PantallaProps`, el tercer tramo de la ruta— y no un
     `useState`, por lo mismo que la ficha de un predio en Catastro: con estado
     propio el acta no esta en la URL, asi que no se puede compartir —la otra
     pestaña enseña otra cosa—, se pierde al recargar, y «Atras» no vuelve a la
     muestra sino un nivel mas arriba, porque nunca hubo entrada de historial.
     Un acta de campo se levanta en una tablet: recargar por perder la señal es
     el caso normal, no el raro.

     Las dos mitades del sujeto no estan escritas de la misma forma **a
     proposito**:

       - el PROGRAMA va por su codigo —`PF-550-UI0681`, lo que se lee en el
         papel— porque **identifica**: `programa_codigo_uq` es UNIQUE
         (municipalidad, codigo) (V4), y `GET /fiscalizacion/programas?
         nDePrograma=` casa exacto contra el —el repositorio compara `codigo =
         :codigo` en mayusculas—, de modo que resolverlo trae uno o ninguno y no
         depende de que el programa caiga en la primera pagina de la lista. Con
         el identificador interno en la URL habria que buscarlo en esa pagina,
         porque el contrato **no publica ninguna lectura de un programa suelto**
         —`GET /fiscalizacion/programas/{id}` no existe— y la lista solo se
         acota por codigo y por ejercicio;
       - el PREDIO va por su identificador interno porque es lo unico que el
         filtro de la muestra acepta: `?predio=2001…` contesta 422 «El predio de
         la muestra es un identificador».

     El separador es la barra y se parte por la ULTIMA, no por la primera: el
     codigo de un programa es texto libre y puede llevar barras —«PF/2026/014»—,
     y el identificador del predio son digitos y va al final, asi que la unica
     particion posible es esa. `App` escribe el sujeto con `encodeURIComponent`,
     asi que la barra viaja como `%2F` y no parte la ruta.

     <h2>Dos lecturas encadenadas, y ninguna cifra que no venga de ellas</h2>

     La segunda no puede salir hasta que la primera conteste, porque la muestra
     se pide por el ID del programa y en la URL esta su codigo. Con la red
     cortada no contesta ninguna: los cinco campos vuelven al guion largo y la
     primaria se apaga nombrando lo que falta, que es lo que `sin-red` mide. */

  /**
   * Las dos mitades del sujeto, o `null` si no hay ninguno abierto.
   *
   * Se valida aqui y no al usarlo: un tercer tramo escrito a mano —«pegado a
   * medias», un `%2F` perdido— tiene que quedarse en «no hay acta abierta» y no
   * en una peticion con `NaN` dentro.
   */
  const sujetoDelActa = useMemo(() => {
    if (!esActa || sujeto === '') return null;
    const corte = sujeto.lastIndexOf('/');
    if (corte <= 0) return null;
    const codigo = sujeto.slice(0, corte);
    const predio = sujeto.slice(corte + 1);
    if (codigo === '' || !/^[1-9]\d*$/.test(predio)) return null;
    return { codigo, predio };
  }, [esActa, sujeto]);

  /** El programa del acta, por su codigo. Casa exacto, asi que trae uno o ninguno. */
  const programaDelActaLeido = useRecurso(
    (senal) => listarProgramas({ nDePrograma: sujetoDelActa?.codigo }, { pagina: 0, tamano: 1 }, senal),
    [sujetoDelActa?.codigo],
    sujetoDelActa !== null,
  );
  const programaDelActa: ProgramaDeFiscalizacion | null = programaDelActaLeido.datos?.contenido[0] ?? null;

  /**
   * La fila de la muestra sobre la que se levanta el acta.
   *
   * `tamano: 1` porque el filtro acota a un predio y la respuesta trae una fila
   * o ninguna. Ninguna **no** es lo mismo que el 404 del programa inexistente
   * —que lo dice `FalloDeLaMuestra`—: es «ese predio no salio en la muestra de
   * este programa», y se arregla eligiendo otra fila, no volviendo a la lista.
   */
  const filaDelActaLeida = useRecurso(
    (senal) =>
      listarMuestra(
        programaDelActa?.id ?? 0,
        { predio: sujetoDelActa?.predio },
        { pagina: 0, tamano: 1 },
        senal,
      ),
    [programaDelActa?.id, sujetoDelActa?.predio],
    sujetoDelActa !== null && programaDelActa !== null,
  );
  const filaDelActa: FilaDeMuestra | null = filaDelActaLeida.datos?.contenido[0] ?? null;

  /* Cambiar de predio limpia lo tecleado. Sin esto, el area medida en la casa
     anterior se queda escrita sobre la ficha de la siguiente y se manda con
     ella: es el defecto que `abrirPredio` de Catastro ya evita, y aqui acaba en
     un acta firmada. */
  useEffect(() => {
    setVals({});
    setSucio(false);
    setPaso(0);
    setObservacionDelActa('');
    setFalloDelActa(null);
    setActaRegistrada(null);
  }, [sujeto]);

  /**
   * Los cinco campos de solo lectura del paso 1, **resueltos de las lecturas**.
   *
   * No entran en `vals`: `vals` es lo que alguien tecleo, y sembrarlo con datos
   * leidos deja un estado que sobrevive a que la lectura falle —la pantalla
   * seguiria enseñando el titular del predio anterior con la red caida—. Se
   * calculan al dibujar, de modo que sin lectura no hay valor y el control cae
   * en el guion largo por construccion.
   */
  const deLaFila: Record<string, string> = {
    /* El numero del acta se queda vacio SIEMPRE, tambien con la fila leida y
       tambien despues de registrarla: `acta_fiscalizacion` (V4) **no tiene
       columna de numero** —el acta se identifica por su identificador interno y
       su version dentro del programa—. Poner ahi el `id` seria lo que el pie de
       la tabla de actas advierte: «Nº interno» no es el numero del acta. El
       acuse del cierre lo dice con ese nombre. */
    acta: '',
    programa: programaDelActa?.codigo ?? '',
    predio: filaDelActa?.codRefCatastral ?? '',
    /* El nombre y el codigo municipal juntos, que es como los publica la fila.
       Sin titular vigente **no se inventa uno**: es el predio que nadie reclama
       —4 977 de los 14 422 de Catacaos (#586)— y la visita es justo lo que
       resuelve quien lo ocupa. */
    contribuyente:
      filaDelActa === null
        ? ''
        : filaDelActa.titular === null
          ? 'Sin titular vigente'
          : filaDelActa.titular + (filaDelActa.codContribuyente === null ? '' : ' · ' + filaDelActa.codContribuyente),
    /* Del PROGRAMA, que es donde el manual lo declara y donde el sorteo lo
       exige: `POST /fiscalizacion/programas/{id}/muestra` contesta «El programa no declara
       'fiscalizador'» sin el, asi que todo programa con muestra tiene uno. */
    fiscalizador: programaDelActa?.fiscalizador ?? '',
  };

  /**
   * Lo declarado de cada caracteristica, para la columna del paso 2.
   *
   * Solo el area de terreno tiene lado declarado publicado, y es una **foto del
   * dia del sorteo**: `MuestraDelPrograma` copia las dos superficies y no las
   * relee, para poder contestar «¿por que me toco a mi?». Por eso la tabla
   * lleva su fecha al lado (regla 9).
   */
  const declaradoDe = (k: string): string => (k === 'terrenoV' ? (filaDelActa?.areaDeclarada ?? '') : '');

  /* ── La escritura del acta (#431, regla 10) ──────────────────────────
     Mismo camino que el alta de programa y el sorteo, y por el mismo motivo:
     sin observacion no se guarda nada (RNF-052), y el motivo por el que no se
     puede mandar se DIBUJA en vez de esconderse en el `title` de un boton
     apagado, que un boton deshabilitado no recibe el foco (RNF-082). */
  const [observacionDelActa, setObservacionDelActa] = useState('');
  const [registrandoActa, setRegistrandoActa] = useState(false);
  const [falloDelActa, setFalloDelActa] = useState<string | null>(null);
  const [actaRegistrada, setActaRegistrada] = useState<ActaDeFiscalizacion | null>(null);

  /**
   * Lo que le falta al acta para poder mandarse, y **se dibuja**.
   *
   * El orden es el que el servidor comprueba, medido campo a campo: el 422
   * nombra el primero que falta y calla los demas, asi que descubrirlos por
   * ensayo cuesta seis viajes. Aqui se ven los seis a la vez.
   *
   * Los tres identificadores no tienen linea propia porque no se teclean: son
   * la fila de la muestra, y si no esta resuelta lo dice la primera.
   */
  const faltaDelActa: { que: string; ok: boolean }[] = [
    {
      que: 'El predio de la muestra sobre el que se levanta: es de donde salen el programa, el contribuyente y el predio que el acta exige',
      ok: filaDelActa !== null && filaDelActa.contribuyenteId !== null && programaDelActa !== null,
    },
    { que: 'La fecha de la inspección', ok: String(val('fecha')) !== '' },
    {
      que: 'El fiscalizador, que sale del programa y no se teclea aquí',
      ok: deLaFila.fiscalizador !== '',
    },
    { que: 'El hallazgo, sin el cual el acta se liquidaría como conforme', ok: String(val('hallazgo')) !== '' },
    {
      que: 'El uso observado, que USO_DISTINTO exige: sin él el acta afirma un hallazgo que no puede sustentar',
      ok: String(val('hallazgo')) !== 'USO_DISTINTO' || String(val('usoV')).trim() !== '',
    },
    {
      que: 'El área de terreno medida, si se anotó, tiene que ser un número',
      ok: String(val('terrenoV')).trim() === '' || /^\d+([.,]\d+)?$/.test(String(val('terrenoV')).trim()),
    },
    { que: 'La observación de quien registra, de al menos cinco caracteres', ok: observacionBastante(observacionDelActa) },
  ];

  /**
   * Por que NO se puede cerrar el acta ahora mismo, o `null` si se puede.
   *
   * Las causas del sujeto se separan de las del formulario porque se arreglan
   * de maneras distintas: sin fila hay que ir a la muestra y elegir una, y sin
   * hallazgo hay que rellenar el paso 3. Un solo mensaje para las dos mandaria
   * a quien atiende al sitio equivocado la mitad de las veces.
   */
  const motivoParaNoCerrarActa: string | null =
    actaRegistrada !== null
      ? `El acta ya quedó registrada con el identificador interno ${String(actaRegistrada.id)}, y un acta no se edita: para corregirla hay que anularla y levantar otra (regla 4).`
      : sujetoDelActa === null
        ? 'Esta acta no se levanta sobre ningún predio. Se abre desde la muestra de un programa, con «Levantar acta» en la fila del predio que toca visitar.'
        : programaDelActaLeido.error !== null || filaDelActaLeida.error !== null
          ? 'No se pudo leer la fila de la muestra, así que no hay de dónde sacar el programa, el contribuyente ni el predio.'
          : programaDelActaLeido.cargando || filaDelActaLeida.cargando
            ? 'Leyendo la fila de la muestra…'
            : programaDelActa === null
              ? `No hay ningún programa con el código «${sujetoDelActa.codigo}» en esta municipalidad.`
              : filaDelActa === null
                ? `El predio ${sujetoDelActa.predio} no salió en la muestra de ${programaDelActa.codigo}: elige una fila de esa muestra.`
                : filaDelActa.contribuyenteId === null
                  ? 'Ese predio no tiene titular vigente, y el acta exige el contribuyente fiscalizado. Quien lo visite averigua quién lo ocupa; hasta que el padrón lo registre, el acta no se puede levantar sobre él.'
                  : (faltaDelActa.find((f) => !f.ok)?.que ?? null);

  /**
   * Cierra el acta: la registra y **es irreversible** (regla 4).
   *
   * El cuerpo lleva los diez campos que el servidor admite y ni uno mas. Los
   * tres identificadores salen de la fila leida, no de nada tecleado: es lo
   * unico que impide levantar un acta sobre un predio que no esta en la
   * muestra, o cargarsela a quien no es su titular.
   */
  const cerrarElActa = async () => {
    if (motivoParaNoCerrarActa !== null || filaDelActa === null || programaDelActa === null) return;
    const contribuyenteId = filaDelActa.contribuyenteId;
    if (contribuyenteId === null) return;
    setRegistrandoActa(true);
    setFalloDelActa(null);
    try {
      /* Los opcionales van con `|| undefined` y no con la cadena vacia: el
         cuerpo no se filtra —solo se filtran los parametros de consulta—, asi
         que un `""` viajaria, y `usoHallado: ""` se guardaria como un uso en
         blanco en vez de como «no se anoto», que son cosas distintas. El area
         se manda con el punto decimal, que es lo que `new BigDecimal(...)` lee:
         una coma tecleada contesta «El area hallada no es un numero valido». */
      const areaHallada = String(val('terrenoV')).trim().replace(',', '.');
      const usoHallado = String(val('usoV')).trim();
      const detalle = String(val('obs')).trim();
      const registrada = await registrarActaPredial({
        observacion: observacionDelActa.trim(),
        programaId: filaDelActa.programaId,
        contribuyenteId,
        predioId: filaDelActa.predioId,
        fechaVisita: String(val('fecha')),
        fiscalizador: deLaFila.fiscalizador,
        hallazgo: String(val('hallazgo')),
        areaHallada: areaHallada === '' ? undefined : areaHallada,
        usoHallado: usoHallado === '' ? undefined : usoHallado,
        detalle: detalle === '' ? undefined : detalle,
      });
      setActaRegistrada(registrada);
      setObservacionDelActa('');
      setSucio(false);
      /* La muestra de esa fila vuelve a pedirse: `visitado` acaba de cambiar, y
         dejarla como estaba diria que el predio sigue sin inspeccionar. */
      filaDelActaLeida.reintentar();
      toast(`Acta registrada sobre el predio ${filaDelActa.codRefCatastral}, con el identificador interno ${String(registrada.id)}.`);
    } catch (error) {
      setFalloDelActa(error instanceof ErrorDeApi ? error.mensaje : 'no hubo respuesta del servidor');
    } finally {
      setRegistrandoActa(false);
    }
  };

  /** Abre el acta de una fila de la muestra. El destino cambia **y** el sujeto. */
  const levantarActaDe = (fila: FilaDeMuestra, codigoDelPrograma: string) =>
    ir('fiscalizacion', 'acta', codigoDelPrograma + '/' + String(fila.predioId));



  /* ── Resultados, contra `GET /fiscalizacion/resultados` (#49) ── */
  const [paginaRes, setPaginaRes] = useState(0);
  useEffect(() => setPaginaRes(0), [resTab]);
  const resultados = useRecurso(
    (senal) => listarResultados({}, { pagina: paginaRes, tamano: TAMANO_DE_PAGINA }, senal),
    [paginaRes],
    dest === 'resultados' && resTab === 0,
  );

  /* Las dos cifras del embudo que SI se pueden leer, acotadas al programa: son
     la misma consulta de resultados con su filtro, y de ellas solo se lee el
     total del sobre. No se componen aqui: se preguntan. */
  const liquidadas = useRecurso(
    (senal) => listarResultados({ programa: String(programaActivo?.id ?? 0) }, { pagina: 0, tamano: 1 }, senal),
    [programaActivo?.id],
    dest === 'panel' && programaActivo !== null,
  );
  const notificadas = useRecurso(
    (senal) =>
      listarResultados({ programa: String(programaActivo?.id ?? 0), estado: 'NOTIFICADA' }, { pagina: 0, tamano: 1 }, senal),
    [programaActivo?.id],
    dest === 'panel' && programaActivo !== null,
  );
  /**
   * «Inspeccionados» del embudo, que hasta #599 no tenia de donde salir.
   *
   * Es el `totalElementos` del listado de actas acotado al programa, y **no una
   * suma**: `MuestraResource.visitado` viaja fila a fila, asi que contarlo aqui
   * daria las visitadas de la pagina que se trajo y no las del programa
   * (RNF-083). Por eso se pide con `tamano: 1` —de esta lectura solo se lee el
   * total del sobre, igual que en las dos de resultados de arriba—.
   */
  const inspeccionadas = useRecurso(
    (senal) => listarActas({ programa: String(programaActivo?.id ?? 0) }, { pagina: 0, tamano: 1 }, senal),
    [programaActivo?.id],
    dest === 'panel' && programaActivo !== null,
  );

  /** La pagina del listado de actas del que se elige la que se liquida (#49). */
  const [paginaActasLiq, setPaginaActasLiq] = useState(0);

  /**
   * Las actas levantadas en la municipalidad. Sin filtro: ni la franja ni la
   * grilla de liquidaciones que tiene debajo acotan por programa.
   *
   * <h2>Una sola lectura para las dos cosas, y por eso ya no pide `tamano: 1`</h2>
   *
   * De aqui salen la cifra de la franja —el `totalElementos` del sobre, que es
   * el del padron y no el de la pagina (RNF-083)— y **la lista de la que se
   * elige el acta que se liquida**. Pedirla dos veces —una con `tamano: 1` para
   * el total y otra entera para el desplegable— serian dos viajes al mismo
   * endpoint por pantalla y dos respuestas que podrian no coincidir.
   */
  const actasLevantadas = useRecurso(
    (senal) => listarActas({}, { pagina: paginaActasLiq, tamano: TAMANO_DE_PAGINA, ordenarPor: 'id', direccion: 'DESCENDENTE' }, senal),
    [paginaActasLiq],
    dest === 'resultados' && resTab === 0,
  );

  /* ── El estado de cuenta de un contribuyente (RF-056) ────────── */
  const [contribuyenteRes, setContribuyenteRes] = useState('');
  const contribuyenteReposado = useRebote(contribuyenteRes);
  const estadoDeCuenta = useRecurso(
    (senal) => leerEstadoDeCuenta(contribuyenteReposado.trim(), senal),
    [contribuyenteReposado],
    dest === 'resultados' && resTab === 1 && contribuyenteReposado.trim() !== '',
  );

  /* ══════════════════════════════════════════════════════════════════════
     LAS TRES ESCRITURAS DE LA LIQUIDACION (#49, RF-053, RF-056)
     ══════════════════════════════════════════════════════════════════════

     El eslabon del medio del procedimiento, que estaba vivo en el contrato y no
     lo nombraba ni una linea de esta interfaz. Se levantaba el acta (#431) y no
     habia por donde liquidarla: esta misma pantalla del acta mandaba aqui —«se
     hace en «Resultados»»— y aqui no habia formulario ninguno.

     Los tres actos NO van juntos, y el reparto no es de gusto: `liquidar` y
     `reliquidar` piden `fisc_resultados` con privilegio de REGISTRO, y el
     cambio de estado pide `fisc_historico` con MODIFICACION. Por eso los dos
     primeros viven en la pestaña «Por acta» y el tercero en «Histórico de
     versiones»: un perfil que solo tenga uno de los dos accesos ve la pestaña
     que puede operar y no la que le contestaria 403 al pulsar. */

  /**
   * La liquidacion elegida en la grilla: el sujeto de los otros dos actos.
   *
   * <h2>Se guarda la FILA, no su numero, y eso lo decidio operar la pantalla</h2>
   *
   * La primera version guardaba el numero y buscaba la fila en
   * `resultados.datos`. **No funcionaba, y el sintoma era mudo**: `useRecurso`
   * pone `datos` a `null` en cuanto su `activo` pasa a falso, y el de la grilla
   * es `resTab === 0`, asi que al abrir «Histórico de versiones» —donde vive el
   * cambio de estado— la fila desaparecia y el formulario no se dibujaba nunca.
   * No hay error, no hay aviso: la pestaña se abre y el acto no esta. Se
   * descubrio pulsando, no leyendo.
   */
  const [liquidacionElegida, setLiquidacionElegida] = useState<LiquidacionDeFiscalizacion | null>(null);
  const elegida = liquidacionElegida?.numero ?? null;
  /* Si se cambia de pagina, la eleccion se va: los dos formularios de abajo se
     prellenan con lo que la fila trae, y dejarla elegida cuando su fila ya no
     esta en pantalla dejaria un formulario apuntando a un numero que no se ve
     por ninguna parte. De pestaña SI sobrevive, que es de lo que se trata. */
  useEffect(() => setLiquidacionElegida(null), [paginaRes]);
  /* Y la copia se refresca cuando la grilla vuelve a traer su fila: guardar la
     fila tiene el precio de que envejece, y lo que decide si un acto se puede
     hacer —`estado`, `version`— es justo lo que cambia. Se comparan esos dos y
     no el objeto entero: la respuesta trae uno nuevo en cada lectura, asi que
     comparar por identidad seria un bucle. */
  useEffect(() => {
    const filas = resultados.datos?.contenido;
    if (filas === undefined || liquidacionElegida === null) return;
    const fresca = filas.find((l) => l.numero === liquidacionElegida.numero);
    if (fresca !== undefined && (fresca.estado !== liquidacionElegida.estado || fresca.version !== liquidacionElegida.version)) {
      setLiquidacionElegida(fresca);
    }
  }, [resultados.datos, liquidacionElegida]);

  /* ── 1. Liquidar un acta ─────────────────────────────────────────────── */

  const [actaALiquidar, setActaALiquidar] = useState('');
  const [liq, setLiq] = useState<Record<string, string>>({});
  const campoDeLiq = (k: string): string => liq[k] ?? '';
  const fijarLiq = (k: string, v: string) => setLiq((s) => ({ ...s, [k]: v }));
  const [observacionDeLiq, setObservacionDeLiq] = useState('');
  const [liquidando, setLiquidando] = useState(false);
  const [falloDeLiq, setFalloDeLiq] = useState<string | null>(null);

  const actasDeLaPagina = actasLevantadas.datos?.contenido ?? [];
  const actaElegida = actasDeLaPagina.find((a) => String(a.id) === actaALiquidar) ?? null;

  /**
   * Que actas se sabe que YA tienen liquidacion, y hasta donde llega ese saber.
   *
   * `GET /fiscalizacion/resultados` publica el `actaId` de la ULTIMA version de
   * cada acta, asi que la pagina que la grilla acaba de traer dice, de esas
   * filas, cual acta esta liquidada y con que numero. Es conocimiento
   * **positivo y parcial**: lo que esta aqui es cierto, lo que no esta puede
   * estarlo en otra pagina. Por eso marcarlas y apagarlas es seguro —no puede
   * apagar una que se pudiera liquidar— y por eso el 409 sigue siendo la ultima
   * palabra, dicho al lado del desplegable.
   *
   * Y no hay una fuente mejor: `acta_fiscalizacion.estado` **nace `ABIERTA` y no
   * la mueve nadie** —el unico `EstadoDeActa` que se escribe en todo `src/main`
   * es el `ABIERTA` de `ActaFiscalizacion.nueva`—, de modo que la columna
   * «Estado» de un acta liquidada sigue diciendo «Abierta»: medido contra el
   * backend, el acta 1 tiene `LIQ-2026-000001` y su estado es `ABIERTA`.
   */
  const yaLiquidadas = new Map<number, string>();
  for (const l of resultados.datos?.contenido ?? []) yaLiquidadas.set(l.actaId, l.numero);

  /** Un ejercicio del formulario: cuatro digitos, que es lo que el servidor lee. */
  const esEjercicio = (v: string): boolean => /^\d{4}$/.test(v.trim());

  /**
   * Lo que le falta a la liquidacion para poder mandarse, y **se dibuja**.
   *
   * El orden es el que el servidor comprueba, medido campo a campo mandando el
   * cuerpo vacio y añadiendo de uno en uno lo que el 422 pedia: el mensaje
   * nombra el primero que falta y calla los demas, asi que descubrirlos por
   * ensayo cuesta seis viajes. Aqui se ven los seis a la vez, y no en el `title`
   * de un boton apagado, que un boton deshabilitado no recibe el foco (RNF-082).
   */
  const faltaDeLaLiquidacion: { que: string; ok: boolean }[] = [
    { que: 'El acta levantada que se liquida: la liquidación es de un acta, no de un predio', ok: actaElegida !== null },
    {
      que: 'El periodo fiscalizado: los dos ejercicios, de cuatro dígitos y sin ir al revés',
      ok:
        esEjercicio(campoDeLiq('periodoDesde')) &&
        esEjercicio(campoDeLiq('periodoHasta')) &&
        Number(campoDeLiq('periodoDesde')) <= Number(campoDeLiq('periodoHasta')),
    },
    { que: 'El tipo de fiscalización, que es lo que dice con qué se sustenta lo hallado', ok: campoDeLiq('tipoDeFiscalizacion') !== '' },
    { que: 'El motivo determinante: por qué se fiscalizó', ok: campoDeLiq('motivoDeterminante').trim() !== '' },
    { que: 'La observación de quien registra, de al menos cinco caracteres', ok: observacionBastante(observacionDeLiq) },
  ];

  const motivoParaNoLiquidar: string | null =
    actasLevantadas.error !== null
      ? 'No se pudo leer el listado de actas, así que no hay ninguna de la que elegir.'
      : actasLevantadas.cargando
        ? 'Leyendo las actas levantadas…'
        : actaElegida !== null && yaLiquidadas.has(actaElegida.id)
          ? `El acta ${String(actaElegida.id)} ya se liquidó con ${String(yaLiquidadas.get(actaElegida.id))}. Una segunda liquidación de la misma acta es una reliquidación, que se hace abajo.`
          : (faltaDeLaLiquidacion.find((f) => !f.ok)?.que ?? null);

  /**
   * Emite la liquidacion. **Es irreversible** (regla 4): no se edita ni se
   * borra —`liquidacion_fiscalizacion` no admite `UPDATE` desde V39—, se
   * reliquida emitiendo otra version.
   *
   * El cuerpo lleva los siete campos que el servidor lee y ni uno mas. `fecha`
   * va con `|| undefined` y no con la cadena vacia: el cuerpo no se filtra
   * —solo se filtran los parametros de consulta—, y una fecha en blanco que
   * viajara no seria «pon la tuya» sino un formato invalido.
   */
  const liquidarElActa = async () => {
    if (motivoParaNoLiquidar !== null || actaElegida === null) return;
    setLiquidando(true);
    setFalloDeLiq(null);
    try {
      const fecha = campoDeLiq('fecha');
      const emitida = await liquidarFiscalizacion({
        observacion: observacionDeLiq.trim(),
        actaId: String(actaElegida.id),
        periodoDesde: campoDeLiq('periodoDesde').trim(),
        periodoHasta: campoDeLiq('periodoHasta').trim(),
        tipoDeFiscalizacion: campoDeLiq('tipoDeFiscalizacion'),
        motivoDeterminante: campoDeLiq('motivoDeterminante').trim(),
        fecha: fecha === '' ? undefined : fecha,
      });
      setLiq({});
      setObservacionDeLiq('');
      setActaALiquidar('');
      /* La grilla vuelve a pedirse: la liquidacion que acaba de nacer es una
         fila mas, y dejarla como estaba diria que el acta sigue sin liquidar. */
      resultados.reintentar();
      toast(`Liquidación ${emitida.numero} emitida sobre el acta ${String(emitida.actaId)}, versión ${String(emitida.version)}.`);
    } catch (error) {
      setFalloDeLiq(error instanceof ErrorDeApi ? error.mensaje : 'no hubo respuesta del servidor');
    } finally {
      setLiquidando(false);
    }
  };

  /* ── 2. Reliquidar la elegida ────────────────────────────────────────── */

  const [rel, setRel] = useState<Record<string, string>>({});
  const campoDeRel = (k: string): string => rel[k] ?? '';
  const fijarRel = (k: string, v: string) => setRel((s) => ({ ...s, [k]: v }));
  /** Las correcciones por linea, con la clave `‹ejercicio›|‹campo›`. */
  const [correcciones, setCorrecciones] = useState<Record<string, string>>({});
  const correccion = (ejercicio: number, campo: string): string => correcciones[String(ejercicio) + '|' + campo] ?? '';
  const fijarCorreccion = (ejercicio: number, campo: string, v: string) =>
    setCorrecciones((s) => ({ ...s, [String(ejercicio) + '|' + campo]: v }));
  const [observacionDeRel, setObservacionDeRel] = useState('');
  const [reliquidando, setReliquidando] = useState(false);
  const [falloDeRel, setFalloDeRel] = useState<string | null>(null);
  const [ultimaVersion, setUltimaVersion] = useState<VersionDeLiquidacion | null>(null);

  /* ── 3. Mover de estado ──────────────────────────────────────────────── */

  const [est, setEst] = useState<Record<string, string>>({});
  const campoDeEst = (k: string): string => est[k] ?? '';
  const fijarEst = (k: string, v: string) => setEst((s) => ({ ...s, [k]: v }));
  const [observacionDeEst, setObservacionDeEst] = useState('');
  const [moviendo, setMoviendo] = useState(false);
  const [falloDeEst, setFalloDeEst] = useState<string | null>(null);

  /**
   * Elige una liquidacion de la grilla y prellena los dos formularios que
   * cuelgan de ella.
   *
   * Se prellena **aqui y no en un efecto**: con un efecto atado a los datos, el
   * refresco de la grilla —que ocurre en cuanto se emite algo— pisaria lo que
   * quien atiende acabara de teclear. Y los cuatro valores que se copian son
   * los de la version anterior porque una reliquidacion **exige los cuatro** y
   * lo normal es que cambie uno: obligar a teclear los otros tres invita a
   * teclearlos distintos sin querer.
   */
  const elegirLiquidacion = (l: LiquidacionDeFiscalizacion) => {
    setLiquidacionElegida(l);
    setRel({
      periodoDesde: String(l.periodoDesde),
      periodoHasta: String(l.periodoHasta),
      tipoDeFiscalizacion: l.tipoDeFiscalizacion,
      motivoDeterminante: l.motivoDeterminante,
      fecha: '',
    });
    setCorrecciones({});
    setObservacionDeRel('');
    setFalloDeRel(null);
    setUltimaVersion(null);
    setEst({});
    setObservacionDeEst('');
    setFalloDeEst(null);
  };

  /**
   * Los ejercicios del periodo nuevo que la version anterior no cubre.
   *
   * `ReliquidarFiscalizacion` los rechaza uno a uno —«no se puede inventar: se
   * rechaza nombrandolo. Rellenarlo con una linea vacia diria que se fiscalizo
   * y no se encontro nada»—, y la pantalla los sabe antes de pulsar porque
   * `LiquidacionResource.lineas` viaja en la fila: descubrirlo en el 422 seria
   * mandar a averiguar por ensayo lo que ya esta en la respuesta.
   */
  const ejerciciosSinLinea: number[] = (() => {
    if (liquidacionElegida === null) return [];
    const desde = Number(campoDeRel('periodoDesde'));
    const hasta = Number(campoDeRel('periodoHasta'));
    if (!esEjercicio(campoDeRel('periodoDesde')) || !esEjercicio(campoDeRel('periodoHasta')) || desde > hasta) return [];
    const tiene = new Set(liquidacionElegida.lineas.map((l) => l.ejercicio));
    const faltan: number[] = [];
    for (let e = desde; e <= hasta; e++) if (!tiene.has(e)) faltan.push(e);
    return faltan;
  })();

  /** Un area corregida: numero con punto o coma decimal, o nada. */
  const areaBastante = (v: string): boolean => v.trim() === '' || /^\d+([.,]\d+)?$/.test(v.trim());

  const areasCorregidasMalEscritas: boolean = (liquidacionElegida?.lineas ?? []).some(
    (l) => !areaBastante(correccion(l.ejercicio, 'areaDeclarada')) || !areaBastante(correccion(l.ejercicio, 'areaHallada')),
  );

  const faltaDeLaReliquidacion: { que: string; ok: boolean }[] = [
    {
      que: 'El periodo fiscalizado: los dos ejercicios, de cuatro dígitos y sin ir al revés',
      ok:
        esEjercicio(campoDeRel('periodoDesde')) &&
        esEjercicio(campoDeRel('periodoHasta')) &&
        Number(campoDeRel('periodoDesde')) <= Number(campoDeRel('periodoHasta')),
    },
    {
      que:
        ejerciciosSinLinea.length === 0
          ? 'Cada ejercicio del periodo tiene línea en la versión anterior'
          : `Los ejercicios ${ejerciciosSinLinea.join(', ')} no tienen línea en la versión anterior, y una línea vacía no se inventa: o se acota el periodo, o se liquida otra acta que los cubra`,
      ok: ejerciciosSinLinea.length === 0,
    },
    { que: 'El tipo de fiscalización', ok: campoDeRel('tipoDeFiscalizacion') !== '' },
    { que: 'El motivo determinante', ok: campoDeRel('motivoDeterminante').trim() !== '' },
    { que: 'Las áreas corregidas, si se escribió alguna, tienen que ser números', ok: !areasCorregidasMalEscritas },
    { que: 'La observación de quien registra, de al menos cinco caracteres', ok: observacionBastante(observacionDeRel) },
  ];

  const motivoParaNoReliquidar: string | null =
    liquidacionElegida === null
      ? 'No hay ninguna liquidación elegida: se reliquida una concreta, y se elige con «Elegir» en su fila de la grilla de arriba.'
      : (faltaDeLaReliquidacion.find((f) => !f.ok)?.que ?? null);

  /**
   * Reliquida: emite **otra version**, y tambien es irreversible. La anterior no
   * cambia ni una columna.
   *
   * Solo viajan las lineas que alguien toco: `CorreccionDeLinea` conserva lo que
   * no nombra, asi que mandar las cuatro claves de todas las lineas con lo que
   * ya decian seria repetir el contraste entero para corregir un area — y
   * cualquier redondeo distinto al escribirlo lo cambiaria sin querer.
   */
  const reliquidarLaElegida = async () => {
    if (motivoParaNoReliquidar !== null || liquidacionElegida === null) return;
    setReliquidando(true);
    setFalloDeRel(null);
    try {
      const lista: CorreccionDeLineaDeLiquidacion[] = [];
      for (const linea of liquidacionElegida.lineas) {
        const areaDeclarada = correccion(linea.ejercicio, 'areaDeclarada').trim().replace(',', '.');
        const areaHallada = correccion(linea.ejercicio, 'areaHallada').trim().replace(',', '.');
        const usoDeclarado = correccion(linea.ejercicio, 'usoDeclarado').trim();
        const usoHallado = correccion(linea.ejercicio, 'usoHallado').trim();
        if (areaDeclarada === '' && areaHallada === '' && usoDeclarado === '' && usoHallado === '') continue;
        lista.push({
          ejercicio: String(linea.ejercicio),
          areaDeclarada: areaDeclarada === '' ? undefined : areaDeclarada,
          areaHallada: areaHallada === '' ? undefined : areaHallada,
          usoDeclarado: usoDeclarado === '' ? undefined : usoDeclarado,
          usoHallado: usoHallado === '' ? undefined : usoHallado,
        });
      }
      const fecha = campoDeRel('fecha');
      const nueva = await reliquidarFiscalizacion(liquidacionElegida.numero, {
        observacion: observacionDeRel.trim(),
        periodoDesde: campoDeRel('periodoDesde').trim(),
        periodoHasta: campoDeRel('periodoHasta').trim(),
        tipoDeFiscalizacion: campoDeRel('tipoDeFiscalizacion'),
        motivoDeterminante: campoDeRel('motivoDeterminante').trim(),
        correcciones: lista.length === 0 ? undefined : lista,
        fecha: fecha === '' ? undefined : fecha,
      });
      setUltimaVersion(nueva);
      setObservacionDeRel('');
      setCorrecciones({});
      /* La elegida se va: la version que se acaba de corregir ya no es la
         ultima de su acta, y reliquidarla otra vez contesta 409 nombrando a la
         nueva. Quien quiera seguir corrigiendo elige la nueva de la grilla. */
      setLiquidacionElegida(null);
      resultados.reintentar();
      toast(`Reliquidación ${nueva.version.numero} emitida: versión ${String(nueva.version.version)} del acta ${String(nueva.version.actaId)}.`);
    } catch (error) {
      setFalloDeRel(error instanceof ErrorDeApi ? error.mensaje : 'no hubo respuesta del servidor');
    } finally {
      setReliquidando(false);
    }
  };

  /**
   * Por que NO se puede mover de estado, o `null` si se puede.
   *
   * Los dos 409 que el caso de uso tiene se saben **antes de pulsar**, porque
   * `LiquidacionResource.estado` viaja en la fila: una anulada no se mueve mas,
   * y al estado que ya tiene no hay movimiento que registrar. No hay ninguna
   * otra transicion prohibida —comprobado leyendo `CambiarEstadoDeLaLiquidacion`
   * entero: solo tiene esas dos guardas—, asi que el desplegable ofrece los
   * otros cuatro y no un camino.
   */
  const motivoParaNoMover: string | null =
    liquidacionElegida === null
      ? 'No hay ninguna liquidación elegida: el estado se mueve en una concreta, y se elige con «Elegir» en su fila de «Por acta».'
      : liquidacionElegida.estado === 'ANULADA'
        ? `${liquidacionElegida.numero} está anulada y no se mueve más. Corregir una anulada es reliquidar —otra versión—: si volviera a estar abierta, el papel que el contribuyente tiene en la mano diría una cosa y el sistema otra.`
        : campoDeEst('nuevoEstado') === ''
          ? 'Falta a qué estado pasa.'
          : campoDeEst('motivo').trim() === ''
            ? 'Falta el motivo del movimiento, que es lo que el historial enseña al lado de este paso. No es la observación.'
            : !observacionBastante(observacionDeEst)
              ? 'Falta la observación de quien registra, de al menos cinco caracteres.'
              : null;

  /**
   * Mueve la liquidacion de estado. **`PATCH` y aun asi no actualiza nada**:
   * inserta un movimiento, y el estado se DERIVA del ultimo. Por eso no es una
   * excepcion a la regla 4.
   */
  const moverDeEstado = async () => {
    if (motivoParaNoMover !== null || liquidacionElegida === null) return;
    setMoviendo(true);
    setFalloDeEst(null);
    try {
      const fecha = campoDeEst('fecha');
      const movida = await cambiarEstadoDeLaLiquidacion(liquidacionElegida.numero, {
        observacion: observacionDeEst.trim(),
        nuevoEstado: campoDeEst('nuevoEstado'),
        motivo: campoDeEst('motivo').trim(),
        fecha: fecha === '' ? undefined : fecha,
      });
      setEst({});
      setObservacionDeEst('');
      /* La copia elegida se refresca con lo que el servidor devuelve, no con lo
         que se pidio: el estado es lo que se DERIVA del historial, y leerlo de
         la respuesta es lo unico que garantiza que el desplegable de al lado
         deje de ofrecer el que ya tiene. */
      setLiquidacionElegida(movida);
      /* Las dos lecturas de esta pantalla cambian con el movimiento: la grilla
         enseña el estado derivado y el historico enseña el movimiento nuevo. */
      resultados.reintentar();
      historico.reintentar();
      toast(`${movida.numero} pasa a ${etiquetaDelEstadoDeLiquidacion(movida.estado)}.`);
    } catch (error) {
      setFalloDeEst(error instanceof ErrorDeApi ? error.mensaje : 'no hubo respuesta del servidor');
    } finally {
      setMoviendo(false);
    }
  };

  /* ── El historico del proceso (AC 5 de #49) ─────────────────── */
  const [paginaHist, setPaginaHist] = useState(0);
  /**
   * Con una liquidacion elegida, el **proceso entero de su acta**; sin ella, la
   * grilla paginada de todas las versiones.
   *
   * Las dos las sirve el mismo endpoint y la diferencia la hace `nLiquidacion`,
   * que es exactamente lo que el controlador dice de si mismo: con el numero
   * devuelve «todas sus versiones en orden, cada una con lo que cambio respecto
   * de la anterior»; sin el, «cada fila es una version suelta y su diferencia se
   * pide abriendo el proceso». Por eso `cambios` sale vacio en el listado y con
   * contenido al elegir una: no es que falte el dato, es que son dos preguntas.
   */
  const historico = useRecurso(
    (senal) => listarHistorico({ nLiquidacion: elegida ?? undefined }, { pagina: paginaHist, tamano: TAMANO_DE_PAGINA }, senal),
    [paginaHist, elegida],
    dest === 'resultados' && resTab === 2,
  );
  useEffect(() => setPaginaHist(0), [elegida]);

  /* ── La resolucion de determinacion, por su numero (#593) ───── */
  /**
   * El numero se TECLEA, y no es una comodidad: es que no lo lista nadie.
   *
   * `GET /fiscalizacion/resultados` —la grilla de al lado— publica el numero de
   * la LIQUIDACION (`LIQ-2026-000001`) y no el de la resolucion que la
   * transfirio (`RDF-2026-000001`); el contrato no declara ninguna otra ruta
   * bajo `/fiscalizacion/resoluciones`, y la unica respuesta del sistema que
   * trae ese numero es la del `POST /fiscalizacion/transferencias` que la
   * dicta, que esta pantalla no puede hacer. Medido con la cadena entera
   * sembrada en la municipalidad 1.
   *
   * De donde sale, entonces: del papel notificado. Es el numero que el
   * contribuyente trae escrito cuando viene a reclamar dentro de los veinte
   * dias del art. 137, que es exactamente cuando ventanilla necesita esta hoja.
   */
  const [numeroResolucion, setNumeroResolucion] = useState('');
  const numeroResolucionReposado = useRebote(numeroResolucion.trim());
  const resolucion = useRecurso(
    (senal) => leerResolucion(numeroResolucionReposado, senal),
    [numeroResolucionReposado],
    /* Con la caja vacia NO se pide nada, y eso es lo que deja la hoja sin una
       sola cifra: `useRecurso` inactivo deja `datos` en `null`, y de `null` no
       sale ningun numero que pintar. La guarda no esta en el dibujo, esta en la
       lectura. */
    esResolucion && numeroResolucionReposado !== '',
  );
  /**
   * La resolucion leida, y **solo** la que esta escrita ahora mismo.
   *
   * No lleva ninguna guarda propia, y **eso se midio antes de quitarla**: la
   * version anterior era `numeroResolucionReposado === '' ? null :
   * resolucion.datos`, se muto a `resolucion.datos` a secas y **no cambio
   * nada** —borrar la caja seguia llevandose la hoja entera—. Quien lo hace es
   * `useRecurso`: con `activo` en falso su efecto pone `datos` en `null`, y al
   * cambiar de pregunta lo limpia antes de pedir. Una guarda que no puede
   * fallar no protege nada, asi que la que sujeta la hoja es la de la lectura,
   * cinco lineas mas arriba, y es la que hay que mutar para comprobarla.
   */
  const laResolucion = resolucion.datos;

  /* ── Acta: la tabla de contraste ─────────────────────────────
     Lo declarado sale de la fila leida y no de una constante: la unica
     caracteristica con lado declarado publicado es el area de terreno
     (`MuestraResource.areaDeclarada`), y es la foto del dia del sorteo. Las
     otras seis dicen «—» en las dos columnas de comparacion, porque decir «sin
     cambio» seria afirmar que lo verificado coincide con lo declarado sin haber
     leido lo declarado de ninguna parte (#702).

     <h2>La resta de esta columna NO es la diferencia que se registra</h2>

     Es la resta de lo que quien atiende **acaba de teclear** contra lo
     declarado, y sirve para verla mientras se teclea: el servidor no puede
     calcularla porque todavia no ha recibido nada. La que queda registrada la
     deriva `ComparacionHalladoDeclarado` al liquidar, y **no es la misma
     cuenta**: alli una diferencia negativa se recorta a cero —«declaro de mas»
     no es un hallazgo contra el contribuyente— y la condicion sale de comparar
     las dos superficies, no de esta casilla. Por eso la franja de abajo dice de
     quien es cada cosa, y por eso el signo negativo se dibuja tal cual en vez de
     recortarse aqui: esconderlo le quitaria a quien mide el unico aviso de que
     ha apuntado menos de lo declarado, que suele ser una errata de tecleo. */
  const contraste = useMemo(() => {
    let hayDif = false;
    const filas = DIFF.map((r) => {
      const valor = String(vals[r.k] === undefined ? DEFECTOS[r.k] : vals[r.k]);
      const decl = declaradoDe(r.k);
      let dif = '—';
      let cambio = false;
      if (decl === '' || valor.trim() === '') {
        return { r, decl, valor, dif: SIN_DATO, cambio: false };
      }
      if (r.n) {
        const a = parseFloat(decl.replace(/,/g, '')) || 0;
        const b = parseFloat(valor.replace(/,/g, '.')) || 0;
        const delta = b - a;
        cambio = Math.abs(delta) > 0.001;
        dif = cambio ? (delta > 0 ? '+' : '') + delta.toFixed(2) + r.u : 'sin cambio';
      } else {
        /* `equalsIgnoreCase` es como lo compara el backend, asi que aqui
           tambien: decir «distinto» de «Casa habitacion» contra «CASA
           HABITACION» seria anunciar un hallazgo que el servidor no va a
           derivar. Las tildes SI cuentan, en los dos sitios. */
        cambio = valor.trim().toLocaleUpperCase() !== decl.trim().toLocaleUpperCase();
        dif = cambio ? 'distinto' : 'sin cambio';
      }
      if (cambio) hayDif = true;
      return { r, decl, valor, dif, cambio };
    });
    return { filas, hayDif };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals, filaDelActa]);

  const pasoIdx = Math.min(paso, PASOS_ACTA.length - 1);
  const pasoActual = PASOS_ACTA[pasoIdx];

  /* Lo que va a pasar al cerrar el acta se deriva de lo que el fiscalizador
     acaba de decidir y de lo que el acto HACE, medido en
     `RegistrarActaFiscalizacion`. Escrito a mano prometia dos cosas falsas: un
     importe de determinacion de la captura del artboard (#702) y que el acta
     «actualiza la ficha catastral del predio», que es justo lo contrario de lo
     que el caso de uso dice de si mismo —«trabaja sobre una copia: no toca
     ninguna fila de catastro» (AC de #45)—. */
  const ICONO_OK: CSSProperties = { display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', background: 'var(--ok-bg)', color: 'var(--ok-fg)' };
  const ICONO_NEU: CSSProperties = { display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', background: 'var(--accent-soft)', color: 'var(--accent-ink)' };
  /* Lo que FALTA no lleva visto. Los tres estilos dibujaban el mismo icono
     —`ICO.visto`— y solo cambiaba el color, asi que «El hallazgo queda por
     elegir, y el acta no se manda sin el» salia con una marca de hecho al lado:
     un acuse de exito sobre una frase que dice lo contrario, que es el defecto
     que #547 midio con el toast del conjunto sin sellar. */
  const ICONO_FALTA: CSSProperties = { display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', background: 'var(--warn-bg)', color: 'var(--warn-fg)' };

  const consecuencias = useMemo(() => {
    const hallazgo = String(vals.hallazgo === undefined ? DEFECTOS.hallazgo : vals.hallazgo);
    const out: { titulo: string; detalle: string; valor: string; iconoStyle: CSSProperties }[] = [
      {
        titulo: 'Se registra el acta, y es irreversible',
        detalle:
          'Un acta cerrada no se edita ni se borra: se anula y se levanta otra (regla 4). Su identificador interno lo pone el servidor.',
        valor: '',
        iconoStyle: ICONO_OK,
      },
      {
        titulo:
          hallazgo === ''
            ? 'El hallazgo queda por elegir, y el acta no se manda sin él'
            : 'El acta afirma el hallazgo ' + hallazgo,
        detalle:
          hallazgo === ''
            ? 'Un acta sin hallazgo se liquidaría como conforme, que es decir que la visita no encontró nada. El servidor la rechaza y esta pantalla también.'
            : 'Es lo que la persona anota. La CONDICIÓN la deriva después la liquidación comparando las superficies, y puede no coincidir: un acta puede decir CONFORME sobre un predio cuya área hallada supera la declarada, y la liquidación lo clasificará SUBVALUADOR igual.',
        valor: '',
        iconoStyle: hallazgo === '' ? ICONO_FALTA : ICONO_OK,
      },
      {
        titulo: 'El predio pasa a «Inspeccionado» en la muestra',
        detalle: 'No es una columna que se escriba: se deriva de que exista un acta de ese predio en ese programa.',
        valor: '',
        iconoStyle: ICONO_OK,
      },
      {
        titulo: 'Queda copiada la versión de ficha que regía el día de la visita',
        detalle:
          'Para que comparar lo hallado contra lo declarado siga dando lo mismo dentro de diez años (RNF-075). Si el predio no tiene ficha, el acta queda sin ella y lo dice.',
        valor: '',
        iconoStyle: ICONO_NEU,
      },
      {
        titulo: 'No se toca el padrón catastral',
        detalle:
          'El acta trabaja sobre una copia: no escribe ninguna fila de catastro ni versiona la ficha del predio. Corregir el padrón es otro acto, y lo hace la transferencia a rentas.',
        valor: '',
        iconoStyle: ICONO_NEU,
      },
      {
        titulo: 'No se determina ninguna deuda todavía',
        /* Aqui decia «S/ 1,842.60» de determinacion y «S/ 267.50» de multa, las
           dos de la captura del artboard y presentadas como el resultado de un
           acto que se acababa de ejecutar (#702). Los importes los calcula el
           backend al liquidar, con los valores del ejercicio sellado; esta
           pantalla no compone dinero (RNF-083). */
        /* Decia «Liquidar y emitir la resolucion de determinacion … se hace
           en «Resultados»», y de las dos mitades **la primera era falsa y la
           segunda lo sigue siendo**: en «Resultados» no habia ningun formulario
           de liquidacion —las tres escrituras del contrato no las nombraba ni
           una linea de esta interfaz—, asi que el acta mandaba a un sitio donde
           no se podia hacer nada. Liquidar ya se puede; emitir la resolucion es
           `POST /fiscalizacion/transferencias`, que sigue sin pantalla porque
           pide cuatro campos —nº de liquidacion, documento de sustento,
           sustento y base legal— que ningun catalogo dibuja. Se dicen por
           separado, que es lo que las hace comprobables. */
        detalle:
          'Liquidar es otro acto y otra pantalla: se hace en «Resultados», eligiendo esta acta y su periodo fiscalizado. Emitir la resolución de determinación todavía no se puede desde ninguna pantalla. Los importes no salen de aquí.',
        valor: SIN_DATO,
        iconoStyle: ICONO_NEU,
      },
    ];
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals]);

  /* ── Cabecera ──────────────────────────────────────────────── */
  const destino = m.destinos.find((x) => x.k === dest);
  const miga = esActa
    ? ['Fiscalización', 'Actas']
    : esResolucion
      ? ['Fiscalización', 'Documentos']
      : ['Fiscalización', destino?.label ?? 'Fiscalización'];
  /* Decia «Acta ACT-2026-00418», un numero que no existe en ninguna
     municipalidad (#702). Y sigue sin nombrar ninguna aunque haya fila elegida:
     el numero de un acta lo pone el servidor al registrarla, asi que hasta
     entonces no hay ninguno que poner en el h1. El predio sobre el que se
     levanta si esta, en la barra de contexto de debajo. */
  const titulo = esActa
    ? 'Acta de inspección'
    : esResolucion
      ? 'Resolución de determinación'
      : (destino?.label ?? 'Fiscalización');

  const paleta = OPCIONES.map((o) => ({ label: o[0], nota: 'Fiscalización', ir: () => onDest(o[1]) }));

  /**
   * Avanza el asistente, y **nada mas**.
   *
   * En el ultimo paso hacia tres cosas y las tres eran falsas: se daba el
   * formulario por limpio (`setSucio(false)`), se navegaba a «Resultados» como
   * si el acta hubiera quedado registrada, y se anunciaba «Acta cerrada.
   * Determinacion por S/ 1,842.60 lista para emitir» — **una cifra de dinero de
   * la maqueta presentada como el resultado de un acto que se acababa de
   * ejecutar** (#702). Ninguna peticion salia al servidor.
   *
   * Ahora el ultimo paso no tiene boton que llame aqui: «Cerrar acta» esta
   * apagado con su motivo, como sus dos vecinos.
   */
  const adelante = () => {
    if (pasoIdx >= PASOS_ACTA.length - 1) return;
    setPaso(pasoIdx + 1);
    setSucio(true);
  };

  const filtroDe = (label: string, porOmision: string) => filtros[detTab + ':' + label] ?? porOmision;

  return (
    <Shell
      modulo="fiscalizacion"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      contexto={
        esActa
          ? {
              volver: {
                label: 'Muestra',
                /* Vuelve a la muestra CONSERVANDO el programa que se estaba
                   mirando: `onDest` borra el sujeto a proposito, asi que aqui se
                   elige el programa antes de irse. Sin eso, volver desde el acta
                   dejaba la lista en el primer programa de la pagina, que puede
                   no ser el que la produjo. */
                onClick: () => {
                  if (programaDelActa !== null) setPrograma(programaDelActa.id);
                  onDest('programas');
                },
              },
              /* Los tres eran de la captura: el predio `02-014-D-14-01`,
                 «MEDINA MEDINA, RUFINA (SUC.)» y «CALLE SANTA ROSA 116 ·
                 programa PF-2026-014 · riesgo alto» (#702). Ahora salen de la
                 fila de la muestra que la pantalla acaba de leer, y con la red
                 cortada vuelven a decir que no hay ninguna. */
              codigo: filaDelActa?.codRefCatastral ?? SIN_DATO,
              titular:
                filaDelActa === null
                  ? 'Sin predio elegido'
                  : (filaDelActa.titular ?? 'Sin titular vigente'),
              ubic:
                filaDelActa === null || programaDelActa === null
                  ? 'El acta se levanta sobre un predio de la muestra: elige su fila en «Programas»'
                  : 'Programa ' +
                    programaDelActa.codigo +
                    ' · sector ' +
                    (filaDelActa.sector ?? SIN_DATO) +
                    ' · condición del cruce ' +
                    etiquetaDeCondicion(filaDelActa.condicion) +
                    ' al ' +
                    filaDelActa.fechaSorteo,
              /* Decia «Borrador guardado 10:52» EN VERDE, que es un acuse de
                 exito de algo que no ha pasado nunca: nada de esta pantalla se
                 guarda en ningun sitio —el propio boton «Guardar borrador»
                 esta apagado dos secciones mas abajo diciendo exactamente
                 eso—, y la hora salia de la captura del artboard. Con el aviso
                 de #599 al lado la contradiccion queda a la vista, asi que la
                 insignia pasa a decir lo que hay: hay algo escrito y no esta
                 guardado, o no hay nada escrito y el acta no esta registrada.
                 Ni verde, ni hora. */
              estado:
                actaRegistrada !== null
                  ? 'Acta registrada · interno ' + String(actaRegistrada.id)
                  : sucio
                    ? 'Sin registrar, con cambios'
                    : 'Acta sin registrar',
              estadoColor:
                actaRegistrada !== null ? 'var(--ok-fg)' : sucio ? 'var(--warn-fg)' : 'var(--ink-3)',
            }
          : undefined
      }
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Fiscalización no son ocho pantallas: es un embudo. Se detecta una diferencia probable, se programa la visita, se levanta el
              acta, se determina la deuda omitida y se notifica. El módulo se ordena por esas cinco etapas.
            </p>

            {programas.error !== null && (
              <FalloDeLectura error={programas.error} que="los programas de fiscalización" acceso="fisc_programa" alReintentar={programas.reintentar} />
            )}

            <section style={TARJETA}>
              <div style={CABECERA}>
                {/* La cabecera nombraba «Programa PF-2026-014 · predial
                    selectivo, sector 02» y su plazo «17/08 — 30/09». Ese
                    programa no existe: `programa_fiscalizacion` tiene cero filas
                    en las dos municipalidades (#546). */}
                <h2 style={H2}>
                  {programaActivo === null
                    ? 'El embudo de un programa'
                    : `Programa ${programaActivo.codigo} · ${programaActivo.descripcion}`}
                </h2>
                <span style={META}>
                  {programaActivo === null ? SIN_DATO : programaActivo.fechaInicio + ' — ' + (programaActivo.fechaFin ?? SIN_DATO)}
                </span>
              </div>

              <button
                onClick={() => onDest('deteccion')}
                className="hov-acento"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  textAlign: 'left',
                  border: 0,
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                  padding: '12px 16px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)', flex: '0 0 auto' }}>
                  Entrada
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>Detectados por el cruce de catastro contra rentas</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                    Otro conjunto: de aquí se elige la muestra de cada programa. No es una etapa del embudo.
                  </span>
                </span>
                {/* «3,418» era del artboard. El universo del cruce lo cuenta la
                    deteccion, y su total NO se puede traer aqui sin repetir una
                    consulta que en el padron real tarda 8,5 s (#561). */}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-3)' }}>{SIN_DATO}</span>
                <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={FLECHA} />
              </button>

              {etapasDelEmbudo(
                muestra.datos?.totalElementos ?? null,
                inspeccionadas.datos?.totalElementos ?? null,
                liquidadas.datos?.totalElementos ?? null,
                notificadas.datos?.totalElementos ?? null,
              ).map(
                (e, i) => (
                  <button
                    key={e.etapa}
                    onClick={() => onDest(e.dest)}
                    className="hov-acento"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      textAlign: 'left',
                      border: 0,
                      borderBottom: '1px solid var(--line)',
                      background: 'transparent',
                      padding: '13px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        flex: '0 0 auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11.5,
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-ink)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ flex: '0 0 190px', minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{e.etapa}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{e.detalle}</span>
                    </span>
                    {/* La barra solo se dibuja cuando su cifra Y su base son
                        dos lecturas. Sin las dos no hay proporcion que pintar, y
                        una barra a medias se lee como un avance. */}
                    <span style={{ flex: 1, minWidth: 50, height: 22, borderRadius: 5, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                      {e.parte !== null && (
                        <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${e.parte.toFixed(1)}%`, background: 'var(--accent)', opacity: 0.42 + i * 0.15 }} />
                      )}
                    </span>
                    <span style={{ flex: '0 0 46px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {e.parte === null ? SIN_DATO : `${e.parte.toFixed(0)} %`}
                    </span>
                    <span style={{ flex: '0 0 62px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                      {e.valor === null ? SIN_DATO : e.valor}
                    </span>
                    <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={FLECHA} />
                  </button>
                ),
              )}

              <div style={{ padding: '11px 16px' }}>
                <Aviso tono="warn" titulo="El embudo se lee a trozos, y hay que decir cuáles">
                  {/* #505: «el embudo pide nueve cifras y el contrato publica
                      dos». Con #599 son cuatro las que se leen —la muestra, las
                      actas y los dos totales de resultados—, y las cuatro
                      etapas del embudo quedan cubiertas. Lo que sigue fuera es
                      «Detectados», que no es una etapa sino la cabecera. */}
                  Las cuatro etapas son cuatro consultas distintas, cada una leída del total de su sobre y ninguna compuesta aquí.
                  «Inspeccionados» cuenta <strong>actas</strong> del programa, que desde <code>V76</code> se pueden listar (#599): no es lo
                  mismo que «predios visitados» —la muestra publica <code>visitado</code> fila a fila y sigue sin recuento—, y un predio
                  revisitado tiene dos actas, así que la barra puede pasar del 100 %. «Detectados» no se trae: sería repetir una consulta
                  que en el padrón real tarda 8,5 s (#561). Issues #505, #546 y #599.
                </Aviso>
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {/* Las cuatro tarjetas del artboard eran «84 de 96», «63.5 %»,
                  «S/ 214,882» y «3 reclamadas», y ninguna de las cuatro se puede
                  leer: no hay recuento de actas, la efectividad es un cociente
                  que nadie publica ni define, el importe es D-02a (#198) y
                  `EstadoDeLiquidacion` no tiene ningun estado «reclamada». Las
                  cuatro se sustituyen por cuatro totales que SI son lecturas. */}
              {[
                { valor: programas.datos?.totalElementos ?? null, etiqueta: 'Programas registrados', nota: 'Los que devuelve la consulta de programas.' },
                { valor: muestra.datos?.totalElementos ?? null, etiqueta: 'Predios en la muestra', nota: 'Del programa que está seleccionado arriba.' },
                { valor: liquidadas.datos?.totalElementos ?? null, etiqueta: 'Liquidaciones', nota: 'Actas de ese programa que llegaron a liquidarse.' },
                { valor: notificadas.datos?.totalElementos ?? null, etiqueta: 'Notificadas', nota: 'Las mismas, con el filtro de estado NOTIFICADA.' },
              ].map((k) => (
                <div key={k.etiqueta} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>
                    {k.valor === null ? SIN_DATO : k.valor}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                {/* «Tu ruta de hoy» eran tres predios con direccion, riesgo y
                    hora —10:00, 11:30, 15:00— y no hay ninguna operacion de
                    ruta: ni de hoy, ni de nadie. Lo que si se puede leer es que
                    de la muestra de este programa estas filas siguen sin acta. */}
                <h2 style={H2}>Pendientes de visita</h2>
                <span style={META}>
                  {muestra.datos === null ? SIN_DATO : `${pendientesDeVisita(muestra.datos.contenido).length} en esta página de la muestra`}
                </span>
              </div>

              {muestra.error !== null && (
                <div style={{ padding: '12px 16px' }}>
                  <FalloDeLaMuestra error={muestra.error} reintentarMuestra={muestra.reintentar} recargarProgramas={programas.reintentar} />
                </div>
              )}

              {pendientesDeVisita(muestra.datos?.contenido ?? []).map((f) => (
                <div
                  key={String(f.predioId) + '·' + String(f.contribuyenteId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--line)', padding: '13px 16px' }}
                >
                  <Insignia tono={tonoDeCondicion(f.condicion)}>{etiquetaDeCondicion(f.condicion)}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{f.codRefCatastral}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                      {f.titular ?? 'Sin titular vigente'} · sector {f.sector ?? SIN_DATO}
                    </span>
                  </span>
                  {/* Ni hora ni riesgo: la muestra no publica ninguno de los
                      dos, y la hora del artboard era la de una visita inventada. */}
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: '0 0 auto' }}>sorteado {f.fechaSorteo}</span>
                </div>
              ))}

              {programaActivo === null ? (
                <div style={{ padding: '11px 16px' }}>
                  <Aviso tono="neutro" titulo="No hay ningún programa">
                    Sin programa no hay muestra, y sin muestra no hay a quién visitar. Un programa se registra con{' '}
                    <code>POST /fiscalizacion/programas</code>, y esta interfaz todavía no dibuja ese formulario. Issue #550.
                  </Aviso>
                </div>
              ) : muestra.cargando ? (
                <p style={PIE}>Consultando la muestra…</p>
              ) : muestra.error === null && pendientesDeVisita(muestra.datos?.contenido ?? []).length === 0 ? (
                <div style={{ padding: '11px 16px' }}>
                  <Aviso tono="neutro" titulo="Nada pendiente en esta página">
                    Ninguna fila de esta página de la muestra está sin visitar. No hay operación que cuente las pendientes del programa
                    entero: <code>visitado</code> viaja fila a fila. Issue #546.
                  </Aviso>
                </div>
              ) : null}
            </section>
          </div>
        )}

        {/* ══════════ DETECCIÓN ══════════ */}
        {dest === 'deteccion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              De aquí salen los programas. Dos fuentes: el cruce de catastro contra rentas —predios con ficha y sin declaración, o declarados
              por debajo— y el cruce del padrón vehicular contra SUNARP, SUNAT y MTC.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {['Predial — omisos y subvaluadores', 'Vehicular — cruce registral'].map((l, i) => {
                const on = detTab === i;
                return (
                  <button
                    key={l}
                    onClick={() => {
                      setDetTab(i);
                      setMarcadas({});
                    }}
                    aria-pressed={on}
                    style={{
                      border: 0,
                      borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
                      background: 'transparent',
                      padding: '11px 3px',
                      marginBottom: -1,
                      cursor: 'pointer',
                      fontSize: 13.5,
                      color: on ? 'var(--ink)' : 'var(--ink-3)',
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {l}
                  </button>
                );
              })}
              {/* El cruce predial NO es un lote nocturno: `DeteccionDeOmisos`
                  resuelve el padron contra las declaraciones del ejercicio en
                  la propia peticion, a la fecha de hoy. «Actualizacion diaria»
                  —lo que decia el prototipo— prometia una foto reciente que
                  nadie toma, y con ella la excusa de que un predio que falta
                  «entrara mañana». */}
              <span data-sm-hide="1" style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>
                {detTab === 0
                  ? 'Cruce de catastro contra las declaraciones del ejercicio, resuelto al consultar'
                  : /* «última importación 11/08/2026» es una fecha del artboard: no
                       hay importacion ninguna, porque no hay cruce. */
                    'Cruce del padrón vehicular contra SUNARP, SUNAT y MTC — sin operación todavía'}
              </span>
            </div>

            <section style={TARJETA}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                  gap: '14px 16px',
                  padding: '15px 16px',
                  alignItems: 'end',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                {detTab === 0 ? (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Sector</span>
                      <input
                        value={sectorDet}
                        onChange={(e) => setSectorDet(e.target.value)}
                        placeholder="01"
                        style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Condición</span>
                      <select
                        value={condicionDet}
                        onChange={(e) => setCondicionDet(e.target.value)}
                        style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                      >
                        <option value="">Todas</option>
                        {/* Los CINCO del enumerado, no dos. El desplegable
                            ofrecia OMISO y SUBVALUADOR, y la consulta acepta
                            los cinco: quien buscara un predio no ubicado no
                            tenia como pedirlo. */}
                        {CONDICIONES.map((c) => (
                          <option key={c.valor} value={c.valor}>
                            {c.valor}
                          </option>
                        ))}
                      </select>
                    </label>
                    {/* El orden no es un desplegable: se pide desde la
                        cabecera de la columna, que es donde se ve por que se
                        esta ordenando. Lo que este parrafo dice es lo que NO se
                        puede ordenar, porque un campo del manual que falta sin
                        explicacion se lee como un descuido (#608). */}
                    <p style={{ margin: 0, gridColumn: '1 / -1', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      El orden se pide pulsando la cabecera de la columna, no con un desplegable. Se puede ordenar por código de referencia
                      catastral, por sector y por diferencia de área. De los tres campos que el manual propone en su «Ordenar por» sólo
                      queda sector: «impuesto omitido» y «diferencia de valor» son importes, y llegan sin cifra en todas las filas mientras
                      no se pueda valorizar un predio (D-02a), así que ordenar por ellos no movería nada.
                    </p>
                  </>
                ) : (
                  <>
                    {/* Los tres filtros del cruce registral se dibujan y NO se
                        pueden usar: no hay ninguna operacion que los reciba, asi
                        que un desplegable vivo prometeria una busqueda que no se
                        hace. Mismo trato que los filtros bloqueados de #322. */}
                    {detAct.filtros.map((f) => (
                      <label key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.label}</span>
                        <select
                          disabled
                          value={filtroDe(f.label, f.valor)}
                          onChange={(e) => setFiltros((s) => ({ ...s, [detTab + ':' + f.label]: e.target.value }))}
                          title="El cruce registral no tiene ninguna operación en el backend: no hay nada que filtrar."
                          style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5, opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          {f.opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <p style={{ margin: 0, gridColumn: '1 / -1', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Los tres filtros están bloqueados: no hay ninguna operación del cruce registral en el contrato, así que no hay nada
                      que filtrar.
                    </p>
                  </>
                )}
              </div>
              {/* Una lectura que falla NO es una tabla vacia: sin esto, un 403
                  sobre `fisc_omisos` y una red caida se dibujan los dos como
                  «este ejercicio no tiene omisos», que es la lectura contraria
                  a la verdadera. */}
              {detTab === 0 && omisos.error !== null && (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <FalloDeLectura error={omisos.error} que="la detección de omisos" acceso="fisc_omisos" alReintentar={omisos.reintentar} />
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: detTab === 0 ? ANCHO_MINIMO_DE_OMISOS : detAct.min }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />
                      {/* Las dos cabeceras se escriben por separado y no con un
                          ternario dentro de `cols`: son dos tablas distintas y
                          solo una admite orden. La de la deteccion ofrece las
                          TRES columnas que el backend deja ordenar —cada una lo
                          declara en `COLUMNAS_DE_OMISOS`— y la del cruce
                          vehicular ninguna, porque no hay operacion que la
                          sirva. */}
                      {detTab === 0 ? (
                        <Cabeceras cols={COLUMNAS_DE_OMISOS} orden={{ activo: ordenDet, alternar: alternarOrdenDet }} />
                      ) : (
                        <Cabeceras cols={sinOrden(detAct.cols)} />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filasVisibles.map((f) => {
                      const on = marcadas[f.llave] === true;
                      return (
                        /* La clave es la IDENTIDAD de la fila, y desde #545 esa
                           identidad es el predio: el codigo de referencia
                           catastral basta y es unico (medido en `filasDeOmisos`;
                           `predio_codigo_uq` lo garantiza). El indice no valia, y
                           ese era el defecto original: marcar la fila 3 y pasar
                           de pagina dejaba marcada a otra persona. */
                        <tr key={f.llave} className="hov-elev" style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => setMarcadas((x) => ({ ...x, [f.llave]: !on }))}
                              /* El nombre accesible sale del codigo predial y
                                 del titular, no de `celdas`: desde #545 esas dos
                                 celdas son componentes y no cadenas, y
                                 concatenarlas daria «[object Object]». Un predio
                                 sin titular vigente lo dice, que es justo lo que
                                 hay que oir antes de marcarlo. */
                              aria-label={'Seleccionar el predio ' + f.llave + ' de ' + (f.titular ?? 'ningún titular vigente')}
                              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                            />
                          </td>
                          {/* La celda 2 —el titular con su codigo debajo— es la
                              unica de dos lineas, asi que es la unica que
                              necesita envolver. Era la 1 hasta que «Sector» se
                              metio delante (#608). */}
                          <Celdas fila={f.celdas} cols={CELDAS_DE_OMISOS} envuelve={[2]} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Ni una tabla vacia en silencio ni un total que no es el que
                  parece. Los dos casos se dicen por separado. */}
              {detTab === 0 && omisos.error === null && (
                <EstadoDeLaDeteccion cargando={omisos.cargando} filas={filasDeOmisos.length} pagina={paginaDeOmisos} />
              )}
              {detTab === 0 && paginaDeOmisos !== null && (
                <Paginador pagina={paginaDeOmisos.pagina} totalPaginas={paginaDeOmisos.totalPaginas} hayMas={paginaDeOmisos.hayMas} ir={setPaginaDet} />
              )}
              {detTab === 1 && (
                <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                  <Aviso tono="neutro" titulo="El cruce registral todavía no se puede consultar">
                    No hay ninguna operación del cruce del padrón vehicular contra SUNARP, SUNAT y MTC: ni lectura ni filtros. Las cuatro
                    filas que el diseño dibuja aquí —cuatro placas, cuatro contribuyentes con nombre, un hallazgo y una deuda omitida cada
                    una— son la muestra del artboard, y no se enseñan: un importe puesto al lado de una placa es indistinguible de una deuda
                    de verdad en cuanto sale de la pantalla. Issues #546 y #504.
                  </Aviso>
                </div>
              )}

              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                {detAct.nota}
                {detTab === 0 && (
                  <>
                    {' '}
                    «Declaró fuera de plazo» sale como una segunda insignia al lado de la condición, y nunca como su color: declarar tarde no
                    convierte a nadie en omiso —es la multa del art. 176, no una determinación de oficio—. Hoy no aparece en ninguna fila
                    porque no hay ninguna declaración jurada presentada (#546), y sin declaración el cruce rotula «Omiso» por definición.
                  </>
                )}
              </p>
            </section>

            {/* Lo que sale de esta pantalla son sus FILTROS, no sus marcas
                (ADR-0023 §1).

                La muestra se sortea: la fila de `programa_muestra` copia la
                condicion del dia del sorteo y con eso contesta sola «¿por que
                me toco a mi?». Una seleccion a mano contesta «porque alguien te
                marco», que en una fiscalizacion de oficio no es una respuesta.
                Asi que las casillas se quedan —marcar sigue siendo util para
                revisar la pagina— y no viajan, y el boton lleva al alta del
                programa con el sector y la condicion ya puestos, que son dos de
                los tres parametros con los que ese programa sorteara.

                «Notificar esquela» SE HA RETIRADO, y no por descuido: ningun
                requisito la pide, el catalogo de opciones no la nombra, el
                contrato no declara ninguna ruta con esa palabra y el sistema no
                modela el acto —no hay tipo de documento para ella ni plazo suyo
                transcrito en el corpus, y este proyecto no inventa plazos
                (regla 5)—. Un boton apagado dice «esto llegara»; aqui no hay
                nada que llegue, asi que lo que quedaba era un rotulo del
                prototipo sin acto detras. Se nombra en el aviso para que su
                ausencia no se lea como un descuido, que es la leccion de #608
                con las columnas que el manual propone y no se pueden ordenar. */}
            <Aviso tono="neutro" titulo="Lo que se lleva de aquí son los filtros, no los predios marcados">
              La muestra de un programa se <em>sortea</em>: se aplica al padrón el ejercicio, el sector y el criterio que el propio programa
              declara, y la fila que sale copia la condición de ese día, que es lo que contesta «por qué me tocó a mí». Por eso los predios
              marcados no viajan —marcar sirve para revisar esta página— y lo que el botón se lleva son el sector y la condición de arriba,
              al formulario que registra el programa. «Notificar esquela» ya no está: no hay ninguna operación de esquela en el contrato, ni
              tipo de documento, ni plazo transcrito con el que decir para cuándo, así que era un rótulo sin acto detrás. ADR-0023, issue
              #550.
            </Aviso>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {marcadasN === 0
                  ? 'Marca los registros que quieras anotar. La marca no sale de esta pantalla.'
                  : marcadasN + (marcadasN === 1 ? ' registro marcado' : ' registros marcados') + ' en esta página. La marca no viaja.'}
              </p>
              {/* Solo en el predial: el cruce vehicular no tiene lectura, asi
                  que sus dos desplegables estan bloqueados y no hay ningun
                  filtro que llevarse. */}
              {detTab === 0 && (
                <button
                  onClick={programarConLosFiltrosDeLaDeteccion}
                  style={{ border: 0, borderRadius: 7, background: 'var(--accent)', color: '#fff', padding: '11px 22px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
                >
                  {/* El rotulo dice lo que hace. «Programar fiscalizacion» a
                      secas, con N marcados al lado, se lee como «programa estos
                      N» — que es exactamente lo que el toast anterior afirmaba
                      sin mandar una sola peticion. */}
                  Programar con estos filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════ PROGRAMAS ══════════ */}
        {dest === 'programas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Un programa es una muestra, un fiscalizador y un plazo. Mientras esté en ejecución, todo lo que se levanta en campo cuelga de
              él.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>Programas</h2>
                  {/* El recuento sale del sobre, no de la longitud de la lista:
                      «3» era el numero de programas del artboard. */}
                  <span style={META}>{programas.datos === null ? SIN_DATO : programas.datos.totalElementos}</span>
                </div>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                  <input
                    value={buscaPrograma}
                    onChange={(e) => setBuscaPrograma(e.target.value)}
                    placeholder="Nº de programa"
                    aria-label="Buscar por número de programa"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg-elev)', fontSize: 13 }}
                  />
                </div>

                {programas.error !== null && (
                  <div style={{ padding: '12px 14px' }}>
                    <FalloDeLectura error={programas.error} que="los programas de fiscalización" acceso="fisc_programa" alReintentar={programas.reintentar} />
                  </div>
                )}

                {programas.error === null && programas.cargando && (
                  <p style={{ ...PIE, borderBottom: '1px solid var(--line)' }}>Consultando los programas…</p>
                )}

                {programas.error === null && !programas.cargando && listaDeProgramas.length === 0 && (
                  <div style={{ padding: '12px 14px' }}>
                    <Aviso tono="neutro" titulo="Todavía no hay ningún programa">
                      {/* Los tres del artboard —PF-2026-014, PF-2026-011,
                          PF-2025-032, con sus «96 predios», «618 vehiculos» y
                          «1,412 predios»— no existen: `programa_fiscalizacion`
                          tiene cero filas en las dos municipalidades (#546). */}
                      La consulta contestó sin ninguno. Se registra el primero con «+ Nuevo programa», aquí abajo: pide código,
                      descripción, tipo y fecha de inicio, más el ejercicio y el criterio con los que sorteará su muestra.
                    </Aviso>
                  </div>
                )}

                {listaDeProgramas.map((prog) => {
                  const on = programaActivo?.id === prog.id;
                  return (
                    <button
                      key={prog.id}
                      onClick={() => setPrograma(prog.id)}
                      aria-current={on ? 'true' : undefined}
                      className="hov-acento"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        borderBottom: '1px solid var(--line)',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        background: on ? 'var(--accent-soft)' : 'transparent',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 4, padding: '2px 6px' }}>
                          {prog.codigo}
                        </span>
                        <Insignia tono={tonoDelEstadoDelPrograma(prog.estado)}>{etiquetaDelEstadoDelPrograma(prog.estado)}</Insignia>
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, textWrap: 'pretty' }}>{prog.descripcion}</span>
                      {/* Solo lo que el recurso publica. El pie del artboard
                          decia «96 predios · R. Mendoza Cruz · 17/08 — 30/09»,
                          y el tamaño de la muestra no viene en esta fila: hay
                          que preguntarselo a `/muestra`, que es otra consulta. */}
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                        {[prog.fiscalizador ?? SIN_DATO, prog.fechaInicio + ' — ' + (prog.fechaFin ?? SIN_DATO)].join(' · ')}
                      </span>
                    </button>
                  );
                })}

                <div style={{ padding: '11px 14px' }}>
                  {/* Ya no esta apagado: el formulario del alta existe y vive a
                      la derecha, donde hay sitio para sus ocho campos y su
                      observacion (#550, AC 4). Este boton solo lo abre y lo
                      cierra, asi que no escribe nada y no necesita motivo. */}
                  <button
                    onClick={() => {
                      setAltaAbierta((x) => !x);
                      setFalloDelAlta(null);
                    }}
                    aria-expanded={altaAbierta}
                    style={{ width: '100%', border: '1px dashed var(--line-2)', borderRadius: 7, padding: 9, background: 'transparent', fontSize: 12.5, color: 'var(--ink-3)', cursor: 'pointer' }}
                  >
                    {altaAbierta ? 'Cerrar el alta' : '+ Nuevo programa'}
                  </button>
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                {/* ── El alta de un programa (#550, AC 4) ──────────────────
                    `POST /fiscalizacion/programas` existia desde antes y no lo
                    alcanzaba ninguna pantalla. Aqui estan sus cinco campos
                    exigidos —codigo, descripcion, tipo, fecha de inicio y la
                    observacion— y los cuatro que el servidor llama opcionales,
                    de los que dos no lo son de hecho: sin ejercicio y sin
                    criterio el programa no puede sortear su muestra nunca, y no
                    hay ruta de edicion que se los añada despues. */}
                {altaAbierta && (
                  <section style={TARJETA}>
                    <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                      <h2 style={H2}>Nuevo programa</h2>
                      <span style={META}>{puedeRegistrarPrograma ? 'listo' : faltaDelAlta.filter((f) => !f.ok).length + ' sin llenar'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Código · obligatorio</span>
                        <input value={campoDelAlta('codigo')} onChange={(e) => fijarAlta('codigo', e.target.value)} placeholder="PF-2026-001" style={CAMPO} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, gridColumn: 'span 2' }}>
                        <span style={ROTULO}>Descripción · obligatoria</span>
                        <input
                          value={campoDelAlta('descripcion')}
                          onChange={(e) => fijarAlta('descripcion', e.target.value)}
                          placeholder="Qué se va a fiscalizar y por qué"
                          style={CAMPO}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Tipo · obligatorio</span>
                        {/* Los DOS que `TipoDePrograma` declara, y ninguno mas:
                            otro valor contesta «Tipo de programa desconocido».
                            La opcion vacia esta a proposito, para que el tipo
                            sea una eleccion y no lo que quedo dibujado. */}
                        <select value={campoDelAlta('tipo')} onChange={(e) => fijarAlta('tipo', e.target.value)} style={CAMPO}>
                          <option value="">Elegir…</option>
                          <option value="PREDIAL">PREDIAL</option>
                          <option value="VEHICULAR">VEHICULAR</option>
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Fecha de inicio · obligatoria</span>
                        <input type="date" value={campoDelAlta('fechaInicio')} onChange={(e) => fijarAlta('fechaInicio', e.target.value)} style={CAMPO} />
                      </label>
                    </div>

                    <div style={{ padding: '12px 16px 4px' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>Con qué va a sortear su muestra</p>
                      <p style={{ margin: '4px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                        El servidor admite los cuatro en blanco. Esta pantalla pide los tres primeros de todas formas: un programa al que
                        le falte cualquiera de ellos <strong>no puede sortear su muestra nunca</strong> —contesta «El programa no declara
                        &apos;ejercicio&apos;, y sin él no se puede sortear su muestra», y lo mismo del criterio y del fiscalizador— y no hay
                        ninguna ruta de edición que se los añada después: reprogramar es registrar otro. Sólo el sector es de verdad
                        opcional: en blanco, el sorteo mira el distrito entero.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, padding: '12px 16px 14px', borderBottom: '1px solid var(--line)' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Ejercicio</span>
                        <input value={campoDelAlta('ejercicio')} onChange={(e) => fijarAlta('ejercicio', e.target.value)} placeholder="2026" style={CAMPO} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Criterio de riesgo</span>
                        {/* Los cinco de `CondicionFiscalizada`, y **ninguna
                            opcion «Todas»**: en la deteccion «Todas» es «sin
                            filtro», y aqui el servidor la rechaza diciendo que
                            no es un criterio sino la ausencia de uno
                            (ADR-0023 §2). Ofrecerla seria dibujar un 422 de ida
                            y vuelta. */}
                        <select value={campoDelAlta('criterio')} onChange={(e) => fijarAlta('criterio', e.target.value)} style={CAMPO}>
                          <option value="">Elegir…</option>
                          {CONDICIONES.map((c) => (
                            <option key={c.valor} value={c.valor}>
                              {c.valor}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Fiscalizador</span>
                        <input value={campoDelAlta('fiscalizador')} onChange={(e) => fijarAlta('fiscalizador', e.target.value)} style={CAMPO} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Sector · opcional</span>
                        <input value={campoDelAlta('sector')} onChange={(e) => fijarAlta('sector', e.target.value)} placeholder="Todos" style={CAMPO} />
                      </label>
                    </div>

                    {/* Lo que falta, DIBUJADO. Un boton apagado no recibe el
                        foco, asi que su `title` no lo lee un lector de pantalla
                        (RNF-082): quitar esta lista deja la pantalla sin decir
                        por que no se puede registrar. */}
                    <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                      <p style={{ ...H2, margin: 0, fontSize: 14 }}>Qué falta para poder registrarlo</p>
                    </div>
                    {faltaDelAlta.map((r) => (
                      <div key={r.que} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            flex: '0 0 auto',
                            background: r.ok ? 'var(--ok-bg)' : 'var(--warn-bg)',
                            color: r.ok ? 'var(--ok-fg)' : 'var(--warn-fg)',
                          }}
                        >
                          <Icono d={r.ok ? ['M5 12.5l4.5 4.5L19 7'] : ['M12 7.5V13M12 16.5h.02']} tam={12} grosor={2.4} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{r.que}</span>
                      </div>
                    ))}

                    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                      <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', ...ROTULO, marginBottom: 5 }}>Observación · obligatoria</span>
                        <textarea
                          value={observacionDelAlta}
                          onChange={(e) => setObservacionDelAlta(e.target.value)}
                          rows={2}
                          placeholder="Por qué se abre este programa y con qué documento"
                          style={{ ...CAMPO, background: 'var(--bg-card)', resize: 'vertical' }}
                        />
                      </label>
                      <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                        Queda en la bitácora junto a quién lo hizo y cuándo. Sin ella no se guarda, y el servidor pide al menos cinco
                        caracteres que no sean espacios (regla 10, RNF-052).
                      </p>
                    </div>

                    {falloDelAlta !== null && (
                      <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bad-bg)', color: 'var(--bad-fg)', fontSize: 12.5, lineHeight: 1.5, textWrap: 'pretty' }}>
                        No se registró: {falloDelAlta}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px 14px', borderTop: '1px solid var(--line)' }}>
                      {/* Cuando no se puede registrar, este parrafo ES el
                          motivo —el mismo que la lista de arriba, resumido en
                          una linea— y el boton lo señala con `aria-describedby`.
                          Cuando si se puede, dice lo que el alta NO pide: la
                          fecha de fin no viaja —un campo que el servidor no lee
                          se descarta en silencio y contesta 201 igual—, asi que
                          dibujarla seria un control que se teclea y no llega
                          (#331). El programa nace sin plazo de cierre y el
                          resumen lo enseña con el guion. */}
                      <p
                        id={MOTIVO_DEL_ALTA}
                        style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, lineHeight: 1.5, color: puedeRegistrarPrograma ? 'var(--ink-3)' : 'var(--warn-fg)', textWrap: 'pretty' }}
                      >
                        {puedeRegistrarPrograma
                          ? 'El programa nace abierto y sin fecha de fin: el alta no admite el plazo de cierre, así que el resumen lo dirá con un guion hasta que exista una operación que lo declare.'
                          : 'Todavía no se puede registrar. Falta ' + faltaDelAlta.filter((f) => !f.ok).map((f) => f.que.replace(/^El |^La /, (x) => x.toLowerCase())).join('; ') + '.'}
                      </p>
                      <button
                        onClick={() => void registrarElPrograma()}
                        disabled={!puedeRegistrarPrograma || registrando}
                        aria-describedby={MOTIVO_DEL_ALTA}
                        style={
                          puedeRegistrarPrograma && !registrando
                            ? { border: 0, borderRadius: 7, background: 'var(--accent)', color: '#fff', padding: '11px 22px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }
                            : { ...BOTON_APAGADO, border: 0, background: 'var(--accent)', color: '#fff', padding: '11px 22px', fontSize: 13.5, fontWeight: 500 }
                        }
                      >
                        {registrando ? 'Registrando…' : 'Registrar programa'}
                      </button>
                    </div>
                  </section>
                )}

                <section style={TARJETA}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                    {resumenDelPrograma(programaActivo, muestra.datos?.totalElementos ?? null).map((r) => (
                      <div key={r[0]} style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                        <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r[0]}</p>
                        <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{r[1]}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1, minWidth: 150, textWrap: 'pretty' }}>
                      El criterio de riesgo decide la muestra. Cambiarlo con el programa en ejecución no reordena lo ya inspeccionado.
                    </span>
                    {/* Las dos son ediciones de un programa, y no hay ruta de
                        edicion: «reprogramar es registrar otro programa», dice
                        `ProgramasController`. Apagadas con su motivo. */}
                    <button
                      disabled
                      title="No hay ruta de edición de un programa: reprogramar es registrar otro."
                      style={{ ...BOTON_APAGADO, border: '1px solid var(--line-2)', padding: '6px 12px', background: 'var(--bg-card)', fontSize: 12 }}
                    >
                      Reasignar fiscalizador
                    </button>
                    <button
                      disabled
                      title="No hay ruta de edición de un programa: reprogramar es registrar otro."
                      style={{ ...BOTON_APAGADO, border: 0, padding: '7px 15px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500 }}
                    >
                      Cerrar programa
                    </button>
                  </div>
                </section>

                <section style={TARJETA}>
                  <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                    <h2 style={H2}>Muestra del programa</h2>
                    <span style={META}>
                      {muestra.datos === null
                        ? SIN_DATO
                        : `${muestra.datos.totalElementos} ${muestra.datos.totalElementos === 1 ? 'predio' : 'predios'} · ${muestra.datos.contenido.length} visibles`}
                    </span>
                  </div>

                  {muestra.error !== null && (
                    <div style={{ padding: '12px 16px' }}>
                      <FalloDeLaMuestra error={muestra.error} reintentarMuestra={muestra.reintentar} recargarProgramas={programas.reintentar} />
                    </div>
                  )}

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                      <thead>
                        <tr>
                          <Cabeceras cols={sinOrden(COLUMNAS_DE_MUESTRA)} />
                        </tr>
                      </thead>
                      <tbody>
                        {(muestra.datos?.contenido ?? []).map((f) => (
                          <tr key={String(f.predioId) + '·' + String(f.contribuyenteId)} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={TD1}>{f.codRefCatastral}</td>
                            <td style={TD}>{f.titular ?? 'Sin titular vigente'}</td>
                            {/* «Uso declarado» y «Riesgo» no los publica
                                `MuestraResource`. El riesgo, ademas, no es un
                                concepto del backend: lo que hay es la CONDICION
                                del cruce, que es otra pregunta. */}
                            <td style={TD}>{SIN_DATO}</td>
                            {/* Numerica, como en la deteccion y por lo mismo:
                                el area ya no trae su unidad dentro (#546). */}
                            <td style={TDN}>{areaEnMetros(f.areaDeclarada)}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <Insignia tono={tonoDeCondicion(f.condicion)}>{etiquetaDeCondicion(f.condicion)}</Insignia>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <Insignia tono={f.visitado ? 'ok' : 'neutro'}>{f.visitado ? 'Inspeccionado' : 'Programado'}</Insignia>
                            </td>
                            {/* De aqui sale el acta, y de ningun otro sitio: los
                                tres identificadores que `POST
                                /fiscalizacion/predial/actas` exige —programa,
                                contribuyente y predio— son esta fila. El boton
                                lleva el codigo del programa y el id del predio a
                                la ruta, y el acta los vuelve a leer de la muestra
                                (#431 AC 2).

                                Un predio SIN titular vigente no puede: el acta
                                exige el contribuyente fiscalizado, y en la
                                muestra ese predio entra a proposito desde #586
                                —es el que nadie reclama— con sus tres columnas de
                                titular nulas. El boton se apaga diciendolo en vez
                                de mandar una peticion que ya se sabe rechazada. */}
                            <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                              <button
                                onClick={() => levantarActaDe(f, programaActivo?.codigo ?? '')}
                                disabled={f.contribuyenteId === null || programaActivo === null}
                                title={
                                  programaActivo === null
                                    ? 'No hay ningún programa elegido: el acta se levanta sobre la fila de la muestra de uno.'
                                    : f.contribuyenteId === null
                                      ? 'Este predio no tiene titular vigente, y el acta exige el contribuyente fiscalizado. Quien lo visite averigua quién lo ocupa; hasta que el padrón lo registre, el acta no se puede levantar sobre él.'
                                      : undefined
                                }
                                style={
                                  f.contribuyenteId === null || programaActivo === null
                                    ? { ...BOTON_APAGADO, border: '1px solid var(--line-2)', padding: '6px 12px', background: 'var(--bg-card)', fontSize: 12, whiteSpace: 'nowrap' }
                                    : { border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 12px', background: 'var(--bg-card)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }
                                }
                              >
                                {f.visitado ? 'Levantar otra acta' : 'Levantar acta'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {programaActivo === null ? (
                    <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Sin ningún programa elegido no hay muestra que consultar.</p>
                  ) : muestra.cargando ? (
                    <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando la muestra…</p>
                  ) : muestra.error === null && (muestra.datos?.contenido.length ?? 0) === 0 ? (
                    <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                      {/* Ahora esto se puede AFIRMAR. Hasta #546 una lista vacía
                          era también lo que contestaba un programa inexistente,
                          así que este mismo aviso se dibujaba en los dos casos y
                          en uno de los dos era falso. Desde #546 el programa que
                          no está contesta 404, y lo dice `FalloDeLaMuestra`. */}
                      <Aviso tono="neutro" titulo="Este programa no ha sorteado su muestra">
                        El programa existe —si no, la consulta contestaría que no—: lo que no tiene todavía es muestra. Se sortea aquí
                        abajo, a partir del sector, la condición y el ejercicio que el propio programa declara: no se elige a mano a quién
                        se fiscaliza, y por eso la fila que salga podrá contestar por qué le tocó (ADR-0023).
                      </Aviso>
                    </div>
                  ) : null}

                  {muestra.datos !== null && (
                    <Paginador pagina={muestra.datos.pagina} totalPaginas={muestra.datos.totalPaginas} hayMas={muestra.datos.hayMas} ir={setPaginaMuestra} />
                  )}

                  {/* ── El sorteo de la muestra (#550, ADR-0023) ───────────
                      El cuerpo lleva SOLO la observacion: a quien se fiscaliza
                      lo deciden los parametros del programa, no esta peticion.
                      Va aqui, debajo de la muestra que va a llenar, y no en la
                      deteccion: alli lo marcado son predios, y los predios no
                      viajan.

                      El motivo por el que no se puede sortear se DIBUJA, no se
                      esconde en el `title` de un boton apagado: un boton
                      deshabilitado no recibe el foco y su `title` no lo lee un
                      lector de pantalla (RNF-082). Y se sabe antes de pulsar,
                      porque las tres causas estructurales —sin ejercicio, sin
                      criterio, ya sorteada— salen de lo que la pantalla ya ha
                      leido. */}
                  <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>Sortear la muestra</p>
                    <p style={{ margin: '0 0 10px', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Se aplica al padrón el ejercicio, el sector y el criterio que el programa declara. <strong>El orden importa</strong>:
                      no se sortea un predio que otro programa abierto ya se llevó ni uno ya fiscalizado en el ejercicio, así que el primero
                      que se genere se los lleva y el siguiente sale más corto.
                    </p>

                    <label style={{ display: 'block' }}>
                      <span style={{ display: 'block', ...ROTULO, marginBottom: 5 }}>Observación · obligatoria</span>
                      <textarea
                        value={observacionDelSorteo}
                        onChange={(e) => setObservacionDelSorteo(e.target.value)}
                        rows={2}
                        placeholder="Por qué se sortea ahora y con qué documento"
                        style={{ ...CAMPO, background: 'var(--bg-card)', resize: 'vertical' }}
                      />
                    </label>

                    {falloDelSorteo !== null && (
                      <p style={{ margin: '10px 0 0', padding: '10px 12px', borderRadius: 6, background: 'var(--bad-bg)', color: 'var(--bad-fg)', fontSize: 12.5, lineHeight: 1.5, textWrap: 'pretty' }}>
                        No se sorteó: {falloDelSorteo}
                      </p>
                    )}

                    {/* Lo que el sorteo contesto, entero. Un «se sortearon N» a
                        secas no deja distinguir «no hay ninguno con ese
                        criterio» de «se los llevo el programa de al lado», y lo
                        segundo se arregla cerrando aquel (#586). */}
                    {ultimoSorteo !== null && (
                      <p style={{ margin: '10px 0 0', padding: '10px 12px', borderRadius: 6, background: 'var(--ok-bg)', color: 'var(--ok-fg)', fontSize: 12.5, lineHeight: 1.5, textWrap: 'pretty' }}>
                        Sorteada el {ultimoSorteo.fechaSorteo}: la detección vio {ultimoSorteo.detectados}
                        {ultimoSorteo.detectados === 1 ? ' predio' : ' predios'} y entraron {ultimoSorteo.predios}. Quedaron fuera{' '}
                        {ultimoSorteo.excluidosPorOtroPrograma} porque otro programa abierto ya se los llevó y{' '}
                        {ultimoSorteo.excluidosPorActaDelEjercicio} por tener acta del ejercicio. De los que entraron,{' '}
                        {ultimoSorteo.sinTitular === 1
                          ? '1 no tiene titular vigente: hay que averiguar en la visita quién lo ocupa'
                          : `${ultimoSorteo.sinTitular} no tienen titular vigente: hay que averiguar en la visita quién los ocupa`}
                        .
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 11 }}>
                      <p
                        id={MOTIVO_DEL_SORTEO}
                        style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 12, lineHeight: 1.5, color: motivoParaNoSortear === null ? 'var(--ink-3)' : 'var(--warn-fg)', textWrap: 'pretty' }}
                      >
                        {motivoParaNoSortear ?? 'Al sortear, los predios entran en la muestra y quedan reservados para este programa.'}
                      </p>
                      <button
                        onClick={() => void sortearLaMuestraDelPrograma()}
                        disabled={motivoParaNoSortear !== null || sorteando}
                        /* Apunta al parrafo de al lado, que es donde el motivo
                           se LEE. No es un `title`: un boton apagado no recibe
                           el foco, asi que el `title` no lo alcanza ni el raton
                           ni un lector de pantalla (RNF-082). Asi la misma
                           frase sirve a quien mira y a quien escucha, y no hay
                           dos textos que puedan discrepar. */
                        aria-describedby={MOTIVO_DEL_SORTEO}
                        style={
                          motivoParaNoSortear === null && !sorteando
                            ? { border: 0, borderRadius: 7, background: 'var(--accent)', color: '#fff', padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
                            : { ...BOTON_APAGADO, border: 0, background: 'var(--accent)', color: '#fff', padding: '10px 20px', fontSize: 13, fontWeight: 500 }
                        }
                      >
                        {sorteando ? 'Sorteando…' : 'Sortear la muestra'}
                      </button>
                    </div>
                  </div>

                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                    «Uso declarado» y «Riesgo» salen «—»: la muestra publica el predio, su titular, las áreas y si ya se visitó, y ninguna
                    de esas dos. La columna de condición es la del cruce que sorteó la muestra, no un criterio de riesgo. Issue #546.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ ACTA DE INSPECCIÓN ══════════ */}
        {esActa && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ── Las actas ya levantadas (#599) ──
                Hasta V76 un acta se registraba y no se podía volver a leer: el
                único sitio donde asomaba era `MuestraResource.visitado`, que
                dice SI un predio de la muestra tiene acta y nada más. Va
                delante del formulario porque es lo que hay de verdad; el
                formulario de abajo sigue sin poder mandarse, y eso lo dice él.

                No se dibuja en «Levantar acta» —el destino `acta` del
                lanzador—: allí lo que se pide es un acta nueva, y una lista de
                las anteriores no es lo que se ha ido a buscar. */}
            {dest === 'actas' && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Actas levantadas</h2>
                  {/* El ÚNICO filtro que la operación tiene, y por eso es el
                      único que se dibuja: `?estado=`, `?hallazgo=`,
                      `?contribuyente=` y `?predio=` contestan los cuatro 422
                      «Se admiten: direccion, ordenarPor, pagina, programa,
                      tamano» (medido). Un filtro que se teclea y no acota es
                      peor que no tenerlo (#322, #398, #431). */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink-3)' }}>
                    Programa
                    {/* Sin programas que ofrecer, el desplegable se APAGA y
                        dice por que. Encendido y con «Todos» de unica opcion se
                        lee como «esta municipalidad no tiene ningun programa»,
                        que es la lectura plausible y equivocada por la que este
                        repositorio se ha negado varias veces a conectar una
                        pantalla (#78, #80, #430, #431) — y las tres causas
                        —cargando, la lectura rota, y ninguno registrado— dejan
                        de distinguirse entre si. Es el patron que el mapa
                        catastral ya usa con sus sectores (#718).

                        Y la nota de fallo que hay al lado NO sirve de aviso:
                        habla de la lectura de las ACTAS, no de la de los
                        programas, asi que un desplegable mudo debajo de un
                        aviso ajeno sigue siendo mudo. Medido. */}
                    <select
                      value={programaActas}
                      onChange={(e) => setProgramaActas(e.target.value)}
                      disabled={listaDeProgramas.length === 0}
                      title={
                        listaDeProgramas.length > 0
                          ? undefined
                          : programas.cargando
                            ? 'Leyendo los programas de fiscalización de esta municipalidad…'
                            : programas.error !== null
                              ? 'No se pudieron leer los programas de fiscalización, así que no se puede acotar por ninguno'
                              : 'Esta municipalidad no tiene ningún programa de fiscalización registrado, así que no hay por cuál acotar'
                      }
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 9px', background: 'var(--bg-card)', fontSize: 12.5 }}
                    >
                      {/* «Todas» manda el filtro VACÍO, que es no mandarlo: el
                          valor viaja como el id interno del programa, y una
                          palabra ahí sería un 422 —`?programa=PF-2026-014` da
                          «El programa se identifica por su numero interno»—. */}
                      <option value="">Todos</option>
                      {listaDeProgramas.map((prog) => (
                        <option key={prog.id} value={String(prog.id)}>
                          {prog.codigo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span style={META}>
                    {actas.datos === null ? SIN_DATO : `${actas.datos.contenido.length} de ${actas.datos.totalElementos}`}
                  </span>
                </div>

                {actas.error !== null && (
                  <div style={{ padding: '12px 16px' }}>
                    {/* El acceso que se nombra es `fisc_predial`, que es el que
                        `ActasController` exige primero; la lectura la comparte
                        con `fisc_vehicular` —`oTambien`— para que un perfil de
                        fiscalización vehicular no acabe registrando actas que
                        no puede volver a ver. */}
                    <FalloDeLectura error={actas.error} que="las actas de inspección" acceso="fisc_predial" alReintentar={actas.reintentar} />
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1180 }}>
                    <thead>
                      <tr>
                        <Cabeceras cols={COLUMNAS_DE_ACTAS} orden={{ activo: ordenActas, alternar: alternarOrdenActas }} />
                      </tr>
                    </thead>
                    <tbody>
                      {(actas.datos?.contenido ?? []).map((a) => (
                        <tr key={a.id} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={TDN}>{a.id}</td>
                          <td style={TD1}>{a.fechaVisita}</td>
                          <td style={TD}>{codigoDelPrograma(listaDeProgramas, a.programaId)}</td>
                          <td style={TD}>{unidadDelActa(a)}</td>
                          <td style={TD}>{a.fiscalizador}</td>
                          <td style={{ padding: '11px 14px' }}>
                            {/* La columna admite nulos y el nulo NO es
                                «conforme»: `RegistrarActaFiscalizacion` rechaza
                                desde #481 el acta sin hallazgo, pero no se puede
                                afirmar que no haya históricas sin él, así que la
                                celda dice que no lo trae. */}
                            {a.hallazgo === null ? (
                              SIN_DATO
                            ) : (
                              <Insignia tono={tonoDelHallazgo(a.hallazgo)}>{etiquetaDelHallazgo(a.hallazgo)}</Insignia>
                            )}
                          </td>
                          <td style={TDN}>{areaEnMetros(a.areaHallada)}</td>
                          {/* Lo que #599 construyó. Nulo es «no se anotó», que
                              NO es «coincide con lo declarado»: por eso «—» y no
                              el uso de la ficha, que sería afirmar que la visita
                              lo comprobó. En un acta vehicular es nulo siempre y
                              por construcción: un vehículo no tiene uso
                              declarado contra el que contrastar. */}
                          <td style={TD}>{a.usoHallado ?? SIN_DATO}</td>
                          <td style={{ ...TD, whiteSpace: 'normal', minWidth: 200 }}>{a.detalle ?? SIN_DATO}</td>
                          <td style={TDN}>{a.version}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <Insignia tono={tonoDelEstadoDelActa(a.estado)}>{etiquetaDelEstadoDelActa(a.estado)}</Insignia>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {actas.cargando ? (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando las actas…</p>
                ) : actas.error === null && (actas.datos?.contenido.length ?? 0) === 0 ? (
                  <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                    <Aviso tono="neutro" titulo="Ninguna acta">
                      {programaActas === ''
                        ? 'Todavía no se ha levantado ninguna acta en esta municipalidad.'
                        : 'Ese programa no tiene ninguna acta levantada.'}{' '}
                      Un acta predial se registra con <code>POST /fiscalizacion/predial/actas</code>, desde el formulario de abajo, y se
                      levanta sobre una fila de la muestra de un programa: en «Programas», con «Levantar acta» en la fila del predio.
                    </Aviso>
                  </div>
                ) : null}

                {actas.datos !== null && (
                  <Paginador pagina={actas.datos.pagina} totalPaginas={actas.datos.totalPaginas} hayMas={actas.datos.hayMas} ir={setPaginaActas} />
                )}

                <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                  «Nº interno», «Programa» y «Unidad» son identificadores de fila, no el número del acta ni el código predial:{' '}
                  <code>ActaFiscalizacionResource</code> no publica ninguno de los tres —el código del programa se resuelve con la lista de
                  arriba, y si no está en ella se queda el número—. «Uso hallado» en «{SIN_DATO}» significa que la visita no lo anotó, no
                  que coincida con lo declarado. Y filtrar por estado, contribuyente o predio no se puede: la operación admite el programa y
                  nada más. Issue #599.
                </p>
              </section>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 220, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                {/* Decia «cada uno se guarda al avanzar», y avanzar no guarda
                    nada: es la cuarta frase de esta pantalla que prometia un
                    borrador que no existe (#702), y sobrevivio a aquel repaso
                    porque esta en la entradilla. */}
                El acta se levanta en el predio, con una tablet y a veces de pie. Cuatro pasos, uno por pantalla, y se registra entera al
                cerrarla.
              </p>
              <button
                onClick={() => setModoCampo(!grande)}
                aria-pressed={grande}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `1px solid ${grande ? 'var(--accent)' : 'var(--line-2)'}`,
                  borderRadius: 999,
                  padding: '8px 15px',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  background: grande ? 'var(--accent-soft)' : 'var(--bg-card)',
                  color: grande ? 'var(--accent-ink)' : 'var(--ink-3)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="6" y="3" width="12" height="18" rx="2" />
                  <path d="M11 18h2" />
                </svg>
                Modo campo
              </button>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '15px 17px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 11 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{pasoActual.label}</p>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                  Paso {pasoIdx + 1} de {PASOS_ACTA.length}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {PASOS_ACTA.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setPaso(i)}
                    aria-label={`Ir al paso ${i + 1}: ${p.label}`}
                    /* El paso abierto se DECLARA. Se distinguia solo por el
                       color, que es una barrera para quien no lo percibe y
                       ademas deja al arnes contando el paso activo como un
                       boton inerte: pulsarlo no hace nada, y tiene razon en no
                       hacerlo. */
                    aria-current={i === pasoIdx ? 'step' : undefined}
                    style={{ flex: 1, height: grande ? 9 : 6, border: 0, borderRadius: 999, cursor: 'pointer', background: i <= pasoIdx ? 'var(--accent)' : 'var(--accent-soft)' }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 11 }}>
                {PASOS_ACTA.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setPaso(i)}
                    aria-current={i === pasoIdx ? 'step' : undefined}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: grande ? 13 : 11.5,
                      color: i === pasoIdx ? 'var(--accent-ink)' : 'var(--ink-4)',
                      fontWeight: i === pasoIdx ? 600 : 400,
                    }}
                  >
                    {i + 1}. {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Declarado contra verificado ── */}
            {pasoActual.diff === true && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Declarado contra verificado</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    Lo que se compara es el objeto de la fiscalización. Antes eran pares de campos sueltos —«área verificada», «área
                    declarada», «diferencia»— y había que restar con la vista.
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th style={{ ...TH, whiteSpace: 'normal' }}>Característica</th>
                        <th style={{ ...TH, whiteSpace: 'normal' }}>Declarado</th>
                        <th style={{ ...TH, whiteSpace: 'normal' }}>Verificado en campo</th>
                        <th style={{ ...TH, whiteSpace: 'normal', textAlign: 'right' }}>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contraste.filas.map(({ r, decl, valor, dif, cambio }) => {
                        const control: CSSProperties = {
                          width: '100%',
                          boxSizing: 'border-box',
                          border: `1px solid ${cambio ? 'var(--warn-fg)' : 'var(--line-2)'}`,
                          borderRadius: 6,
                          padding: grande ? '12px 11px' : '8px 9px',
                          background: 'var(--bg-card)',
                          fontSize: grande ? 15 : 13,
                        };
                        return (
                          <tr key={r.k} style={{ borderTop: '1px solid var(--line)', background: cambio ? 'var(--warn-bg)' : 'transparent' }}>
                            <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{r.l}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13, color: decl === '' ? 'var(--ink-4)' : 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                              {decl === '' ? SIN_DATO : r.n === true ? areaEnMetros(decl) + (r.u ?? '') : decl}
                            </td>
                            <td style={{ padding: '9px 14px', minWidth: 190 }}>
                              {r.t === 'sel' ? (
                                <select value={valor} onChange={(e) => set(r.k, e.target.value)} style={control}>
                                  {/* La opcion vacia va primera, como en los campos
                                      del acta: abrir en «01 — CONCRETO» se lee como
                                      una eleccion que nadie hizo (#331). */}
                                  <option value="">— sin elegir —</option>
                                  {(r.o ?? []).map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input value={valor} onChange={(e) => set(r.k, e.target.value)} placeholder={r.ph} maxLength={r.max} style={control} />
                              )}
                              {/* Cual de las siete filas llega al servidor, dicho
                                  DONDE se teclea. Desde #431 el acta se manda, asi
                                  que una fila que no viaja es lo que alguien midio
                                  de pie en la calle y se pierde al guardar. */}
                              {r.noViaja !== undefined ? (
                                <span style={NO_VIAJA}>No viaja al acta. {r.noViaja}</span>
                              ) : (
                                <span style={{ ...NO_VIAJA, color: 'var(--ink-3)' }}>
                                  Viaja como «{r.viaja}»{r.k === 'terrenoV' ? ' — es el área de TERRENO, no la construida' : ''}.
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: '11px 14px',
                                textAlign: 'right',
                                whiteSpace: 'nowrap',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 12.5,
                                fontWeight: cambio ? 600 : 400,
                                color: cambio ? 'var(--warn-fg)' : 'var(--ink-4)',
                              }}
                            >
                              {dif}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                  {/* Decia «Sin diferencia respecto de lo declarado. El acta se
                      cierra como conforme» siempre que no hubiera diferencia
                      calculada, y con la columna «Declarado» vacia eso es
                      afirmar que el predio esta conforme sin haber leido su
                      ficha. Ahora las tres situaciones se distinguen, y la del
                      medio —«no hay con que comparar»— es la corriente: solo el
                      area de terreno tiene lado declarado publicado. */}
                  <span style={{ flex: 1, minWidth: 160, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {contraste.hayDif
                      ? 'Hay diferencia con lo que se declaró. Esta resta es la de lo que acabas de teclear; la diferencia que queda registrada y la condición las deriva la liquidación, y allí declarar de más no es un hallazgo: sale conforme.'
                      : contraste.filas.every((f) => f.dif === SIN_DATO)
                        ? 'Todavía no hay nada que comparar: hace falta lo declarado —que aquí sólo se publica para el área de terreno— y lo verificado.'
                        : 'Lo verificado coincide con lo declarado en lo que se ha podido comparar.'}
                  </span>
                  {contraste.hayDif && <Insignia tono="warn">Con diferencia</Insignia>}
                </div>
              </section>
            )}

            {/* ── Los campos del paso ── */}
            {pasoActual.campos.length > 0 && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{pasoActual.label}</p>
                  {pasoActual.nota && (
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>{pasoActual.nota}</p>
                  )}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fit,minmax(${grande ? 260 : 192}px,1fr))`,
                    gap: grande ? '18px 18px' : '15px 16px',
                    padding: grande ? '18px 16px 20px' : '15px 16px 17px',
                  }}
                >
                  {pasoActual.campos.map((f) => (
                    <CampoDelActa
                      key={f.k}
                      f={f}
                      /* Los cinco de solo lectura NO salen de `vals`: salen de
                         las dos lecturas, de modo que sin lectura no hay valor
                         y el control cae en el guion largo por construccion.
                         Sembrarlos en `vals` dejaria el titular del predio
                         anterior en pantalla cuando la lectura falla. */
                      valor={deLaFila[f.k] ?? val(f.k)}
                      grande={grande}
                      onCambio={(v) => set(f.k, v)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Lo que va a pasar al cerrar ── */}
            {pasoActual.cierre === true && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Lo que va a pasar al cerrar el acta</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    Un acta cerrada no se edita: se anula y se levanta otra. Antes de cerrar, esto es la consecuencia.
                  </p>
                </div>
                {consecuencias.map((c) => (
                  <div key={c.titulo} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span style={c.iconoStyle}>
                      <Icono d={c.iconoStyle === ICONO_FALTA ? ICO.aviso : ICO.visto} tam={13} grosor={2.4} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{c.titulo}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{c.detalle}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', flex: '0 0 auto' }}>{c.valor}</span>
                  </div>
                ))}
              </section>
            )}

            {/* Lo que el acta manda y lo que no, escrito y no sólo en el
                `title` de un botón: hasta #431 este aviso decía que el acta
                entera no se podía mandar —era cierto: no tenía predio, y sus
                tres identificadores son internos—. Ahora se manda, así que lo
                que queda por decir es otra cosa: cuáles de los veintitrés
                controles llegan al servidor.

                Los valores del acta de la maqueta no se citan al explicarlo:
                citarlos para explicarlos volvería a ponerlos en la pantalla, y
                `sin-red` los caza (#702). */}
            <div id="acta-que-viaja">
              <Aviso tono="neutro" titulo="Qué de esta acta llega al servidor, y qué no">
                <code>POST /fiscalizacion/predial/actas</code> admite <strong>diez</strong> campos y esta pantalla dibuja veintitrés
                controles y siete filas de contraste. Los que llegan son <strong>seis</strong>: la fecha de la inspección, el hallazgo, el
                área de terreno medida, el uso observado, las observaciones del fiscalizador —que viajan como <code>detalle</code>— y la
                observación de quien registra, que la regla 10 exige. Los otros <strong>tres</strong> no se teclean:{' '}
                <code>programaId</code>, <code>contribuyenteId</code> y <code>predioId</code> son identificadores internos y salen de la
                fila de la muestra sobre la que se levanta el acta —el formulario dibuja en su lugar el código del programa, el nombre del
                contribuyente y el código predial, que no son lo mismo—. El décimo, <code>fiscalizador</code>, sale del programa.
                <br />
                <br />
                Lo demás <strong>no viaja, y cada control lo dice donde se teclea</strong>: la hora, quién atendió, el vínculo y el
                resultado de la visita no tienen columna en <code>acta_fiscalizacion</code>; las fotos, el croquis y la firma no tienen
                adjunto ni operación que los reciba; y las tres marcas del cierre —determinar, ejercicios y multa— son decisiones de la
                liquidación, que es otro acto y otra pantalla. De las siete filas de contraste llegan dos, el área de terreno y el uso;
                las otras cinco son estructura del predio y ninguna existe todavía en ninguna columna del acta.
                <br />
                <br />
                El desplegable «Hallazgo principal» ofrece <strong>los cinco valores del enumerado</strong>, sin traducir: los seis rótulos
                del manual contestan los seis <code>422 «Hallazgo desconocido»</code>, medido uno a uno contra el backend, y parecerse no
                es serlo (#427, #546). {HALLAZGOS_DEL_MANUAL_QUE_NO_EXISTEN} Y <code>USO_DISTINTO</code> exige el uso observado del paso 2:
                sin él, el acta afirmaría un hallazgo que no puede sustentar.
              </Aviso>
            </div>

            {/* El acta VEHICULAR no se conecta, y el motivo no es el heredado
                —«le falta un identificador interno»—: es que **no hay de dónde
                sacarlo**.

                Medido: `programa_muestra` (V60) tiene `predio_id NOT NULL` y
                ninguna columna de vehículo; `GenerarMuestra` sortea predios y
                nada más —su javadoc empieza «los predios que se van a
                inspeccionar»—; `MuestraResource` publica `predioId` y no
                `vehiculoId`; el cruce del padrón vehicular contra SUNARP, SUNAT
                y MTC no existe como operación (#546, y sus tres filtros se
                retiraron del contrato por eso); y `GET /rentas/vehiculos` exige
                el contribuyente —«Hay que decir de quién son los vehículos»—,
                así que tampoco hay un padrón vehicular que listar sin saber ya
                a quién se fiscaliza.

                O sea que la mitad que falta no es de interfaz: es que la
                fiscalización vehicular no tiene detección ni muestra, y un acta
                que se abre eligiendo el vehículo a mano contesta «porque alguien
                te marcó», que es exactamente lo que ADR-0023 §1 se negó a hacer
                con los predios. */}
            <Aviso tono="neutro" titulo="El acta vehicular no se levanta desde aquí, y no por falta de un campo">
              <code>POST /fiscalizacion/vehicular</code> existe y pide <code>vehiculoId</code>. Lo que no existe es de dónde sacarlo: la
              muestra de un programa es <strong>de predios</strong> —<code>programa_muestra</code> no tiene columna de vehículo y el sorteo
              recorre el padrón predial—, el cruce del padrón vehicular contra SUNARP, SUNAT y MTC no es ninguna operación del contrato, y
              el listado de vehículos exige saber ya de quién son. Elegir el vehículo a mano haría que el acta contestara «porque alguien lo
              marcó» a la pregunta de por qué se fiscaliza a alguien, que es lo que ADR-0023 decidió no hacer. Hasta que la detección
              vehicular exista, esta pantalla levanta actas prediales.
            </Aviso>

            {/* ── La observación de quien registra, y lo que falta ──
                Regla 10 / RNF-052: sin observación no se guarda. No la dibuja el
                manual —como no la dibuja para el alta de programa ni para el
                sorteo—, y va aquí, en el paso del cierre, que es donde está el
                botón que la exige.

                Y lo que le falta al acta se DIBUJA, no se esconde en el `title`
                de un botón apagado: un botón deshabilitado no recibe el foco, así
                que su `title` no lo lee un lector de pantalla ni lo descubre
                quien no pasa el ratón (RNF-082). */}
            {pasoActual.cierre === true && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Cerrar el acta</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    Registrar el acta es <strong>irreversible</strong>: no se edita ni se borra, se anula y se levanta otra (regla 4).
                  </p>
                </div>

                <div style={{ padding: '14px 16px' }}>
                  <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', ...ROTULO, marginBottom: 5 }}>Observación · obligatoria</span>
                    <textarea
                      value={observacionDelActa}
                      onChange={(e) => setObservacionDelActa(e.target.value)}
                      rows={2}
                      /* `Observacion` admite de 5 a 500 caracteres (ADR-0008).
                         El minimo lo comprueba la lista de lo que falta; el
                         maximo se corta aqui, para no descubrirlo en el 422
                         despues de haber escrito el relato entero. */
                      maxLength={500}
                      placeholder="Por qué se registra ahora y con qué documento"
                      style={{ ...CAMPO, background: 'var(--bg-card)', resize: 'vertical' }}
                    />
                  </label>

                  <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {faltaDelActa.map((f) => (
                      <li key={f.que} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.5, color: f.ok ? 'var(--ink-4)' : 'var(--warn-fg)', textWrap: 'pretty' }}>
                        <span style={{ flex: '0 0 auto', fontFamily: 'var(--font-mono)' }}>{f.ok ? '✓' : '·'}</span>
                        <span>{f.que}</span>
                      </li>
                    ))}
                  </ul>

                  {falloDelActa !== null && (
                    <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 6, background: 'var(--bad-bg)', color: 'var(--bad-fg)', fontSize: 12.5, lineHeight: 1.5, textWrap: 'pretty' }}>
                      No se registró: {falloDelActa}
                    </p>
                  )}

                  {/* El acuse dice el número que el servidor puso y nada más: no
                      anuncia ninguna determinación ni ningún importe, que es lo
                      que este mismo botón hacía con dos cifras de la maqueta
                      (#702). */}
                  {actaRegistrada !== null && (
                    <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 6, background: 'var(--ok-bg)', color: 'var(--ok-fg)', fontSize: 12.5, lineHeight: 1.5, textWrap: 'pretty' }}>
                      Acta registrada con el identificador interno {actaRegistrada.id}, versión {actaRegistrada.version}, en estado{' '}
                      {etiquetaDelEstadoDelActa(actaRegistrada.estado)}, con hallazgo {actaRegistrada.hallazgo ?? SIN_DATO}.{' '}
                      {actaRegistrada.fichaId === null
                        ? 'El predio no tenía ninguna versión de ficha vigente el día de la visita, así que el acta queda sin ella.'
                        : 'Queda copiada la versión de ficha que regía el día de la visita.'}{' '}
                      Liquidarla se hace en «Resultados», eligiéndola en «Liquidar un acta». Emitir la resolución de determinación
                      todavía no se puede desde ninguna pantalla.
                    </p>
                  )}
                </div>
              </section>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <PasoAtras
                paso={pasoIdx}
                atras={() => setPaso(pasoIdx - 1)}
                style={grande ? { padding: '13px 20px' } : undefined}
              />
              {/* Decia «Lo del paso se guarda al continuar, tambien sin
                  senal», y no se guarda nada en ningun sitio: el asistente solo
                  cambia de paso, y lo tecleado vive en el estado de React hasta
                  que se recargue la pagina (#702). */}
              <p id={MOTIVO_DEL_ACTA} style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 12, lineHeight: 1.5, color: motivoParaNoCerrarActa === null ? 'var(--ink-3)' : 'var(--warn-fg)', textWrap: 'pretty' }}>
                {pasoIdx >= PASOS_ACTA.length - 1
                  ? (motivoParaNoCerrarActa ??
                    'Al cerrarla, el acta queda registrada sobre ese predio y ese contribuyente. No se puede deshacer.')
                  : 'Continuar solo cambia de paso: lo tecleado no se guarda en ningún sitio hasta cerrar el acta.'}
              </p>
              {/* «Guardar borrador» decia «Borrador guardado en el dispositivo»
                  y no guardaba en ninguna parte, que es el acto deshonesto de
                  esta revision en su forma mas barata: un aviso de exito sin
                  nada detras (#702). Sigue apagado, y ahora su motivo es otro:
                  no hay ninguna operacion de borrador —el acta se registra
                  entera o no se registra—, asi que guardarlo exigiria decidir
                  donde, y un borrador en el navegador se pierde con el
                  dispositivo que se llevo a la calle. */}
              <button
                disabled
                title="No hay ninguna operación de borrador: el acta se registra entera con «Cerrar acta», y hasta entonces lo tecleado vive sólo en esta pestaña."
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: grande ? '13px 20px' : '10px 18px', background: 'var(--bg-card)', fontSize: 13, cursor: 'not-allowed', opacity: 0.5 }}
              >
                Guardar borrador
              </button>
              {/* «Cerrar acta» estaba ENCENDIDO y no mandaba nada: su acuse
                  anunciaba una determinacion de la maqueta (#702), y despues se
                  apago porque el acta no tenia sujeto (#431 AC 2). Ahora manda,
                  y se enciende SOLO cuando de verdad se puede: los tres
                  identificadores resueltos de una fila real, la fecha, el
                  hallazgo, el uso si el hallazgo lo exige y la observacion.

                  Apunta con `aria-describedby` al parrafo de al lado, que es
                  donde el motivo se LEE: un boton apagado no recibe el foco, asi
                  que su `title` no lo alcanza ni el raton ni un lector de
                  pantalla (RNF-082). */}
              {pasoIdx >= PASOS_ACTA.length - 1 ? (
                <button
                  onClick={() => void cerrarElActa()}
                  disabled={motivoParaNoCerrarActa !== null || registrandoActa}
                  aria-describedby={MOTIVO_DEL_ACTA}
                  style={
                    motivoParaNoCerrarActa === null && !registrandoActa
                      ? {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          border: 0,
                          borderRadius: 6,
                          padding: grande ? '14px 26px' : '11px 22px',
                          background: 'var(--accent)',
                          color: '#fff',
                          fontSize: grande ? 15 : 13.5,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }
                      : {
                          ...BOTON_APAGADO,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          border: 0,
                          padding: grande ? '14px 26px' : '11px 22px',
                          background: 'var(--accent)',
                          color: '#fff',
                          fontSize: grande ? 15 : 13.5,
                          fontWeight: 500,
                        }
                  }
                >
                  {registrandoActa ? 'Registrando…' : 'Cerrar acta'}
                </button>
              ) : (
                <button
                  onClick={adelante}
                  className="hov-acento-2"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    border: 0,
                    borderRadius: 6,
                    padding: grande ? '14px 26px' : '11px 22px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: grande ? 15 : 13.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Continuar
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════ RESULTADOS ══════════ */}
        {dest === 'resultados' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Lo que salió de las actas: la diferencia por ejercicio, la deuda omitida y el estado del valor emitido. Mismo dato mirado por
              acta o por contribuyente.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {['Por acta', 'Por contribuyente', 'Histórico de versiones'].map((l, i) => {
                const on = resTab === i;
                return (
                  <button
                    key={l}
                    onClick={() => setResTab(i)}
                    aria-pressed={on}
                    style={{
                      border: 0,
                      borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
                      background: 'transparent',
                      padding: '11px 3px',
                      marginBottom: -1,
                      cursor: 'pointer',
                      fontSize: 13.5,
                      color: on ? 'var(--ink)' : 'var(--ink-3)',
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            {resTab === 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  {/* De las cuatro cifras del artboard —96 actas cerradas, 61
                      con diferencia, S/ 214,882.40 y 63.5 % de efectividad— ya
                      se pueden leer DOS: las liquidaciones que devuelve la
                      consulta y, desde #599, las actas que devuelve la suya.
                      Lo que sigue sin poder darse es el recorte «cerradas» —el
                      listado de actas no acota por estado—, el importe (D-02a:
                      `LiquidacionResource` no lleva ni un `Dinero`, #198) y la
                      efectividad, que es un cociente que nadie publica ni
                      define. Los tres salen «—» con su motivo. */}
                  {[
                    ['Liquidaciones', resultados.datos === null ? SIN_DATO : String(resultados.datos.totalElementos), 0],
                    ['Actas levantadas', actasLevantadas.datos === null ? SIN_DATO : String(actasLevantadas.datos.totalElementos), 0],
                    ['Deuda determinada', SIN_DATO, 0],
                    ['Efectividad', SIN_DATO, 1],
                  ].map((t) => (
                    <div key={String(t[0])} style={{ background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
                    </div>
                  ))}
                </div>
                <Aviso tono="warn" titulo="Dos de las cuatro cifras no se pueden dar, y una cambió de rótulo">
                  El rótulo del artboard era «Actas cerradas» y lo que se puede contar son las <strong>levantadas</strong>: desde #599 hay
                  listado de actas, pero su único filtro es el programa —<code>?estado=ABIERTA</code> contesta «Se admiten: direccion,
                  ordenarPor, pagina, programa, tamano», medido—, así que el recorte por estado no se puede pedir y contar la página traída
                  daría el número de la página. «Deuda determinada» y «Efectividad» esperan a <strong>D-02a</strong>: la liquidación viaja
                  sin un solo importe —insoluto omitido y multa llegan en blanco a propósito—, y un cero ahí se lee como «no debe nada»
                  (#198).
                </Aviso>
              </>
            )}

            {resTab === 0 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Actas con diferencia determinada</h2>
                  <span style={META}>
                    {resultados.datos === null
                      ? SIN_DATO
                      : `${resultados.datos.contenido.length} de ${resultados.datos.totalElementos}`}
                  </span>
                  <button
                    disabled
                    title="No hay ninguna operación de exportación en el contrato."
                    style={{ ...BOTON_APAGADO, border: '1px solid var(--line-2)', padding: '6px 12px', background: 'var(--bg-elev)', fontSize: 12, color: 'var(--ink-2)' }}
                  >
                    Exportar Excel
                  </button>
                </div>

                {resultados.error !== null && (
                  <div style={{ padding: '12px 16px' }}>
                    <FalloDeLectura error={resultados.error} que="los resultados de fiscalización" acceso="fisc_resultados" alReintentar={resultados.reintentar} />
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                    <thead>
                      <tr>
                        <Cabeceras cols={sinOrden(COLUMNAS_DE_RESULTADOS)} />
                      </tr>
                    </thead>
                    <tbody>
                      {(resultados.datos?.contenido ?? []).map((l) => (
                        <tr key={l.numero} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={TD1}>{l.numero}</td>
                          <td style={TD}>{'v' + String(l.version)}</td>
                          <td style={TD}>{String(l.periodoDesde) + ' — ' + String(l.periodoHasta)}</td>
                          <td style={TD}>{l.tipoDeFiscalizacion}</td>
                          {/* El motivo envuelve: es texto libre de hasta mil
                              caracteres, y con `nowrap` empujaba la novena
                              columna —la del boton que elige— fuera del ancho
                              visible, de modo que el unico control de la fila
                              habia que buscarlo desplazando. */}
                          <td style={{ ...TD, whiteSpace: 'normal', maxWidth: 280 }}>{l.motivoDeterminante}</td>
                          <td style={TD}>{l.numeroNotificacion ?? SIN_DATO}</td>
                          {/* Nunca una cifra: `esperaSusCifras` dice que las
                              lineas siguen sin importes, y `insolutoOmitido` es
                              `null` por contrato hasta D-02a. */}
                          <td style={TD}>{SIN_DATO}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <Insignia tono={tonoDelEstadoDeLiquidacion(l.estado)}>{etiquetaDelEstadoDeLiquidacion(l.estado)}</Insignia>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            {/* `aria-pressed` y no una casilla: es un conmutador
                                de cual es el sujeto, y solo puede haber uno. El
                                rotulo dice el numero para que fuera de contexto
                                —un lector de pantalla leyendo la fila— se sepa
                                cual se elige. */}
                            <button
                              onClick={() => elegirLiquidacion(l)}
                              aria-pressed={elegida === l.numero}
                              aria-label={(elegida === l.numero ? 'Elegida' : 'Elegir') + ' la liquidación ' + l.numero}
                              className="hov-linea"
                              style={{
                                border: '1px solid ' + (elegida === l.numero ? 'var(--accent)' : 'var(--line-2)'),
                                borderRadius: 6,
                                padding: '6px 12px',
                                background: elegida === l.numero ? 'var(--accent-soft)' : 'var(--bg-elev)',
                                color: elegida === l.numero ? 'var(--accent-ink)' : 'var(--ink-2)',
                                fontSize: 12,
                                cursor: 'pointer',
                              }}
                            >
                              {elegida === l.numero ? 'Elegida' : 'Elegir'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {resultados.cargando ? (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando los resultados…</p>
                ) : resultados.error === null && (resultados.datos?.contenido.length ?? 0) === 0 ? (
                  <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                    {/* Decia «`liquidacion_fiscalizacion` no tiene una sola fila
                        en ninguna de las dos municipalidades (#546)», y eso era
                        cierto el dia que se escribio y hoy no: la municipalidad 1
                        tiene `LIQ-2026-000001`, medido. Una afirmacion sobre el
                        estado de una tabla envejece sola y nadie la mira; la que
                        queda habla de esta consulta, que es lo que la pantalla
                        si puede saber, y dice por donde se llena. */}
                    <Aviso tono="neutro" titulo="Sin resultados">
                      Ninguna acta con liquidación en esta municipalidad. Se llena liquidando un acta levantada, en «Liquidar un acta», aquí
                      abajo: la liquidación es lo que convierte lo que el fiscalizador vio en un contraste por ejercicio con su número.
                    </Aviso>
                  </div>
                ) : null}

                {resultados.datos !== null && (
                  <Paginador pagina={resultados.datos.pagina} totalPaginas={resultados.datos.totalPaginas} hayMas={resultados.datos.hayMas} ir={setPaginaRes} />
                )}

                <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                  «Deuda omitida» sale «—» en todas las filas: la liquidación no publica ni un importe hasta D-02a (#198). Las columnas son
                  las que <code>LiquidacionResource</code> publica; «Acta» era un número del artboard y lo que hay es el de la liquidación.
                </p>
              </section>
            )}

            {/* ══════════ Liquidar un acta (`POST /fiscalizacion/liquidaciones`) ══════════

                Es el acto que convierte lo que el fiscalizador vio en un
                contraste por ejercicio con su numero. Vive aqui y no en la
                pantalla del acta porque son dos actos con dos privilegios: el
                acta pide `fisc_predial` con REGISTRO y esto pide
                `fisc_resultados` con REGISTRO, y ademas se liquida un periodo
                —varios ejercicios— que en el acta no se pregunta. */}
            {resTab === 0 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Liquidar un acta</h2>
                  <span style={META}>
                    {actasLevantadas.datos === null
                      ? SIN_DATO
                      : `${actasDeLaPagina.length} de ${actasLevantadas.datos.totalElementos} actas`}
                  </span>
                </div>

                {actasLevantadas.error !== null && (
                  <div style={{ padding: '12px 16px' }}>
                    <FalloDeLectura error={actasLevantadas.error} que="las actas levantadas" acceso="fisc_predial" alReintentar={actasLevantadas.reintentar} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, gridColumn: 'span 2' }}>
                    <span style={ROTULO}>Acta · obligatoria</span>
                    {/* Sin ninguna acta que ofrecer, el desplegable se apaga y
                        dice CUAL de las tres cosas pasa. Un desplegable con solo
                        «— sin elegir —» dentro se lee como «esta municipalidad no
                        ha levantado ninguna acta», y eso puede ser falso: puede
                        estar leyendose o puede haber fallado la lectura. Lo caza
                        `desplegables.mjs`, y lo cazo aqui —el aviso de fallo que
                        hay arriba habla de la misma lectura, y aun asi un aviso
                        encima no explica el control de abajo—. */}
                    <select
                      value={actaALiquidar}
                      onChange={(e) => setActaALiquidar(e.target.value)}
                      disabled={actasDeLaPagina.length === 0}
                      title={
                        actasDeLaPagina.length > 0
                          ? undefined
                          : actasLevantadas.cargando
                            ? 'Leyendo las actas levantadas en esta municipalidad…'
                            : actasLevantadas.error !== null
                              ? 'No se pudieron leer las actas levantadas, así que no hay ninguna de la que elegir'
                              : 'Esta municipalidad no tiene ningún acta levantada: se levanta desde la muestra de un programa, en «Programas»'
                      }
                      style={CAMPO}
                    >
                      {/* La opcion vacia va primera y no es adorno: sin ella el
                          desplegable abre en la primera acta de la lista y eso
                          se lee como una eleccion de quien liquida (#331). */}
                      <option value="">— sin elegir —</option>
                      {actasDeLaPagina.map((a) => {
                        const suya = yaLiquidadas.get(a.id);
                        return (
                          <option key={a.id} value={String(a.id)} disabled={suya !== undefined}>
                            {'#' + String(a.id) + ' · ' + a.fechaVisita + ' · ' + (a.hallazgo === null ? 'sin hallazgo' : etiquetaDelHallazgo(a.hallazgo)) + (suya === undefined ? '' : ' · ya liquidada (' + suya + ')')}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={ROTULO}>Periodo — desde · obligatorio</span>
                    <input value={campoDeLiq('periodoDesde')} onChange={(e) => fijarLiq('periodoDesde', e.target.value)} placeholder="2024" style={CAMPO} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={ROTULO}>Periodo — hasta · obligatorio</span>
                    <input value={campoDeLiq('periodoHasta')} onChange={(e) => fijarLiq('periodoHasta', e.target.value)} placeholder="2026" style={CAMPO} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={ROTULO}>Tipo de fiscalización · obligatorio</span>
                    {/* Los CUATRO de `TipoDeFiscalizacion`, sin traducir. Aqui
                        el artboard y el enumerado dicen lo mismo —el enumerado
                        salio de esa lista—, y la unica diferencia es el espacio
                        de «DE OFICIO»: se manda el nombre, que es el que la fila
                        de la grilla publica. `vocabularios.mjs` compara las dos
                        listas en las dos direcciones. */}
                    <select value={campoDeLiq('tipoDeFiscalizacion')} onChange={(e) => fijarLiq('tipoDeFiscalizacion', e.target.value)} style={CAMPO}>
                      <option value="">— sin elegir —</option>
                      {TIPOS_DE_FISCALIZACION.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={ROTULO}>Fecha de la liquidación · opcional</span>
                    <input type="date" value={campoDeLiq('fecha')} onChange={(e) => fijarLiq('fecha', e.target.value)} style={CAMPO} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, gridColumn: 'span 2' }}>
                    <span style={ROTULO}>Motivo determinante · obligatorio</span>
                    <textarea
                      value={campoDeLiq('motivoDeterminante')}
                      onChange={(e) => fijarLiq('motivoDeterminante', e.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="Por qué se fiscalizó"
                      style={{ ...CAMPO, resize: 'vertical' }}
                    />
                  </label>
                </div>

                {actasLevantadas.datos !== null && actasLevantadas.datos.totalPaginas > 1 && (
                  <Paginador
                    pagina={actasLevantadas.datos.pagina}
                    totalPaginas={actasLevantadas.datos.totalPaginas}
                    hayMas={actasLevantadas.datos.hayMas}
                    ir={setPaginaActasLiq}
                  />
                )}

                <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                  El desplegable ofrece las actas de <strong>esta</strong> página, de la más reciente a la más antigua. «Ya liquidada» sólo
                  marca las que aparecen en la página de la grilla de arriba: <code>GET /fiscalizacion/resultados</code> publica el{' '}
                  <code>actaId</code> de la última versión de cada acta, así que lo que dice es cierto y lo que calla puede estar en otra
                  página; la última palabra es el 409 del servidor, que nombra la liquidación que ya hay. La columna «Estado» de un acta{' '}
                  <strong>no sirve para esto</strong>: <code>acta_fiscalizacion.estado</code> nace ABIERTA y no la mueve nadie, de modo que
                  un acta ya liquidada sigue diciendo «Abierta».
                  {' '}
                  {/* Se dice porque el `record` SI declara ese campo y quien lo
                      lea esperara teclearlo aqui: `PeticionDeLiquidacion` lleva
                      un octavo componente, `usoHallado`, y el controlador no lo
                      llama nunca —lo comprobo `grep` sobre el archivo entero—.
                      Es lo que #599 dejo detras al mudar el uso al acta. No se
                      manda: el cuerpo descarta en silencio lo que no lee, asi
                      que un campo aqui seria una caja que se teclea y no llega
                      (#331). */}
                  Y el <strong>uso observado no se teclea aquí</strong>: lo manda el acta, desde #599. Corregirlo después es reliquidar, que
                  es donde ese dato sí se lee, línea a línea.
                </p>

                <QueFalta titulo="Qué falta para poder liquidarla" filas={faltaDeLaLiquidacion} />

                <CampoDeObservacion
                  valor={observacionDeLiq}
                  onCambio={setObservacionDeLiq}
                  placeholder="Por qué se liquida esta acta y con qué documento"
                />

                <FalloDelActo que="No se liquidó" fallo={falloDeLiq} />

                <BarraDelActo
                  id={MOTIVO_DE_LA_LIQUIDACION}
                  motivo={motivoParaNoLiquidar}
                  cuandoSePuede="Emitir la liquidación es irreversible: no se edita ni se borra, se corrige reliquidando —otra versión que referencia a ésta—. El número lo pone el servidor con el año de la fecha, y las cifras de la determinación siguen en blanco hasta D-02a."
                  etiqueta="Liquidar el acta"
                  etiquetaOcupado="Liquidando…"
                  ocupado={liquidando}
                  onClick={() => void liquidarElActa()}
                />
              </section>
            )}

            {/* ══════════ Reliquidar (`POST …/{numero}/reliquidaciones`) ══════════

                Corregir una liquidacion es emitir OTRA que la referencia: la
                anterior no cambia ni una columna, y ni siquiera se marca como
                sustituida —eso se lee de que exista otra que la referencia—.
                Por eso el formulario nace del contraste de la elegida y solo
                viajan las lineas que alguien toca. */}
            {resTab === 0 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Reliquidar</h2>
                  <span style={META}>{liquidacionElegida === null ? SIN_DATO : liquidacionElegida.numero + ' · v' + String(liquidacionElegida.version)}</span>
                </div>

                {/* Sin liquidacion elegida no se dibuja NINGUN campo, y eso es
                    la decision: un formulario relleno sin sujeto invita a
                    teclear un contraste que no se sabe de quien es. */}
                {liquidacionElegida === null ? (
                  <div style={{ padding: '12px 16px' }}>
                    <Aviso tono="neutro" titulo="Sin liquidación elegida">
                      Se reliquida una liquidación concreta. Elígela con «Elegir» en su fila de la grilla de arriba y el formulario aparece
                      con su periodo, su tipo y su contraste ya puestos. La grilla lista sólo la última versión de cada acta, así que
                      eligiendo de ella no se puede pedir una que ya esté sustituida.
                    </Aviso>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Periodo — desde · obligatorio</span>
                        <input value={campoDeRel('periodoDesde')} onChange={(e) => fijarRel('periodoDesde', e.target.value)} style={CAMPO} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Periodo — hasta · obligatorio</span>
                        <input value={campoDeRel('periodoHasta')} onChange={(e) => fijarRel('periodoHasta', e.target.value)} style={CAMPO} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Tipo de fiscalización · obligatorio</span>
                        <select value={campoDeRel('tipoDeFiscalizacion')} onChange={(e) => fijarRel('tipoDeFiscalizacion', e.target.value)} style={CAMPO}>
                          <option value="">— sin elegir —</option>
                          {TIPOS_DE_FISCALIZACION.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Fecha de la reliquidación · opcional</span>
                        <input type="date" value={campoDeRel('fecha')} onChange={(e) => fijarRel('fecha', e.target.value)} style={CAMPO} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, gridColumn: 'span 2' }}>
                        <span style={ROTULO}>Motivo determinante · obligatorio</span>
                        <textarea
                          value={campoDeRel('motivoDeterminante')}
                          onChange={(e) => fijarRel('motivoDeterminante', e.target.value)}
                          rows={2}
                          maxLength={1000}
                          style={{ ...CAMPO, resize: 'vertical' }}
                        />
                      </label>
                    </div>

                    <div style={{ padding: '12px 16px 4px' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>Qué se corrige del contraste</p>
                      <p style={{ margin: '4px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                        Una línea por ejercicio, con lo que la versión anterior dice. <strong>Lo que se deja en blanco se conserva</strong>:
                        sólo viaja lo que se escribe, porque repetir el contraste entero para corregir un área lo cambiaría entero si algo se
                        transcribiera distinto. La <strong>condición</strong> no se teclea y no puede: la recalcula el servidor sobre los
                        datos nuevos, para que una reliquidación no pueda declarar CONFORME un predio con quinientos metros de diferencia.
                      </p>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                        <thead>
                          <tr>
                            <Cabeceras cols={sinOrden([['Ejercicio', 0], ['Área declarada m²', 0], ['Área hallada m²', 0], ['Uso declarado', 0], ['Uso hallado', 0]])} />
                          </tr>
                        </thead>
                        <tbody>
                          {liquidacionElegida.lineas.map((linea) => (
                            <tr key={linea.ejercicio} style={{ borderTop: '1px solid var(--line)' }}>
                              <td style={TD1}>{linea.ejercicio}</td>
                              {(
                                [
                                  ['areaDeclarada', linea.areaDeclarada],
                                  ['areaHallada', linea.areaHallada],
                                  ['usoDeclarado', linea.usoDeclarado],
                                  ['usoHallado', linea.usoHallado],
                                ] as [string, string | null][]
                              ).map(([campo, actual]) => (
                                <td key={campo} style={{ padding: '9px 14px' }}>
                                  {/* El valor de la version anterior va de
                                      marcador y NO de valor inicial: escrito
                                      dentro viajaria tal cual y una
                                      reliquidacion que solo cambia el motivo
                                      mandaria el contraste entero. Vacio
                                      significa «se conserva». */}
                                  <input
                                    value={correccion(linea.ejercicio, campo)}
                                    onChange={(e) => fijarCorreccion(linea.ejercicio, campo, e.target.value)}
                                    placeholder={actual ?? SIN_DATO}
                                    aria-label={campo + ' del ejercicio ' + String(linea.ejercicio)}
                                    style={{ ...CAMPO, padding: '7px 9px', fontSize: 12.5 }}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <QueFalta titulo="Qué falta para poder reliquidarla" filas={faltaDeLaReliquidacion} />

                    <CampoDeObservacion
                      valor={observacionDeRel}
                      onCambio={setObservacionDeRel}
                      placeholder="Qué se corrige de la versión anterior y con qué documento"
                    />

                    <FalloDelActo que="No se reliquidó" fallo={falloDeRel} />

                    <BarraDelActo
                      id={MOTIVO_DE_LA_RELIQUIDACION}
                      motivo={motivoParaNoReliquidar}
                      cuandoSePuede={'Se emite una versión nueva de ' + liquidacionElegida.numero + '. La anterior queda: explica por qué se notificó lo que se notificó, y la nueva por qué ya no vale.'}
                      etiqueta="Reliquidar"
                      etiquetaOcupado="Reliquidando…"
                      ocupado={reliquidando}
                      onClick={() => void reliquidarLaElegida()}
                    />
                  </>
                )}

                {/* Lo que cambio lo dice el servidor, concepto a concepto: es lo
                    que `DiferenciaEntreLiquidaciones` devuelve con la version
                    nueva, y no se recompone aqui comparando las dos filas. */}
                {ultimaVersion !== null && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
                    <Aviso tono="ok" titulo={'Emitida ' + ultimaVersion.version.numero + ' · versión ' + String(ultimaVersion.version.version)}>
                      {ultimaVersion.cambios.length === 0
                        ? 'El servidor no declara ningún cambio de contraste respecto de la anterior: lo que cambió es la cabecera —el periodo, el tipo o el motivo—.'
                        : ultimaVersion.cambios.map((c) => `${c.concepto}: ${c.antes ?? SIN_DATO} → ${c.despues ?? SIN_DATO}`).join(' · ')}
                      {ultimaVersion.importesSinCifra.length > 0 && ` · Sin cifra todavía (D-02a): ${ultimaVersion.importesSinCifra.join(', ')}.`}
                    </Aviso>
                  </div>
                )}
              </section>
            )}

            {resTab === 1 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Deuda de fiscalización por contribuyente</h2>
                  <span style={META}>
                    {estadoDeCuenta.datos === null ? SIN_DATO : `al ${estadoDeCuenta.datos.fechaDeConsulta}`}
                  </span>
                </div>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  {/* Esta vista es de UN contribuyente: `GET
                      /fiscalizacion/estado-cuenta` exige su codigo y contesta
                      404 si no esta en el padron. El artboard dibujaba cuatro
                      filas de ALBURQUEQUE INFANTE GENARO con «145.41» cada una
                      y un total de «S/ 581.65» sin haber preguntado por nadie. */}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 320 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Código de contribuyente</span>
                    <input
                      value={contribuyenteRes}
                      onChange={(e) => setContribuyenteRes(e.target.value)}
                      placeholder="C-000001"
                      style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                    />
                  </label>
                </div>

                {estadoDeCuenta.error !== null && (
                  <div style={{ padding: '12px 16px' }}>
                    <FalloDeLectura error={estadoDeCuenta.error} que="el estado de cuenta de fiscalización" acceso="fisc_estado_cuenta" alReintentar={estadoDeCuenta.reintentar} />
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                    <thead>
                      <tr>
                        <Cabeceras cols={sinOrden(COLUMNAS_DE_ESTADO_DE_CUENTA)} />
                      </tr>
                    </thead>
                    <tbody>
                      {(estadoDeCuenta.datos?.lineas ?? []).map((l, i) => (
                        <tr key={l.deuda + '·' + String(l.ano) + '·' + String(i)} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={TD1}>{l.deuda}</td>
                          <td style={TD}>{String(l.ano)}</td>
                          <td style={TD}>{l.nomTrib}</td>
                          <td style={TD}>{l.unidad === null ? SIN_DATO : String(l.unidad)}</td>
                          {/* El importe SIEMPRE con su fecha: es un
                              `ImporteActualizado`, y la regla 9 dice que no hay
                              «la deuda» sino la deuda a una fecha. */}
                          <td style={TDN}>{l.importe === null ? SIN_DATO : 'S/ ' + l.importe.importe}</td>
                          <td style={TD}>{l.importe === null ? SIN_DATO : l.importe.actualizadoA}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <Insignia tono={tonoDeCondicion(l.estad)}>{etiquetaDeCondicion(l.estad)}</Insignia>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {contribuyenteReposado.trim() === '' ? (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                    Teclea un código de contribuyente: esta vista es de una persona, no del padrón entero.
                  </p>
                ) : estadoDeCuenta.cargando ? (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando el estado de cuenta…</p>
                ) : estadoDeCuenta.error === null && (estadoDeCuenta.datos?.lineas.length ?? 0) === 0 ? (
                  <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                    <Aviso tono="neutro" titulo="Sin deuda de fiscalización">
                      Este contribuyente no tiene ninguna obligación originada en una fiscalización a la fecha de consulta.
                    </Aviso>
                  </div>
                ) : (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                    Total{' '}
                    {estadoDeCuenta.datos?.total == null
                      ? SIN_DATO
                      : `S/ ${estadoDeCuenta.datos.total.importe} al ${estadoDeCuenta.datos.total.actualizadoA}`}
                    . La deuda de fiscalización lleva su propia fase para distinguirla de la emitida en el registro ordinario.
                  </p>
                )}
              </section>
            )}

            {resTab === 2 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Versiones del proceso fiscalizador</h2>
                  <span style={META}>
                    {historico.datos === null ? SIN_DATO : `${historico.datos.totalElementos} versiones`}
                  </span>
                </div>

                {/* Que se esta mirando, dicho: son dos preguntas distintas al
                    mismo endpoint y la respuesta no se parece —con numero, las
                    versiones traen su diferencia; sin el, `cambios` sale vacio
                    a proposito, porque componerla obligaria a leer el historial
                    completo de cada una de las veinte filas—. Sin esta linea, un
                    listado sin diferencias se lee como un proceso sin cambios. */}
                <p style={{ ...PIE, borderBottom: '1px solid var(--line)' }}>
                  {elegida === null
                    ? 'Todas las versiones de la municipalidad, una fila por versión. Aquí no se dibuja qué cambió respecto de la anterior: eso se pide abriendo un proceso, eligiendo su liquidación en «Por acta».'
                    : `El proceso completo del acta de ${elegida}: todas sus versiones en orden, cada una con lo que cambió respecto de la anterior.`}
                </p>

                {historico.error !== null && (
                  <div style={{ padding: '12px 16px' }}>
                    <FalloDeLectura error={historico.error} que="el histórico de fiscalización" acceso="fisc_historico" alReintentar={historico.reintentar} />
                  </div>
                )}

                {(historico.datos?.contenido ?? []).map((v) => (
                  <div key={v.version.numero} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        flex: '0 0 auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11.5,
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-ink)',
                      }}
                    >
                      {v.version.version}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>
                        {v.version.numero} · {etiquetaDelEstadoDeLiquidacion(v.version.estado)}
                      </span>
                      {/* Lo que cambio respecto de la anterior lo dice el
                          backend, concepto a concepto. El artboard lo escribia
                          a mano —«Se corrigió el ECS de MALO a BUENO»—.

                          Y aqui el area SI llega con su « m2» dentro, que es la
                          excepcion a lo que #546 hizo en las dos grillas: esta
                          es una sola linea de texto donde caben «OMISO», «2020»,
                          un importe y una superficie, asi que no hay cabecera
                          que pueda poner la unidad y sin ella «120.00 → 164.50»
                          no dice si cambio el area hallada o el insoluto. Sale
                          verbatim: `areaEnMetros` no se le aplica —recortarle la
                          unidad es lo que dejaria la celda muda—. */}
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                        {v.cambios.length === 0
                          ? 'Sin cambios declarados respecto de la anterior.'
                          : v.cambios.map((c) => `${c.concepto}: ${c.antes ?? SIN_DATO} → ${c.despues ?? SIN_DATO}`).join(' · ')}
                      </span>
                      {v.importesSinCifra.length > 0 && (
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3, textWrap: 'pretty' }}>
                          Sin cifra todavía (D-02a): {v.importesSinCifra.join(', ')}.
                        </span>
                      )}
                    </span>
                    <span style={{ flex: '0 0 auto', textAlign: 'right' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{v.version.fecha}</span>
                    </span>
                  </div>
                ))}

                {historico.cargando ? (
                  <p style={PIE}>Consultando el histórico…</p>
                ) : historico.error === null && (historico.datos?.contenido.length ?? 0) === 0 ? (
                  <div style={{ padding: '11px 16px' }}>
                    {/* Decia «No hay ninguna liquidacion, asi que no hay proceso
                        del que enseñar versiones» y se callaba la mitad util:
                        **tampoco decia por donde se crea una**, de modo que la
                        pantalla describia un vacio sin salida. Y con una elegida
                        el vacio significa otra cosa —no que no haya ninguna, sino
                        que esa no tiene historial—, asi que son dos frases. */}
                    <Aviso tono="neutro" titulo="Sin versiones">
                      {elegida === null
                        ? 'Ninguna liquidación tiene versiones que enseñar. Una nace liquidando un acta levantada —en «Por acta», con «Liquidar un acta»—, y gana versiones al reliquidarla, que es como se corrige: la anterior no se toca.'
                        : `${elegida} no devuelve ninguna versión. Debería tener al menos la suya: si esto se ve, la lectura del proceso no encontró su acta.`}
                    </Aviso>
                  </div>
                ) : null}

                {/* Con una liquidacion elegida no hay paginas que recorrer: el
                    controlador devuelve el proceso ENTERO en un solo sobre
                    —`new Pagina<>(proceso, 0, max(size,1), size)`—, asi que un
                    paginador ahi ofreceria una pagina 2 que no existe. */}
                {historico.datos !== null && elegida === null && (
                  <Paginador pagina={historico.datos.pagina} totalPaginas={historico.datos.totalPaginas} hayMas={historico.datos.hayMas} ir={setPaginaHist} />
                )}

                {/* ══════════ Mover de estado (`PATCH …/{numero}/estados`) ══════════

                    Vive en esta pestaña y no en la grilla porque el privilegio
                    es OTRO: `fisc_historico` con MODIFICACION, mientras que
                    liquidar y reliquidar piden `fisc_resultados` con REGISTRO.
                    Un perfil que solo tenga uno de los dos accesos ve la
                    pestaña que puede operar.

                    Y `PATCH` aqui no es una excepcion a la regla 4: no
                    actualiza ninguna fila —`liquidacion_fiscalizacion` no admite
                    `UPDATE` desde V39—, inserta un movimiento, y el estado es lo
                    que se DERIVA del ultimo. */}
                {liquidacionElegida === null ? (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
                    <Aviso tono="neutro" titulo="Sin liquidación elegida">
                      Mover una liquidación de estado es un acto sobre una concreta. Elígela con «Elegir» en su fila de «Por acta» y aquí
                      aparecen su proceso completo y el formulario del movimiento.
                    </Aviso>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Pasa a · obligatorio</span>
                        {/* Los CINCO de `EstadoDeLiquidacion` menos el que ya
                            tiene: al suyo no hay movimiento que registrar y el
                            servidor contesta 409, que se sabe antes de pulsar
                            porque el estado viaja en la fila. No hay ninguna
                            otra transicion prohibida —el caso de uso solo tiene
                            esas dos guardas—, asi que esto no dibuja un camino
                            que no existe. */}
                        <select value={campoDeEst('nuevoEstado')} onChange={(e) => fijarEst('nuevoEstado', e.target.value)} style={CAMPO}>
                          <option value="">— sin elegir —</option>
                          {ESTADOS_DE_LIQUIDACION_DEL_BACKEND.filter((v) => v !== liquidacionElegida.estado).map((v) => (
                            <option key={v} value={v}>
                              {etiquetaDelEstadoDeLiquidacion(v)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={ROTULO}>Fecha del movimiento · opcional</span>
                        <input type="date" value={campoDeEst('fecha')} onChange={(e) => fijarEst('fecha', e.target.value)} style={CAMPO} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, gridColumn: 'span 2' }}>
                        <span style={ROTULO}>Motivo del movimiento · obligatorio</span>
                        <input
                          value={campoDeEst('motivo')}
                          onChange={(e) => fijarEst('motivo', e.target.value)}
                          maxLength={300}
                          placeholder="Con qué acto se mueve"
                          style={CAMPO}
                        />
                        <span style={NO_VIAJA}>
                          No es la observación. El motivo se guarda en el movimiento y es lo que este historial enseña al lado del paso; la
                          observación es de quien registra y va a la bitácora.
                        </span>
                      </label>
                    </div>

                    <CampoDeObservacion
                      valor={observacionDeEst}
                      onCambio={setObservacionDeEst}
                      placeholder="Por qué se mueve y con qué documento"
                    />

                    <FalloDelActo que="No se movió" fallo={falloDeEst} />

                    <BarraDelActo
                      id={MOTIVO_DEL_ESTADO}
                      motivo={motivoParaNoMover}
                      cuandoSePuede={liquidacionElegida.numero + ' está ' + etiquetaDelEstadoDeLiquidacion(liquidacionElegida.estado).toLowerCase() + '. El movimiento se añade al historial y no borra el anterior: pasar a ANULADA la cierra para siempre, y desde ahí sólo se puede reliquidar.'}
                      etiqueta="Mover de estado"
                      etiquetaOcupado="Moviendo…"
                      ocupado={moviendo}
                      onClick={() => void moverDeEstado()}
                    />
                  </>
                )}

                <p style={PIE}>
                  El versionado es lo que permite defender una determinación ante una reclamación: dice qué característica cambió, quién la
                  cambió y con qué acta.
                </p>
              </section>
            )}

            {resTab === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Emitir crea el valor y arranca el plazo para reclamar. La deuda omitida entra en la cuenta corriente ese mismo día.
                </p>
                <button
                  onClick={() => onDest('reporte')}
                  className="hov-linea"
                  style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '10px 18px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
                >
                  Ver el documento
                </button>
                {/* El aviso anterior decia «61 resoluciones de determinacion
                    emitidas. La deuda entra hoy en la cuenta corriente.» sin
                    mandar nada: 61 es del artboard, y emitir es
                    `POST /fiscalizacion/transferencias`, que exige nLiquidacion,
                    documento de sustento, sustento y base legal —cuatro campos
                    que esta pantalla no dibuja— mas la observacion (regla 10). */}
                <button
                  disabled
                  title="Emitir exige el nº de liquidación, el documento de sustento, el sustento y la base legal, y esta pantalla no los pide."
                  style={{ ...BOTON_APAGADO, border: 0, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500 }}
                >
                  Emitir resoluciones
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════ RESOLUCIÓN ══════════ */}
        {esResolucion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            {/* ── De qué resolución se habla ────────────────────────
                Antes esta hoja no lo preguntaba, y por eso estaba vacía: un
                destino de documento que no sabe CUÁL documento no puede leer
                nada. Y antes de vaciarla enseñaba la resolución entera del
                artboard —«000418-2026-SGFT/MDC», un R.U.C. real y seis
                ejercicios al céntimo— y la imprimía igual con la red cortada. */}
            <section data-noprint="1" style={{ ...TARJETA, width: '100%', maxWidth: 820 }}>
              <div style={CABECERA}>
                <h2 style={H2}>Qué resolución</h2>
                <span style={META}>GET …/resoluciones/{'{numero}'}</span>
              </div>
              <div style={{ padding: '14px 16px 4px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 320 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Nº de resolución</span>
                  <input
                    value={numeroResolucion}
                    onChange={(e) => setNumeroResolucion(e.target.value)}
                    placeholder="RDF-2026-000001"
                    style={{
                      width: '100%',
                      border: '1px solid var(--line-2)',
                      borderRadius: 6,
                      padding: '9px 10px',
                      background: 'var(--bg-elev)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13.5,
                    }}
                  />
                  <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                    Tal como está impreso en el papel notificado. Es lo único que identifica la resolución.
                  </span>
                </label>
              </div>
              {/* Por qué se teclea, en vez de elegirse de una lista. No es una
                  comodidad: es que no la lista nadie. `GET
                  /fiscalizacion/resultados` —la grilla de «Resultados»— publica
                  el número de la LIQUIDACIÓN y no el de la resolución que la
                  transfirió, y el contrato no declara ninguna otra ruta bajo
                  `/fiscalizacion/resoluciones`. Medido con la cadena entera
                  sembrada: la grilla dice `LIQ-2026-000001` y la resolución es
                  `RDF-2026-000001`. */}
              <p style={PIE}>
                No hay lista de resoluciones que ofrecer: «Resultados» publica el número de la liquidación
                (<code style={{ fontFamily: 'var(--font-mono)' }}>LIQ-…</code>) y no el de la resolución que la transfirió
                (<code style={{ fontFamily: 'var(--font-mono)' }}>RDF-…</code>). El número sale del papel, que es lo que el
                contribuyente trae cuando viene a reclamar dentro de los veinte días del artículo 137º.
              </p>
            </section>

            {/* Los tres estados de la lectura, antes de cualquier cifra. */}
            {numeroResolucionReposado === '' && (
              <p data-noprint="1" style={{ margin: 0, width: '100%', maxWidth: 820, fontSize: 13, color: 'var(--ink-3)' }}>
                Teclea el número de la resolución para verla.
              </p>
            )}
            {resolucion.cargando && (
              <p data-noprint="1" style={{ margin: 0, width: '100%', maxWidth: 820, fontSize: 13, color: 'var(--ink-3)' }}>
                Buscando la resolución…
              </p>
            )}
            {!resolucion.cargando && resolucion.error !== null && (
              <div data-noprint="1" style={{ width: '100%', maxWidth: 820 }}>
                <FalloDeLectura
                  error={resolucion.error}
                  que="la resolución de determinación"
                  acceso="resolucion_determinacion_fisc"
                  alReintentar={resolucion.reintentar}
                />
              </div>
            )}

            {/* ── Los dos actos, y los dos apagados sin resolución leída ──
                «Descargar» estaba encendido y era INERTE —ni petición, ni
                navegación, ni aviso— e «Imprimir» sí funcionaba, que era peor:
                sacaba por la impresora una resolución entera con las cifras del
                artboard. Ahora los cuatro botones nacen apagados y siguen
                apagados ante un 404 y ante un 403, porque lo que los enciende no
                es haber tecleado algo sino que `laResolucion` no sea `null`, y
                un fallo de lectura deja `datos` en `null`.

                Los dos motivos son DISTINTOS a propósito, y cada uno se dibuja
                junto a su control (RNF-082): sin número no hay a quién pedirle
                el archivo, y sin hoja dibujada no hay qué mandar a la
                impresora. Un `title` no basta —un botón apagado no recibe el
                foco, así que nadie lo lee—. */}
            <div
              data-noprint="1"
              style={{ width: '100%', maxWidth: 820, display: 'flex', gap: 20, justifyContent: 'flex-end', alignItems: 'flex-start', flexWrap: 'wrap' }}
            >
              <Descargas
                traer={(f) => descargarResolucion(laResolucion?.numero ?? numeroResolucionReposado, f)}
                que="la resolución de determinación"
                acceso="resolucion_determinacion_fisc"
                /* `lectura` y no `impresion`, y está comprobado en el
                   controlador: el documento es la misma hoja que está aquí
                   debajo, así que pedir un segundo privilegio negaría el
                   archivo a quien ya tiene el contenido delante. */
                privilegio="lectura"
                impedimento={
                  laResolucion === null
                    ? 'No hay ninguna resolución leída: no hay número al que pedirle el archivo. Teclea el suyo arriba.'
                    : undefined
                }
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'flex-end' }}>
                <button
                  onClick={() => window.print()}
                  disabled={laResolucion === null}
                  aria-describedby={laResolucion === null ? 'fisc-resolucion-sin-hoja' : undefined}
                  title={laResolucion === null ? 'La hoja está vacía: no hay nada que mandar a la impresora.' : undefined}
                  className={laResolucion === null ? undefined : 'hov-acento-2'}
                  style={{
                    border: 0,
                    borderRadius: 6,
                    padding: '9px 20px',
                    background: 'var(--accent)',
                    color: 'var(--accent-contraste)',
                    fontSize: 13,
                    fontWeight: 500,
                    ...(laResolucion === null ? { cursor: 'not-allowed', opacity: 0.5 } : { cursor: 'pointer' }),
                  }}
                >
                  Imprimir
                </button>
                {laResolucion === null && (
                  <p
                    id="fisc-resolucion-sin-hoja"
                    style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textAlign: 'right', textWrap: 'pretty' }}
                  >
                    La hoja está vacía: no hay nada que mandar a la impresora.
                  </p>
                )}
              </div>
            </div>

            {/* ── La hoja, sólo con una resolución leída ──────────────
                Todo lo que hay dentro sale de `ResolucionResource`. Ninguna
                cifra se recompone aquí: `total` lo suma el servidor —y sólo
                cuando conoce las dos partes—, y restar «determinado −
                declarado» para llenar la diferencia sería componer dinero en la
                pantalla (RNF-083) sobre un valor que se notifica. */}
            {laResolucion !== null && (
              /* Los 38 px de margen lateral —y no los 44 del artboard— salen de
                 medir: el cuadro de la determinacion mide 735 px con sus siete
                 columnas, y con 44 la hoja solo deja 732, asi que «Total S/»
                 quedaba 3 px fuera y la impresion salia cortada por el borde. */
              <section style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '40px 38px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 12, borderBottom: '2px solid var(--ink)' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>{pref.entidad}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>Sub Gerencia de Fiscalización Tributaria</p>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    <p style={{ margin: 0 }}>{laResolucion.numero}</p>
                    <p style={{ margin: '3px 0 0' }}>{laResolucion.fecha}</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>Resolución de determinación</h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                    Procedimiento de fiscalización tributaria — liquidación {laResolucion.nLiquidacion}, versión{' '}
                    {laResolucion.versionDeLaLiquidacion}
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
                  {metaDeLaResolucion(laResolucion).map((x) => (
                    <div key={x.k}>
                      <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{x.k}</p>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>{x.v}</p>
                    </div>
                  ))}
                </div>
                {/* Regla 9: la fecha a la que están las cifras, dicha una vez y
                    para todas. Van juntas porque se congelaron juntas —el día
                    de la resolución— y el papel no se recompone nunca con datos
                    vivos: el valor que arranca el plazo del artículo 137º es el
                    que se notificó, no el que saldría hoy. */}
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-3)' }}>Determinación al {laResolucion.aLaFecha}</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Cabeceras cols={sinOrden(REP_COLS)} />
                      </tr>
                    </thead>
                    <tbody>
                      {laResolucion.lineas.map((l) => (
                        <tr key={l.ejercicio} style={{ borderTop: '1px solid var(--line)' }}>
                          {[
                            String(l.ejercicio),
                            l.condicion,
                            l.determinado ?? SIN_DATO,
                            l.declarado ?? SIN_DATO,
                            l.diferencia ?? SIN_DATO,
                            l.multa ?? SIN_DATO,
                            l.total ?? SIN_DATO,
                          ].map((c, j) => (
                            <td key={j} style={estiloDeCelda(j, REP_COLS)}>
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* La misma frase que el PDF emitido imprime al pie de su
                    cuadro, y por el mismo motivo: un «—» en un valor
                    notificable tiene que decir que es una determinación
                    pendiente, porque leído como cero afirma que no se debe
                    nada. Las cinco columnas de dinero salen «—» hoy en todas
                    las filas: valorar un predio exige el cuadro de valores
                    unitarios, la depreciación y el arancel (D-02a). */}
                <p style={{ margin: '12px 0 0', fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Los importes marcados «{SIN_DATO}» están pendientes de determinación: no significan deuda cero.
                </p>
                {/* Las superficies, en su propio cuadro y no en el de arriba.
                    No es una preferencia: con las dos columnas dentro la tabla
                    medía 1 054 px sobre una hoja de 732 —medido en el
                    navegador—, así que las cuatro últimas columnas de dinero se
                    salían del papel y la impresión salía cortada. Y es además lo
                    que hace el PDF que el servidor emite, que las lleva a su
                    bloque «Inscripción en el padrón catastral».

                    Sólo se dibuja si alguna línea trae alguna: un cuadro entero
                    de «—» afirmaría que el acta midió y no halló nada, y lo que
                    pasa es que esa resolución no versionó ninguna superficie. */}
                {laResolucion.lineas.some((l) => l.areaDeclarada !== null || l.areaHallada !== null) && (
                  <div style={{ marginTop: 20, overflowX: 'auto' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-3)' }}>Superficies que sostienen el hallazgo</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <Cabeceras cols={sinOrden(REP_COLS_AREA)} />
                        </tr>
                      </thead>
                      <tbody>
                        {laResolucion.lineas.map((l) => (
                          <tr key={l.ejercicio} style={{ borderTop: '1px solid var(--line)' }}>
                            {[String(l.ejercicio), l.areaDeclarada ?? SIN_DATO, l.areaHallada ?? SIN_DATO].map((c, j) => (
                              <td key={j} style={estiloDeCelda(j, REP_COLS_AREA)}>
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ margin: '22px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                    <strong style={{ fontWeight: 600 }}>Sustento documental:</strong> {laResolucion.documentoSustento}
                  </p>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                    <strong style={{ fontWeight: 600 }}>Sustento:</strong> {laResolucion.sustento}
                  </p>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                    <strong style={{ fontWeight: 600 }}>Base legal:</strong> {laResolucion.baseLegal}
                  </p>
                </div>
                <p style={{ margin: '18px 0 0', fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                  Notifíquese al contribuyente el importe determinado. Contra la presente resolución procede recurso de reclamación dentro de
                  los veinte días hábiles siguientes a su notificación, conforme al artículo 137º del Código Tributario.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 56 }}>
                  <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Sub Gerente de Fiscalización Tributaria</div>
                  <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Notificado — contribuyente</div>
                </div>
              </section>
            )}

            {/* Lo que el recurso publica y el papel emitido NO imprime: queda
                fuera de la hoja para que lo que salga por la impresora sea el
                papel, y no el papel más lo que esta pantalla sabe.

                Las dos referencias de ficha son identificadores de FILA, no
                números de versión: el PDF imprime «versión de la ficha 2 → 3» y
                el JSON trae 24 → 14473, que son otra cosa. Se dicen como lo que
                son. */}
            {laResolucion !== null && (
              <div data-noprint="1" style={{ width: '100%', maxWidth: 820 }}>
                <Aviso tono="neutro" titulo="Lo que queda registrado del acto, y no va en el papel">
                  La registró <strong style={{ fontWeight: 600 }}>{laResolucion.usuarioRegistro ?? SIN_DATO}</strong> con la observación
                  «{laResolucion.observacion}» (RNF-052). Versionó la ficha catastral{' '}
                  {laResolucion.fichaAnteriorId === null ? SIN_DATO : laResolucion.fichaAnteriorId} →{' '}
                  {laResolucion.fichaNuevaId === null ? SIN_DATO : laResolucion.fichaNuevaId}, identificadores de fila y no números de
                  versión. Descargarla no la vuelve a emitir ni la marca «duplicado»: ya está numerada desde que se transfirió, y el
                  servidor entrega el modelo guardado comprobando su SHA-256.
                  <br />
                  <br />
                  El <strong style={{ fontWeight: 600 }}>R.U.C.</strong> y el <strong style={{ fontWeight: 600 }}>tipo de
                  fiscalización</strong> salen «{SIN_DATO}» arriba porque esta respuesta no los trae: el documento de identidad lo
                  compone el servidor al dibujar el papel —el PDF sí lo imprime— y el tipo de fiscalización es de la liquidación{' '}
                  {laResolucion.nLiquidacion}, no de la resolución.
                </Aviso>
              </div>
            )}
          </div>
        )}

        {/* ══════════ EL ACTA SIN CERRAR ══════════
            El artboard la ancla al pie de la ventana: es el aviso de que hay un
            borrador con cambios, y no depende del destino. */}
        {sucio && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              zIndex: 38,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              padding: '12px 20px',
              borderTop: '1px solid var(--line-2)',
              background: 'var(--bg-card)',
              boxShadow: '0 -6px 18px rgba(26,22,18,.06)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 999, padding: '5px 12px' }}>
              <Icono d={ICO.reloj} tam={13} grosor={2} />
              Acta sin cerrar
            </span>
            {/* Decia «El borrador se guarda en el dispositivo: si se cae la
                señal en el predio, lo escrito no se pierde», y no se guarda en
                ninguna parte: lo tecleado vive en el estado de React y se va con
                la pestaña. Es la frase gemela de las tres que #702 retiro, y
                sobrevivio porque esta en la barra pegajosa y no en el
                formulario. Peor aqui que en un boton: promete precisamente lo
                que quien levanta un acta de pie en la calle necesita creer. */}
            <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
              Lo escrito vive sólo en esta pestaña hasta que se cierre el acta: no hay borrador guardado en ningún sitio, ni en el
              dispositivo ni en el servidor.
            </p>
            <button
              onClick={() => {
                setVals({});
                setSucio(false);
                toast('Borrador descartado.');
              }}
              className="hov-linea"
              style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
            >
              Descartar
            </button>
            <button
              disabled
              title="No hay ninguna operación de borrador: el acta se registra entera con «Cerrar acta», en el paso 4."
              style={{ border: 0, borderRadius: 6, padding: '10px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'not-allowed', opacity: 0.5 }}
            >
              Guardar borrador
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

/**
 * Las columnas de «Omisos y subvaluadores», con lo que cada una es de verdad.
 *
 * Es el UNICO sitio donde se dice que columna hay y cual se puede ordenar: el
 * campo del orden va dentro de la columna que lo ofrece, tipado con
 * `OrdenDeOmisos` —los tres que el backend admite, medidos—, asi que una
 * cabecera no puede ofrecer un orden que no exista ni ordenar por otra cosa que
 * la que ensena.
 *
 * «Valor catastral», «Valor declarado» y «Diferencia S/» del artboard se
 * sustituyen por las areas, que es lo unico que el backend cuantifica hoy. El
 * impuesto omitido se queda —es la cifra que da sentido a la pantalla— y sale
 * «—» mientras D-02a impida calcularlo.
 *
 * <h2>Las tres de area SI son numeros, y la unidad va en la cabecera (#546)</h2>
 *
 * Hasta #546 llegaban con la unidad pegada —«180.50 m2», que es
 * `AreaM2.toString()`— y aqui se dibujaban verbatim, como texto y a la
 * izquierda; el razonamiento escrito era que «la unidad la lleva el dato, no la
 * cabecera, porque el dia que llegue en hectareas la cabecera mentiria». El
 * backend decidio lo contrario y lo hizo: los tres campos viajan tipados como
 * `AreaM2` y el serializador de `ConfiguracionDeJson` escribe `"180.50"`,
 * porque la unidad metida dentro obliga a cada consumidor a recortarla antes de
 * poder comparar. El dia que una superficie llegue en hectareas sera **otro
 * tipo**, no la misma columna con otro sufijo.
 *
 * Y el estado intermedio era el peor de los tres: con el arreglo dentro y esta
 * decision sin invertir, la celda enseñaba «180.50» a secas bajo una cabecera
 * que decia «Área catastral», sin decir en ninguna parte de que unidad habla.
 * Medido en la muni 1 antes de tocar nada: «180.50», «142.00», «96.75».
 *
 * Asi que ahora son columna numerica (`1`): mono, alineadas a la derecha, con
 * `tabular-nums` —dos areas se comparan de un vistazo cuando sus puntos
 * decimales estan en la misma vertical— y con el separador de miles que pone
 * `areaEnMetros`, que hace falta: en Catacaos hay areas de cuatro cifras
 * (10 422.90 m², medido). La unidad la dice la cabecera una vez.
 *
 * <h2>«Sector» es columna desde #608, y no es un adorno de la ordenacion</h2>
 *
 * El backend admite ordenar por sector, y hasta este issue la tabla no lo
 * dibujaba: era solo un filtro, una caja donde teclear «01» sin saber que
 * sectores hay. Ofrecer la cabecera sin la columna habria dejado a quien la
 * pulsa viendo las filas moverse sin poder ver segun que, asi que la columna
 * entra con el orden.
 *
 * El dato ya viajaba —`OmisoResource.sector`— y **puede ser nulo**: la consulta
 * une el sector con un `LEFT JOIN` a proposito, porque un predio sin sector es
 * uno de los casos que esta deteccion existe para encontrar. Ese predio salia
 * en la lista y su unica senal no se veia en ninguna parte; ahora su celda dice
 * «—». Medido hoy: en Catacaos las 14 422 filas traen sector —'00' casi todas,
 * y '04', '08', '16', '99' en la cola— y en la muni 1 van de '01' a '04'.
 *
 * Va en la segunda columna, pegada al codigo, porque el sector **es** un tramo
 * de ese codigo de 23 digitos: separarlos obligaria a leer el codigo entero
 * para saber donde cae el predio.
 *
 * <h2>Las cinco que NO ordenan, y por que no es lo mismo en todas</h2>
 *
 * «Titular» y «Condición» no las admite el repositorio y no piden ningun dato
 * nuevo para admitirlas: son columnas de la propia consulta. Las tres de
 * dinero y de area que quedan sin `orden` es otra cosa —«Área catastral»,
 * «Área declarada» e «Impuesto omitido S/»—: la primera y la segunda tampoco
 * estan en la lista blanca, y la tercera no podria ordenar aunque lo estuviera,
 * porque llega sin cifra en todas las filas mientras D-02a siga abierta.
 */
const COLUMNAS_DE_OMISOS: readonly ColumnaDeTabla<OrdenDeOmisos>[] = columnasQueOfrecenTodo<OrdenDeOmisos>()([
  { rotulo: 'Cód. ref. catastral', numerica: 0, orden: 'codRefCatastral' },
  { rotulo: 'Sector', numerica: 0, orden: 'sector' },
  { rotulo: 'Titular', numerica: 0 },
  { rotulo: 'Condición', numerica: 0 },
  { rotulo: 'Área catastral m²', numerica: 1 },
  { rotulo: 'Área declarada m²', numerica: 1 },
  { rotulo: 'Diferencia de área m²', numerica: 1, orden: 'diferenciaDeArea' },
  { rotulo: 'Impuesto omitido S/', numerica: 1 },
]);

/**
 * Las mismas columnas en la forma que `Celdas` necesita para alinear.
 *
 * Se DERIVA de la de arriba, no se escribe otra vez: dos listas de columnas de
 * la misma tabla se separan en cuanto alguien anade una, y lo que se descuadra
 * es la alineacion de todas las celdas a partir de ahi.
 */
const CELDAS_DE_OMISOS: ColDef[] = COLUMNAS_DE_OMISOS.map((c) => [c.rotulo, c.numerica]);

/**
 * El suelo de ancho de la tabla de deteccion, ahora que son ocho columnas.
 *
 * No sale de `DET_PREDIAL.min` —los 820 px del artboard, para siete columnas
 * que ya no son estas—, sino de medir la tabla conectada: con las ocho, siete
 * de ellas `nowrap`, ocupa **1 213 px** en Catacaos y su contenedor desplaza en
 * horizontal por debajo de eso (medido a 1 600, 1 100 y 820 px de ventana).
 *
 * O sea que hoy este suelo **no llega a actuar**, ni actuaba el de 820: una
 * columna que no parte no se deja estrechar por debajo de su contenido. Se
 * declara igual y con el numero de ESTA tabla porque es lo que sujeta el caso
 * en que las celdas vengan cortas —un ejercicio con cuatro filas de codigos
 * breves y sin titular—, donde sin suelo las ocho columnas se reparten el ancho
 * de la ventana y la cabecera queda separada de su dato.
 */
const ANCHO_MINIMO_DE_OMISOS = '960px';

/**
 * Las seis columnas de la muestra, con lo que el recurso publica de cada una.
 *
 * <h2>Aqui NO se puede decir si declaro fuera de plazo, y por eso no se dice (#570)</h2>
 *
 * La deteccion lo distingue desde #570 —dos insignias, ver `CeldaDeLaCondicion`—
 * y esta grilla no puede: `MuestraResource` publica el predio, el contribuyente,
 * su titular, las tres areas, la condicion y `visitado`, y **no publica**
 * `declaroFueraDePlazo`. No se hereda de la deteccion: la muestra se sorteo en
 * su dia y sus filas se leen de `programa_muestra`, no del cruce de hoy.
 * Suponerlo seria escribir en la columna de una fila un hecho que nadie ha
 * comprobado para ella.
 */
const COLUMNAS_DE_MUESTRA: ColDef[] = [
  ['Predio', 0],
  ['Contribuyente', 0],
  ['Uso declarado', 0],
  /* Numerica y con la unidad en la cabecera, por lo mismo que en omisos (#546):
     `MuestraResource` la publica como `AreaM2` y ya no trae « m2» dentro. */
  ['Área declarada m²', 1],
  ['Condición del cruce', 0],
  ['Estado', 0],
  /* La columna del acto. El artboard dibuja un boton por fila que dice que toca
     —«Levantar acta», «Ver acta», «Reprogramar»—; de los tres solo el primero
     tiene operacion detras, asi que es el unico que se dibuja (#431). */
  ['', 0],
];

/**
 * El estado de un programa: `EstadoDePrograma` tiene TRES y el artboard dibujaba
 * dos rotulos —«En ejecución» y «Cerrado»— que no son ninguno de ellos letra por
 * letra. Se rotulan los tres que existen, y uno que no conozcamos sale tal cual.
 */
const ESTADOS_DE_PROGRAMA: { valor: string; etiqueta: string; tono: Tono }[] = [
  { valor: 'ABIERTO', etiqueta: 'Abierto', tono: 'neutro' },
  { valor: 'EN_PROCESO', etiqueta: 'En proceso', tono: 'warn' },
  { valor: 'CERRADO', etiqueta: 'Cerrado', tono: 'ok' },
];

function etiquetaDelEstadoDelPrograma(valor: string): string {
  return ESTADOS_DE_PROGRAMA.find((e) => e.valor === valor)?.etiqueta ?? valor;
}

function tonoDelEstadoDelPrograma(valor: string): Tono {
  return ESTADOS_DE_PROGRAMA.find((e) => e.valor === valor)?.tono ?? 'neutro';
}

/**
 * Las seis celdas del resumen del programa.
 *
 * Cada una sale de un campo que `ProgramaResource` publica; la que no lo tiene
 * sale «—». «Muestra» es la unica que no esta en ese recurso: es el total del
 * sobre de `/muestra`, que es una lectura y no una cuenta compuesta aqui.
 */
function resumenDelPrograma(prog: ProgramaDeFiscalizacion | null, predios: number | null): [string, string][] {
  if (prog === null) {
    return [
      ['Programa', SIN_DATO],
      ['Tipo', SIN_DATO],
      ['Criterio de riesgo', SIN_DATO],
      ['Fiscalizador', SIN_DATO],
      ['Muestra', SIN_DATO],
      ['Plazo', SIN_DATO],
    ];
  }
  return [
    ['Programa', prog.codigo],
    ['Tipo', prog.tipo],
    /* El criterio es un `CondicionFiscalizada`, no la «SUBVALUACIÓN» del
       artboard: ese rotulo no es ninguno de los cinco del enumerado (#546). */
    ['Criterio de riesgo', prog.criterio === null ? SIN_DATO : etiquetaDeCondicion(prog.criterio)],
    ['Fiscalizador', prog.fiscalizador ?? SIN_DATO],
    ['Muestra', predios === null ? SIN_DATO : `${predios} ${predios === 1 ? 'predio' : 'predios'}`],
    ['Plazo', prog.fechaInicio + ' — ' + (prog.fechaFin ?? SIN_DATO)],
  ];
}

/** Las ocho columnas de resultados: lo que `LiquidacionResource` publica. */
const COLUMNAS_DE_RESULTADOS: ColDef[] = [
  ['Nº liquidación', 0],
  ['Versión', 0],
  ['Periodo', 0],
  ['Tipo', 0],
  ['Motivo determinante', 0],
  ['Nº notificación', 0],
  ['Deuda omitida S/', 0],
  ['Estado', 0],
  /* La novena no es un dato de la liquidacion: es con lo que se elige el sujeto
     de los otros dos actos —reliquidarla y moverla de estado—, que sin fila
     elegida no dibujan ningun formulario (#49). */
  ['Elegir', 0],
];

/** Las siete del estado de cuenta. El importe va con su fecha al lado (regla 9). */
const COLUMNAS_DE_ESTADO_DE_CUENTA: ColDef[] = [
  ['Nº liquidación', 0],
  ['Año', 0],
  ['Tributo', 0],
  ['Unidad', 0],
  ['Importe S/', 1],
  ['Actualizado a', 0],
  ['Condición', 0],
];

/**
 * Los CINCO estados de `EstadoDeLiquidacion`. El artboard dibujaba
 * «Determinado», «Notificado», «Reclamado» y «Conforme», y de los cuatro
 * **ninguno** es un valor del enumerado letra por letra —«Reclamado» ni
 * siquiera existe— (#546). No se traducen: se ofrecen los que hay.
 */
const ESTADOS_DE_LIQUIDACION: { valor: string; etiqueta: string; tono: Tono }[] = [
  { valor: 'ABIERTA', etiqueta: 'Abierta', tono: 'neutro' },
  { valor: 'EN_PROCESO', etiqueta: 'En proceso', tono: 'warn' },
  { valor: 'LIQUIDADA', etiqueta: 'Liquidada', tono: 'warn' },
  { valor: 'NOTIFICADA', etiqueta: 'Notificada', tono: 'ok' },
  { valor: 'ANULADA', etiqueta: 'Anulada', tono: 'bad' },
];

function etiquetaDelEstadoDeLiquidacion(valor: string): string {
  return ESTADOS_DE_LIQUIDACION.find((e) => e.valor === valor)?.etiqueta ?? valor;
}

function tonoDelEstadoDeLiquidacion(valor: string): Tono {
  return ESTADOS_DE_LIQUIDACION.find((e) => e.valor === valor)?.tono ?? 'neutro';
}

/**
 * Los CINCO valores de `Hallazgo`, letra por letra, y por que no son los de
 * `CONDICIONES` aunque hoy se escriban igual.
 *
 * El backend lo dice de si mismo: son «los mismos nombres y no el mismo
 * concepto». `Hallazgo` es lo que una PERSONA anota en el acta;
 * `CondicionFiscalizada` es lo que el sistema DERIVA comparando lo declarado
 * con lo hallado. Uno puede equivocarse y el otro no —un acta puede decir
 * CONFORME sobre un predio cuya area hallada supera la declarada, y la
 * liquidacion lo clasificara SUBVALUADOR igual—. Reusar aqui `CONDICIONES`
 * ahorraria cinco lineas y ataria dos vocabularios distintos: renombrar el
 * rotulo de una condicion cambiaria en silencio lo que dice un acta.
 *
 * `USO_DISTINTO` es el quinto, y llego con #599: hasta `V76` el acta guardaba
 * el area y ninguna columna de uso, asi que ese valor habria sido un hallazgo
 * que el acta no podia sustentar.
 *
 * **Ninguno de los seis rotulos del desplegable del manual es uno de estos.**
 * Medido contra el `POST` del acta predial, los seis contestan 422 «Hallazgo
 * desconocido»; ver `ActaDeFiscalizacion` en la fachada. Al leer se dibuja el
 * valor del enumerado con su etiqueta, y uno que no conozcamos sale tal cual.
 */
const HALLAZGOS: { valor: string; etiqueta: string; tono: Tono }[] = [
  { valor: 'CONFORME', etiqueta: 'Conforme', tono: 'ok' },
  { valor: 'OMISO', etiqueta: 'Omiso', tono: 'bad' },
  { valor: 'SUBVALUADOR', etiqueta: 'Subvaluador', tono: 'warn' },
  { valor: 'USO_DISTINTO', etiqueta: 'Uso distinto', tono: 'warn' },
  { valor: 'NO_UBICADO', etiqueta: 'No ubicado', tono: 'neutro' },
];

function etiquetaDelHallazgo(valor: string): string {
  return HALLAZGOS.find((h) => h.valor === valor)?.etiqueta ?? valor;
}

function tonoDelHallazgo(valor: string): Tono {
  return HALLAZGOS.find((h) => h.valor === valor)?.tono ?? 'neutro';
}

/**
 * Los CINCO estados de `EstadoDeActa`. No son los de la liquidacion aunque
 * cuatro nombres se repitan: un acta pasa a `RELIQUIDADA` y una liquidacion a
 * `NOTIFICADA`, y ninguno de los dos enumerados tiene el valor del otro.
 */
const ESTADOS_DE_ACTA: { valor: string; etiqueta: string; tono: Tono }[] = [
  { valor: 'ABIERTA', etiqueta: 'Abierta', tono: 'neutro' },
  { valor: 'LIQUIDADA', etiqueta: 'Liquidada', tono: 'warn' },
  { valor: 'RELIQUIDADA', etiqueta: 'Reliquidada', tono: 'warn' },
  { valor: 'TRANSFERIDA', etiqueta: 'Transferida', tono: 'ok' },
  { valor: 'ANULADA', etiqueta: 'Anulada', tono: 'bad' },
];

function etiquetaDelEstadoDelActa(valor: string): string {
  return ESTADOS_DE_ACTA.find((e) => e.valor === valor)?.etiqueta ?? valor;
}

function tonoDelEstadoDelActa(valor: string): Tono {
  return ESTADOS_DE_ACTA.find((e) => e.valor === valor)?.tono ?? 'neutro';
}

/**
 * Las once columnas del listado de actas, y cuales de ellas se dejan ordenar.
 *
 * Las cinco con `orden` son exactamente las cinco que `OrdenDeActas` declara
 * —las cinco que el backend admite, medidas—, y `columnasQueOfrecenTodo` no
 * deja que sean menos: ampliar la lista blanca del backend sin darle cabecera a
 * la columna que ensena ese dato **no compila**.
 *
 * <h2>«Nº interno» no es el numero del acta, y se dice</h2>
 *
 * El manual rotula esa caja «Nº de acta» y escribe `ACT-2026-00418`.
 * `ActaFiscalizacionResource` no publica ningun numero de ese estilo: publica
 * `id`, que es el identificador de la FILA. Se dibuja como lo que es —igual que
 * la hoja de la resolucion hace con `predioId`— porque cambiarlo por un codigo
 * que la respuesta no trae seria afirmar un dato que nadie leyo, y dejarlo sin
 * columna quitaria el unico orden estable que la lista tiene.
 *
 * <h2>Lo que no tiene columna, y por que</h2>
 *
 * `contribuyenteId` y `fichaId` son identificadores internos que no llevan a
 * ninguna parte desde aqui: el padron de Rentas busca por CODIGO municipal y
 * esta respuesta no lo trae, asi que una columna «Contribuyente 1» no serviria
 * para encontrar a nadie. `vehiculoId` no es una columna sino la otra mitad de
 * «Unidad»: cual de las dos familias es el acta lo dice cual de `predioId` y
 * `vehiculoId` viene con valor.
 */
const COLUMNAS_DE_ACTAS: readonly ColumnaDeTabla<OrdenDeActas>[] = columnasQueOfrecenTodo<OrdenDeActas>()([
  { rotulo: 'Nº interno', numerica: 1, orden: 'id' },
  { rotulo: 'Fecha de visita', numerica: 0, orden: 'fechaVisita' },
  { rotulo: 'Programa', numerica: 0 },
  { rotulo: 'Unidad', numerica: 0 },
  { rotulo: 'Fiscalizador', numerica: 0 },
  { rotulo: 'Hallazgo', numerica: 0, orden: 'hallazgo' },
  /* Numerica y con la unidad en la cabecera, por lo mismo que en omisos y en la
     muestra (#546): `AreaM2` ya no trae « m2» dentro. */
  { rotulo: 'Área hallada m²', numerica: 1 },
  { rotulo: 'Uso hallado', numerica: 0 },
  { rotulo: 'Detalle', numerica: 0 },
  { rotulo: 'Versión', numerica: 1, orden: 'version' },
  { rotulo: 'Estado', numerica: 0, orden: 'estado' },
]);


/**
 * El codigo del programa del que salio el acta, si esta en la lista traida.
 *
 * `ActaFiscalizacionResource` publica `programaId`, que es el identificador de
 * la fila; el codigo que se lee en el papel —`PF-593-01`— lo publica
 * `ProgramaResource`, y esa lista la trae la misma pantalla para el desplegable
 * del filtro. Se cruzan por id exacto, asi que no hay forma de escribir el
 * codigo equivocado; lo que si puede pasar es que el programa no este en la
 * pagina traida, y entonces se queda el numero dicho como lo que es. Inventarle
 * un codigo, o dejar la celda en blanco, seria peor que enseñar el numero.
 */
function codigoDelPrograma(programas: ProgramaDeFiscalizacion[], id: number): string {
  return programas.find((p) => p.id === id)?.codigo ?? 'Programa ' + String(id);
}

/**
 * Cual es la unidad fiscalizada del acta, dicha como lo que el recurso trae.
 *
 * Son identificadores de FILA —no el codigo de referencia catastral ni la
 * placa—, asi que se rotulan «Predio 2» y «Vehículo 7» y no se disfrazan de un
 * codigo que esta respuesta no publica. Las dos nulas a la vez no deberian
 * darse —`acta_fiscalizacion` exige una u otra—, y si se dieran la celda lo
 * dice en vez de quedarse en blanco: un blanco se lee como «se cargo y no hay».
 */
function unidadDelActa(acta: ActaDeFiscalizacion): string {
  if (acta.predioId !== null) return 'Predio ' + String(acta.predioId);
  if (acta.vehiculoId !== null) return 'Vehículo ' + String(acta.vehiculoId);
  return SIN_DATO + ' sin unidad';
}

/**
 * Las cuatro etapas del embudo, con la cifra que cada una PUEDE leer.
 *
 * El artboard traia 96 / 84 / 61 / 38 sobre una base de 96, y ninguna de las
 * cuatro sale de ningun sitio: #505 lo dice —«el embudo pide nueve cifras y el
 * contrato publica dos»—. Aqui cada etapa es exactamente el total del sobre de
 * una consulta, y la que no tiene consulta vale `null` y se dibuja «—».
 *
 * La proporcion se calcula sobre la muestra, y solo cuando la cifra Y la base
 * son las dos lecturas: una barra pintada con una base supuesta se lee como un
 * avance, que es justo lo que un panel no puede inventarse.
 */
function etapasDelEmbudo(
  muestra: number | null,
  inspeccionadas: number | null,
  liquidadas: number | null,
  notificadas: number | null,
): { etapa: string; detalle: string; valor: number | null; parte: number | null; dest: string }[] {
  const proporcion = (valor: number | null): number | null =>
    valor === null || muestra === null || muestra === 0 ? null : (valor / muestra) * 100;
  return [
    { etapa: 'Programados', detalle: 'Predios sorteados en la muestra', valor: muestra, parte: proporcion(muestra), dest: 'programas' },
    {
      /* La que faltaba, y desde #599 sale de una lectura: el total del sobre de
         `GET /fiscalizacion/actas?programa=‹id›`. Sigue sin haber recuento de
         «visitados» —`visitado` viaja fila a fila en la muestra—, y esto no es
         lo mismo aunque hoy se parezca: cuenta ACTAS, y un predio revisitado
         tiene dos, asi que puede pasar de los programados. Por eso la barra
         puede llegar a mas del 100 %, y es lo que hay que enseñar en vez de
         recortarla. */
      etapa: 'Inspeccionados',
      detalle: 'Actas levantadas en este programa',
      valor: inspeccionadas,
      parte: proporcion(inspeccionadas),
      dest: 'actas',
    },
    { etapa: 'Con liquidación', detalle: 'Actas del programa que llegaron a liquidarse', valor: liquidadas, parte: proporcion(liquidadas), dest: 'resultados' },
    { etapa: 'Notificadas', detalle: 'Las mismas, con estado NOTIFICADA', valor: notificadas, parte: proporcion(notificadas), dest: 'resultados' },
  ];
}

/** Lo que sigue sin acta en la pagina de muestra que se trajo. */
function pendientesDeVisita(filas: FilaDeMuestra[]): FilaDeMuestra[] {
  return filas.filter((f) => !f.visitado);
}

/** Lo que se dibuja donde el backend no publica cifra. */
const SIN_DATO = '—';

/**
 * La cabecera del papel de la resolucion, con lo que el recurso publica.
 *
 * <h2>Dos rotulos del artboard que el recurso NO sostiene</h2>
 *
 * El artboard dibuja seis y `ResolucionResource` sostiene cuatro:
 *
 * <ul>
 *   <li><b>R.U.C.</b> no viaja. El PDF que el servidor emite SI lo imprime
 *       —«Documento: DNI 00000001»—, porque lo compone del padron al dibujar el
 *       papel, y el JSON no lleva ningun campo de documento. Se queda el rotulo
 *       con «—» y se dice donde si esta, que es la unica forma de que quien lo
 *       necesita sepa que hacer.
 *   <li><b>Tipo de fiscalizacion</b> tampoco: es de la LIQUIDACION
 *       —`LiquidacionResource.tipoDeFiscalizacion`, «CIERTA», «PRESUNTA»…— y no
 *       de la resolucion. Rellenarlo con lo que se parezca es lo que #427 se
 *       nego a hacer con «ACTIVA»: la resolucion nombra su liquidacion, y de
 *       ahi sale, pero eso es OTRA lectura y componerla aqui seria afirmar en
 *       un valor notificable un dato que esta respuesta no trae.
 * </ul>
 *
 * <h2>«Predio» pasa a «Unidad fiscalizada»</h2>
 *
 * Porque tambien puede ser un vehiculo: `ResolucionResource` publica
 * `predioId` y `vehiculoId`, y son excluyentes. El rotulo es el que el propio
 * PDF emitido imprime, y el valor tambien —«Predio 1»—: son los
 * identificadores INTERNOS de la unidad, no el codigo de referencia catastral
 * ni la placa, y ninguno de los dos viaja en esta respuesta. Se dibujan como lo
 * que son en vez de cambiarse por un codigo que nadie leyo.
 */
function metaDeLaResolucion(r: ResolucionDeDeterminacion): { k: string; v: string }[] {
  const unidad =
    r.predioId !== null
      ? `Predio ${r.predioId}`
      : r.vehiculoId !== null
        ? `Vehiculo ${r.vehiculoId}`
        : SIN_DATO;
  return [
    { k: 'Nº de resolución', v: r.numero },
    { k: 'Contribuyente', v: r.contribuyente ?? SIN_DATO },
    { k: 'Cód. de contribuyente', v: r.codContribuyente ?? SIN_DATO },
    { k: 'R.U.C.', v: SIN_DATO },
    { k: 'Unidad fiscalizada', v: unidad },
    { k: 'Periodo fiscalizado', v: `${r.periodoDesde} — ${r.periodoHasta}` },
    { k: 'Tipo de fiscalización', v: SIN_DATO },
    { k: 'Liquidación', v: `${r.nLiquidacion} · v${r.versionDeLaLiquidacion}` },
  ];
}

/**
 * Una superficie, con separador de miles y SIN pasar por `Number`.
 *
 * Llega como texto decimal exacto de un `numeric(_,2)` —«180.50», «10422.90»—
 * y sale como «180.50» y «10,422.90». Se agrupa sobre la CADENA: convertir a
 * `Number` para volver a formatear es como se pierde un decimal (RNF-055), y
 * `toLocaleString` sobre `10422.9` ya no sabe que el dato tenia dos.
 *
 * <h2>Esto se le pone a un area y a nada mas</h2>
 *
 * El separador de miles no es decoracion: le cambia el texto a lo que no es una
 * cantidad. En este modulo el ejemplo esta en la columna de al lado —el codigo
 * de referencia catastral, `20010401001001000000000`, 23 digitos que
 * identifican un predio y con los que se le busca en ventanilla—, y por eso
 * esta funcion se llama por su dato y no «formatear numero»: se aplica a las
 * tres areas, y el codigo va en la columna 0, que es texto y no pasa por aqui.
 *
 * La guarda de dentro cubre lo otro: sale verbatim todo lo que no sea un
 * decimal sin signo y **sin ceros a la izquierda** —que es exactamente lo que
 * `BigDecimal.toPlainString()` produce de un area no negativa—. Asi «180.50 m2»
 * sale con su unidad si el backend volviera a mandarla, y un `00001182` no se
 * convierte en «00 001 182», que es lo que un agrupador sin esa guarda ya hizo
 * una vez.
 *
 * El separador es la coma y el decimal el punto, que es lo que
 * `toLocaleString('es-PE')` usa en el resto de la interfaz.
 */
function areaEnMetros(valor: string | null): string {
  if (valor === null) return SIN_DATO;
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(valor)) return valor;
  const punto = valor.indexOf('.');
  const entero = punto === -1 ? valor : valor.slice(0, punto);
  const decimales = punto === -1 ? '' : valor.slice(punto);
  return entero.replace(/\B(?=(\d{3})+$)/g, ',') + decimales;
}

/** Cuantas filas se piden por pagina. */
const TAMANO_DE_PAGINA = 20;

/** Una fila de la tabla de deteccion, con la identidad que la selecciona. */
type FilaDeDeteccion = {
  /**
   * Identifica la fila. Para el predial es el `codRefCatastral` **a secas**:
   * desde #545 la fila ES el predio, y ese codigo es unico por municipalidad
   * (`predio_codigo_uq`, V1). La medicion esta en `filasDeOmisos`.
   */
  llave: string;
  /** El valor del enumerado tal como viaja, no su rotulo. */
  condicion: string;
  /** El o los titulares, para nombrar la casilla. `null` si el predio no tiene ninguno. */
  titular: string | null;
  celdas: ReactNode[];
};

/**
 * Las CINCO condiciones de `CondicionFiscalizada`, letra por letra.
 *
 * El enumerado del backend tiene cinco valores y el desplegable ofrecia dos.
 * Peor: el rotulo se resolvia con `condicion === 'OMISO' ? 'Omiso' :
 * 'Subvaluador'`, asi que en cuanto exista una declaracion jurada un predio
 * CONFORME —o uno NO_UBICADO, que es «no se pudo verificar»— saldria rotulado
 * «Subvaluador» y teñido de ambar. Los cinco los acepta la consulta
 * (comprobado: `?condicion=CONFORME` da 200; `?condicion=BASURA`, 422).
 *
 * El tono sale del VALOR y no del texto. La version anterior clasificaba con
 * una expresion regular sobre el ROTULO, y ahi «Uso distinto» y «No ubicado»
 * caian en verde —el color de «conforme»— porque no casan con ningun patron.
 * Esa funcion ya no existe: su ultimo consumidor era la insignia que componia
 * `Celdas`, y desde #545 la condicion la dibuja `CeldaDeLaCondicion` con
 * `tonoDeCondicion`.
 */
const CONDICIONES: { valor: string; etiqueta: string; tono: Tono }[] = [
  { valor: 'CONFORME', etiqueta: 'Conforme', tono: 'ok' },
  { valor: 'OMISO', etiqueta: 'Omiso', tono: 'bad' },
  { valor: 'SUBVALUADOR', etiqueta: 'Subvaluador', tono: 'warn' },
  { valor: 'USO_DISTINTO', etiqueta: 'Uso distinto', tono: 'warn' },
  { valor: 'NO_UBICADO', etiqueta: 'No ubicado', tono: 'neutro' },
];

/** El rotulo de una condicion. Una que no conozcamos sale TAL CUAL. */
function etiquetaDeCondicion(valor: string): string {
  return CONDICIONES.find((c) => c.valor === valor)?.etiqueta ?? valor;
}

/** El tono de una condicion. Una que no conozcamos no se colorea. */
function tonoDeCondicion(valor: string): Tono {
  return CONDICIONES.find((c) => c.valor === valor)?.tono ?? 'neutro';
}
