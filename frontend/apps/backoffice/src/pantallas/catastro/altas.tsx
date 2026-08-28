import type { ReactNode } from 'react';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import type { IdDeOperacion } from '@sgtm/api-client';
import type { AltaEnPanelProps } from '../composicion';
import { useEscritura } from '../escritura';
import type { Escritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { textoDeError } from '../estados';

/**
 * Las tres altas del catalogo territorial: sector, manzana y via (#321).
 *
 * Las tres son formularios de dos o tres campos y **las tres exigen la
 * observacion del usuario** (regla 10, RNF-052), asi que comparten el mismo
 * cierre: mientras la observacion este vacia, el boton de registrar no se
 * habilita. No es un aviso amable, es la condicion de guardado —y aqui vive en
 * `useEscritura`, que es el unico camino de escritura del frontend—.
 *
 * Lo que cada una manda esta declarado campo a campo en `pantallas/escrituras.ts`,
 * por el `operationId` de su `POST`. Un campo que el formulario dibuje y la
 * declaracion no tenga **no viaja y ni siquiera se puede escribir**: es la misma
 * lista blanca que impide que una contrasena acabe en el estado de React.
 *
 * Hasta hoy el boton «Nuevo sector» del prototipo estaba muerto: dibujado,
 * deshabilitado y sin operacion detras.
 */

/** Los diez tipos de via del manual, tal como los enumera `TipoVia` en el backend. */
const TIPOS_DE_VIA = [
  'AVENIDA',
  'CALLE',
  'JIRON',
  'PASAJE',
  'CARRETERA',
  'MALECON',
  'OVALO',
  'PLAZA',
  'PROLONGACION',
  'OTRO',
];

export function AltaDeSector({ onCerrar }: AltaEnPanelProps) {
  const escritura = useAlta('registrar_sector', {}, (borrador) =>
    borrador['codigo'] === undefined || borrador['codigo'].trim() === ''
      ? 'Falta el código del sector.'
      : borrador['nombre'] === undefined || borrador['nombre'].trim() === ''
        ? 'Falta la denominación del sector.'
        : undefined,
  );

  return (
    <FormularioDeAlta escritura={escritura} accion="Registrar sector" onCerrar={onCerrar}>
      {/* El codigo del sector es **un tramo del codigo catastral de sus
          predios**: por eso el `PUT` no lo deja cambiar y por eso se teclea con
          cuidado aqui, que es la unica vez que se puede elegir. */}
      <CampoDeAlta escritura={escritura} campo="codigo" etiqueta="Código de sector" ph="01" />
      <CampoDeAlta
        escritura={escritura}
        campo="nombre"
        etiqueta="Denominación"
        ph="Cercado de Sullana"
      />
      <CampoDeAlta
        escritura={escritura}
        campo="zona"
        etiqueta="Zona de arbitrios"
        ph="Opcional. Zona 1"
      />
    </FormularioDeAlta>
  );
}

export function AltaDeManzana({ contexto, onCerrar }: AltaEnPanelProps) {
  const sector = contexto ?? '';
  const escritura = useAlta('registrar_manzana', { codigo: sector }, (borrador) =>
    borrador['codigo'] === undefined || borrador['codigo'].trim() === ''
      ? 'Falta el código de la manzana.'
      : undefined,
  );

  return (
    <FormularioDeAlta escritura={escritura} accion="Registrar manzana" onCerrar={onCerrar}>
      <Campo etiqueta="Sector" tipo="ro" valor={sector} />
      <CampoDeAlta escritura={escritura} campo="codigo" etiqueta="Código de manzana" ph="001" />
      {/* Se dice antes de teclear, no despues de guardar: no hay verbo para
          corregir una manzana, porque su codigo es un tramo del codigo catastral
          de sus predios y cambiarlo los desalinearia todos. */}
      <Aviso
        titulo="Una manzana no se corrige después"
        detalle="Su código es un tramo del código catastral de todos sus predios, así que el sistema no ofrece editarla. Lo que se hace con una manzana equivocada es dar de alta la correcta y mover los predios."
      />
    </FormularioDeAlta>
  );
}

export function AltaDeVia({ onCerrar }: AltaEnPanelProps) {
  const escritura = useAlta('registrar_via', {}, (borrador) =>
    borrador['codigo'] === undefined || borrador['codigo'].trim() === ''
      ? 'Falta el código de la vía.'
      : borrador['nombre'] === undefined || borrador['nombre'].trim() === ''
        ? 'Falta el nombre de la vía.'
        : undefined,
  );

  return (
    <FormularioDeAlta escritura={escritura} accion="Registrar vía" onCerrar={onCerrar}>
      <CampoDeAlta escritura={escritura} campo="codigo" etiqueta="Código de vía" ph="00001182" />
      {/* El tipo es un enum y no texto libre a proposito: con texto libre la
          misma calle entra tres veces —AV., AVENIDA, Avenida— y el padron acaba
          con tres vias donde hay una. */}
      <CampoDeAlta
        escritura={escritura}
        campo="tipo"
        etiqueta="Tipo de vía"
        tipo="sel"
        opciones={TIPOS_DE_VIA}
      />
      <CampoDeAlta escritura={escritura} campo="nombre" etiqueta="Nombre" ph="JOSÉ DE LAMA" />
      <CampoDeAlta escritura={escritura} campo="ubigeo" etiqueta="Ubigeo" ph="Opcional. 200601" />
    </FormularioDeAlta>
  );
}

/**
 * El alta, con su lista blanca y lo que ademas de la observacion hace falta.
 *
 * `exigir` recibe el borrador para que la condicion se lea donde se entiende
 * —«falta la denominación del sector»— en vez de dejar pulsar y contestar con un
 * 422 del servidor a algo que la pantalla ya sabia.
 */
function useAlta(
  operacion: IdDeOperacion,
  parametros: Readonly<Record<string, string>>,
  exigir: (borrador: Readonly<Record<string, string>>) => string | undefined,
): Escritura {
  const declarada = escrituraDe(operacion);
  return useEscritura(operacion, parametros, { campos: declarada?.campos ?? {}, exigir });
}

function CampoDeAlta({
  escritura,
  campo,
  etiqueta,
  tipo = 'text',
  ph,
  opciones,
}: {
  readonly escritura: Escritura;
  readonly campo: string;
  readonly etiqueta: string;
  readonly tipo?: 'text' | 'sel';
  readonly ph?: string;
  readonly opciones?: readonly string[];
}) {
  return (
    <Campo
      etiqueta={etiqueta}
      tipo={tipo}
      valor={escritura.borrador[campo] ?? ''}
      // Un campo que la opcion no declaro no se puede escribir: la lista blanca
      // se aplica aqui y otra vez al enviar, y las dos barreras protegen de
      // cosas distintas.
      bloqueado={!escritura.campos.has(campo)}
      {...(ph === undefined ? {} : { ph })}
      {...(opciones === undefined ? {} : { opciones })}
      {...(escritura.errorPorCampo[campo] === undefined
        ? {}
        : { error: escritura.errorPorCampo[campo] })}
      onCambio={(valor) => escritura.fijarCampo(campo, valor)}
    />
  );
}

/**
 * El cierre que comparten las tres: la observacion, el error del servidor tal
 * como lo redacto, y la accion que no se habilita sin ella.
 */
function FormularioDeAlta({
  escritura,
  accion,
  onCerrar,
  children,
}: {
  readonly escritura: Escritura;
  readonly accion: string;
  readonly onCerrar: () => void;
  readonly children: ReactNode;
}) {
  return (
    <>
      {children}

      <Campo
        etiqueta="Observación"
        tipo="area"
        ancho
        valor={escritura.observacion}
        ph="Por qué se da de alta. Queda en la auditoría junto a tu usuario."
        {...(escritura.errorPorCampo['observacion'] === undefined
          ? {}
          : { error: escritura.errorPorCampo['observacion'] })}
        onCambio={escritura.fijarObservacion}
      />

      {escritura.error !== undefined && escritura.error !== null && (
        <ErrorDelAlta error={escritura.error} />
      )}

      {escritura.enviada && (
        <p className="sgtm-escritura__hecho" role="status">
          Guardado, con tu observación en la auditoría.
        </p>
      )}

      <div className="sgtm-lateral__acciones">
        <Boton onClick={onCerrar}>Cerrar</Boton>
        <Boton
          variante="primario"
          disabled={!escritura.puedeEnviar}
          title={escritura.falta ?? tituloDe(escritura, accion)}
          onClick={escritura.enviar}
        >
          {escritura.enviando ? `${accion}…` : accion}
        </Boton>
      </div>
      {escritura.falta !== undefined && <p className="sgtm-lateral__falta">{escritura.falta}</p>}
    </>
  );
}

const tituloDe = (escritura: Escritura, accion: string): string | undefined =>
  escritura.observacion.trim() === ''
    ? `Escribe la observación para poder ${accion.toLowerCase()}`
    : undefined;

function ErrorDelAlta({ error }: { readonly error: unknown }) {
  const texto = textoDeError(error);
  return <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza} />;
}
