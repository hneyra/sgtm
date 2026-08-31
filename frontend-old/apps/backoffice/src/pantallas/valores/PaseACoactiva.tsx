import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { SIN_PERMISO } from '../estados';
import { CampoDeclarado } from './CampoDeclarado';

/**
 * Pase de un valor a cobranza coactiva: `POST /valores/{numero}/movimientos` (#39, #75).
 *
 * **Por que su propio componente y no el renderizador generico**: el catalogo dibuja las
 * acciones de esta pantalla como `["Nuevo", "Modificar", "Generar", "Inactivar",
 * "Imprimir"]` —son las de la ficha del manual, no las de este acto—, y el renderizador
 * generico trata **la ultima** como la primaria que escribe. Aqui la ultima es «Imprimir»,
 * que no escribe nada: conectarla tal cual dejaria pasar un valor a coactiva **sin ninguna
 * confirmacion**, justo lo que #75 pide evitar. Con una barra propia de una sola accion —
 * «Derivar a coactiva», siempre la primaria— la confirmacion de lo irreversible vuelve a
 * proteger el acto que de verdad hace esta pantalla.
 *
 * `tipoDeMovimiento` se fija en `PCO` sin preguntar (ver la nota de `escrituras.ts`): el
 * backend rechaza cualquier otro codigo desde esta ruta.
 */
export function PaseACoactiva({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const { codigo: numero } = useParams();
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const declarada = escrituraDe(estructura.id);

  const [sembrada, fijarSembrada] = useState(false);
  const escritura = useEscritura(
    puedeEscribirAqui && numero !== undefined && numero !== '' ? 'pase_coactiva' : undefined,
    numero === undefined ? {} : { numero },
    { campos: declarada?.campos ?? {} },
  );

  // Se fija una sola vez: es la unica respuesta que este endpoint acepta, y no
  // hay forma de que quien atiende la cambie por error si no hay control que
  // la muestre.
  if (!sembrada && escritura.campos.has('tipoDeMovimiento')) {
    fijarSembrada(true);
    escritura.fijarCampo('tipoDeMovimiento', 'PCO');
  }

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (numero === undefined || numero === '') {
    return (
      <Aviso
        titulo="Elige un valor para pasar a coactiva"
        detalle="Esta pantalla abre un valor por su número. Búscalo en «Búsqueda y mantenimiento de valores» o pega el enlace: el número va en la dirección, así que se puede compartir."
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
          <h2 className="sgtm-tarjeta__titulo">Pase a cobranza coactiva</h2>
        </div>
        <Campo etiqueta="Nº de valor" tipo="ro" valor={numero} />
        <Campo etiqueta="Tipo de movimiento" tipo="ro" valor="PCO — PASE A COACTIVAS" />
        <CampoDeclarado
          escritura={escritura}
          campo="fechaDelMovimiento"
          etiqueta="Fecha del movimiento"
          tipo="date"
          ayuda="Sin fecha, hoy."
        />
      </section>

      <BarraDeAcciones acciones={['Derivar a coactiva']} escritura={escritura} />
    </>
  );
}

/** Componer el numero del valor que se va a pasar a coactiva, y abrirlo. */
function AbrirPorNumero() {
  const navegar = useNavigate();
  const [numero, fijarNumero] = useState('');

  return (
    <>
      <Campo etiqueta="Nº de valor" tipo="text" valor={numero} onCambio={fijarNumero} />
      <Boton
        variante="primario"
        disabled={numero.trim() === ''}
        onClick={() => navegar(`/valores/pase-coactiva/${encodeURIComponent(numero.trim())}`)}
      >
        Abrir valor
      </Boton>
    </>
  );
}
