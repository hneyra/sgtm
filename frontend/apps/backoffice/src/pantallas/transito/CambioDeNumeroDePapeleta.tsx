import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { SIN_PERMISO } from '../estados';

/**
 * Cambio de número de papeleta: `PATCH /transito/papeletas/{numero}/codigo` (RF-067, #77).
 *
 * **Por qué su propio componente y no el renderizador genérico**: el catálogo dibuja las
 * acciones de esta pantalla como `["Consultar", "Modificar", "Salir"]` —son las de una
 * barra de mantenimiento de escritorio, no las de este acto—, y el renderizador genérico
 * trata **la última** como la primaria que escribe. Aquí la última es «Salir», que no
 * corrige nada: conectarla tal cual habría hecho que confirmar la observación y pulsar el
 * botón que dice «salir» corrigiera en silencio el número de la papeleta. Con una barra
 * propia de una sola acción —«Cambiar número», siempre la primaria— el botón dice lo que
 * hace.
 *
 * El número **actual** llega por la ruta, igual que `PaseACoactiva`: se abre por él, no se
 * teclea en un campo. La papeleta nueva es el único dato que `PeticionDeCambioDeNumero`
 * acepta —ni la placa ni el «Cod. papeleta»/«Placa Nº» de la sección del catálogo tienen
 * dónde viajar (`CambioDeNumeroController`, ver `escrituras.ts`)—.
 */
export function CambioDeNumeroDePapeleta({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  const { codigo: numero } = useParams();
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const declarada = escrituraDe(estructura.id);

  const escritura = useEscritura(
    puedeEscribirAqui && numero !== undefined && numero !== ''
      ? 'transito_cambio_numero'
      : undefined,
    numero === undefined ? {} : { numero },
    { campos: declarada?.campos ?? {} },
  );

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (numero === undefined || numero === '') {
    return (
      <Aviso
        titulo="Elige una papeleta para corregir su número"
        detalle="Esta pantalla abre una papeleta por su número actual. Búscala en «Búsqueda de infracciones» o pega el enlace: el número va en la dirección, así que se puede compartir."
      >
        <AbrirPorNumero />
      </Aviso>
    );
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Cambio de número de papeleta</h2>
        </div>
        <Campo etiqueta="Cod. papeleta" tipo="ro" valor={numero} />
        <Campo
          etiqueta="Cod. papeleta nueva"
          tipo="text"
          valor={escritura.borrador['codPapeletaNueva'] ?? ''}
          bloqueado={!escritura.campos.has('codPapeletaNueva')}
          {...(escritura.errorPorCampo['codPapeletaNueva'] === undefined
            ? {}
            : { error: escritura.errorPorCampo['codPapeletaNueva'] })}
          onCambio={(valor) => escritura.fijarCampo('codPapeletaNueva', valor)}
        />
      </section>

      <BarraDeAcciones acciones={['Cambiar número']} escritura={escritura} />
    </>
  );
}

/** Componer el numero de la papeleta que se va a corregir, y abrirla. */
function AbrirPorNumero() {
  const navegar = useNavigate();
  const [numero, fijarNumero] = useState('');

  return (
    <>
      <Campo etiqueta="Nº de papeleta" tipo="text" valor={numero} onCambio={fijarNumero} />
      <Boton
        variante="primario"
        disabled={numero.trim() === ''}
        onClick={() =>
          navegar(`/transito/transito-cambio-numero/${encodeURIComponent(numero.trim())}`)
        }
      >
        Abrir papeleta
      </Boton>
    </>
  );
}
