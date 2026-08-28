import { useState } from 'react';
import { Aviso, Campo } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { SIN_PERMISO } from '../estados';
import { notaDe } from '../prosa';
import { EJERCICIOS_DEL_DESPLEGABLE } from './index';
import { CampoDeclarado } from './CampoDeclarado';

const TRIBUTOS = ['IMPUESTO PREDIAL', 'ARBITRIOS', 'PATRIMONIO VEHICULAR', 'MULTA'];

const PLAZOS = [
  '4 AÑOS — DECLARACIÓN PRESENTADA',
  '6 AÑOS — NO PRESENTÓ DECLARACIÓN',
  '10 AÑOS — AGENTE DE RETENCIÓN',
];

/** «Sin interrupción»: la única opción del catálogo que no arma ningún hecho. */
const SIN_INTERRUPCION = 'NINGUNO';

const ACTOS_DE_INTERRUPCION = [
  SIN_INTERRUPCION,
  'NOTIFICACIÓN DE ORDEN DE PAGO',
  'PAGO PARCIAL',
  'RECONOCIMIENTO DE DEUDA',
  'NOTIFICACIÓN DE REC',
  'SOLICITUD DE FRACCIONAMIENTO',
];

/**
 * Prescripción de la deuda: `POST /coactiva/prescripcion` (#39, #75).
 *
 * **Por que su propio componente**: dos huecos de forma que `CampoDelCuerpo` no puede
 * expresar. `PeticionDePrescripcion` pide `ejercicioDesde`/`ejercicioHasta` como dos
 * enteros, y el catalogo dibuja un solo campo de texto libre («Ejercicios solicitados»);
 * esta pantalla dibuja dos selectores de ejercicio en su lugar, cada uno escribiendo el
 * campo declarado que le toca —no hay traducción de un texto a dos campos—. Y
 * `actoDeInterrupcion`/`fechaDelUltimoActo` solo pueden viajar como el único elemento de
 * `hechos`, un arreglo (`HECHO_DE_INTERRUPCION` en `escrituras.ts`), aunque sea opcional:
 * una prescripción sin interrupciones es una petición válida, y entonces la tabla se
 * sincroniza vacía —no se manda `hechos: [{}]`—.
 */
export function PrescripcionDeLaDeuda({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const declarada = escrituraDe(estructura.id);
  const nota = notaDe(estructura.id);

  const [acto, fijarActo] = useState('');
  const [fechaDelActo, fijarFechaDelActo] = useState('');

  const escritura = useEscritura(
    puedeEscribirAqui ? 'prescripcion' : undefined,
    {},
    {
      campos: declarada?.campos ?? {},
      tablas: declarada?.tablas ?? {},
      exigir: (borrador) => {
        if ((borrador['codContribuyente'] ?? '').trim() === '') {
          return 'Falta el código de contribuyente: quién solicita.';
        }
        if ((borrador['tributo'] ?? '').trim() === '') return 'Elige el tributo.';
        const desde = Number.parseInt(borrador['ejercicioDesde'] ?? '', 10);
        const hasta = Number.parseInt(borrador['ejercicioHasta'] ?? '', 10);
        if (!Number.isInteger(desde) || !Number.isInteger(hasta)) {
          return 'Elige el ejercicio desde y el ejercicio hasta.';
        }
        if (desde > hasta) {
          return 'El ejercicio desde no puede ser posterior al ejercicio hasta.';
        }
        if ((borrador['plazoAplicable'] ?? '').trim() === '') {
          return 'Elige el plazo aplicable: de él depende el cómputo.';
        }
        // Un acto de interrupción elegido y sin fecha no arma un hecho válido:
        // `HechoDelComputo` exige la fecha, y la tabla se sincroniza vacía en
        // ese caso (ver más abajo), así que la prescripción se declararía sin
        // la interrupción que se dijo que tenía.
        if (acto !== '' && acto !== SIN_INTERRUPCION && fechaDelActo.trim() === '') {
          return 'Falta la fecha del acto de interrupción elegido.';
        }
        return undefined;
      },
    },
  );

  // Tras declarar, la observación se vació: se limpia también lo que solo
  // vive en el estado de esta pantalla, para que el próximo intento no arme
  // otra vez el mismo hecho sin que nadie lo haya vuelto a elegir.
  if (escritura.enviada && (acto !== '' || fechaDelActo !== '')) {
    fijarActo('');
    fijarFechaDelActo('');
  }

  const puedeEscribirLosHechos = escritura.tablas.has('hechos');
  const hechoQueToca =
    puedeEscribirLosHechos && acto !== '' && acto !== SIN_INTERRUPCION && fechaDelActo !== ''
      ? [{ clase: 'INTERRUPCION', causal: acto, fechaDesde: fechaDelActo }]
      : [];
  const hechoActual = escritura.filasDe('hechos');
  if (
    puedeEscribirLosHechos &&
    (hechoActual[0]?.['causal'] !== hechoQueToca[0]?.['causal'] ||
      hechoActual[0]?.['fechaDesde'] !== hechoQueToca[0]?.['fechaDesde'] ||
      hechoActual.length !== hechoQueToca.length)
  ) {
    escritura.fijarFilas('hechos', hechoQueToca);
  }

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}
      {nota !== undefined && <Aviso titulo="Cómo funciona esta pantalla" detalle={nota} />}

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Solicitud</h2>
        </div>
        <CampoDeclarado
          escritura={escritura}
          campo="codContribuyente"
          etiqueta="Cod. Contribuyente"
        />
        <CampoDeclarado
          escritura={escritura}
          campo="tributo"
          etiqueta="Tributo"
          tipo="sel"
          opciones={TRIBUTOS}
        />
        <CampoDeclarado
          escritura={escritura}
          campo="ejercicioDesde"
          etiqueta="Ejercicio desde"
          tipo="sel"
          opciones={EJERCICIOS_DEL_DESPLEGABLE}
        />
        <CampoDeclarado
          escritura={escritura}
          campo="ejercicioHasta"
          etiqueta="Ejercicio hasta"
          tipo="sel"
          opciones={EJERCICIOS_DEL_DESPLEGABLE}
        />
        <CampoDeclarado
          escritura={escritura}
          campo="fechaDePresentacion"
          etiqueta="Fecha de presentación"
          tipo="date"
          ayuda="Sin fecha, hoy."
        />
      </section>

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Cómputo del plazo</h2>
        </div>
        <CampoDeclarado
          escritura={escritura}
          campo="plazoAplicable"
          etiqueta="Plazo aplicable"
          tipo="sel"
          opciones={PLAZOS}
        />
        <Campo
          etiqueta="Acto de interrupción"
          tipo="sel"
          opciones={ACTOS_DE_INTERRUPCION}
          valor={acto}
          bloqueado={!puedeEscribirLosHechos}
          onCambio={fijarActo}
        />
        <Campo
          etiqueta="Fecha del último acto"
          tipo="date"
          valor={fechaDelActo}
          bloqueado={!puedeEscribirLosHechos || acto === '' || acto === SIN_INTERRUPCION}
          onCambio={fijarFechaDelActo}
        />
        <CampoDeclarado
          escritura={escritura}
          campo="nDeResolucion"
          etiqueta="Nº de resolución"
          ayuda="Si ya se emitió."
        />
      </section>

      <BarraDeAcciones acciones={['Declarar prescripción']} escritura={escritura} />
    </>
  );
}
