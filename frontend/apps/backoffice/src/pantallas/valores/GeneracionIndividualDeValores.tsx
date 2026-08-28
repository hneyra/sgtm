import { useState } from 'react';
import { Aviso, Campo } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { SIN_PERMISO } from '../estados';
import { notaDe } from '../prosa';
import { CampoDeclarado } from './CampoDeclarado';

const TIPOS_DE_VALOR = ['ORDEN DE PAGO', 'RESOLUCIÓN DE DETERMINACIÓN', 'RESOLUCIÓN DE MULTA'];
const TRIBUTOS = ['IMPUESTO PREDIAL', 'ARBITRIOS', 'PATRIMONIO VEHICULAR', 'ALCABALA', 'MULTA'];

/** Un ejercicio de cuatro dígitos: lo único que `Ejercicio` (backend) sabe leer. */
const EJERCICIO_VALIDO = /^\d{4}$/;

/**
 * Generación individual de valores: `POST /valores` (#37, #75).
 *
 * **Por que su propio componente y no el renderizador generico**: `PeticionDeValor
 * .obligaciones` es un arreglo, y el catalogo dibuja un formulario plano —un tributo, un
 * periodo—. `CampoDelCuerpo` solo sabe declarar campos sueltos hacia el cuerpo; esta
 * pantalla mantiene el tributo y el periodo en su propio estado y los sincroniza en una
 * tabla de, como mucho, una fila (`OBLIGACION_UNICA` en `escrituras.ts`) cada vez que
 * cambian —`fijarFilas` es quien filtra por la lista blanca de columnas y quien regenera
 * la clave de idempotencia, igual que `fijarCampo` con un campo suelto—.
 */
export function GeneracionIndividualDeValores({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const declarada = escrituraDe(estructura.id);
  const nota = notaDe(estructura.id);

  const [tributo, fijarTributo] = useState('');
  const [periodo, fijarPeriodo] = useState('');

  const escritura = useEscritura(
    puedeEscribirAqui ? 'valores_individual' : undefined,
    {},
    {
      campos: declarada?.campos ?? {},
      tablas: declarada?.tablas ?? {},
      exigir: (borrador, filas) => {
        if ((borrador['tipoDeValor'] ?? '').trim() === '') return 'Elige el tipo de valor.';
        if ((borrador['codContribuyente'] ?? '').trim() === '') {
          return 'Falta el código de contribuyente: a quién se le emite.';
        }
        const [obligacion] = filas['obligaciones'] ?? [];
        if ((obligacion?.['tributo'] ?? '') === '') return 'Elige el tributo que formaliza.';
        if ((obligacion?.['periodo'] ?? '') === '') {
          return 'Falta el periodo (el ejercicio) que formaliza.';
        }
        return undefined;
      },
    },
  );

  // Tras emitir, la observación se vació y la primaria vuelve a exigir una
  // nueva: si el tributo y el periodo se quedaran escritos, la fila que se
  // sincroniza abajo los volvería a mandar en el próximo intento sin que
  // nadie los hubiera vuelto a elegir. Se vacían aquí, no en `onSuccess` de
  // `useEscritura` —esta pantalla no le pertenece a esa mutación—.
  if (escritura.enviada && (tributo !== '' || periodo !== '')) {
    fijarTributo('');
    fijarPeriodo('');
  }

  const puedeEscribirLaTabla = escritura.tablas.has('obligaciones');
  // La obligación es la unica que este valor formaliza: se sincroniza con los
  // dos campos de abajo en cuanto ambos tienen algo que decir, y con la tabla
  // vacia mientras no lo tengan —una fila a medias no identifica ninguna
  // obligacion, y mandarla asi la rechazaria el servidor con un mensaje que no
  // explica que falta escribir aqui—.
  const filaQueToca =
    puedeEscribirLaTabla && tributo !== '' && EJERCICIO_VALIDO.test(periodo)
      ? [{ tributo, periodo }]
      : [];
  const filaActual = escritura.filasDe('obligaciones');
  if (
    puedeEscribirLaTabla &&
    (filaActual[0]?.['tributo'] !== filaQueToca[0]?.['tributo'] ||
      filaActual[0]?.['periodo'] !== filaQueToca[0]?.['periodo'] ||
      filaActual.length !== filaQueToca.length)
  ) {
    escritura.fijarFilas('obligaciones', filaQueToca);
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
          <h2 className="sgtm-tarjeta__titulo">Datos del valor</h2>
        </div>
        <CampoDeclarado
          escritura={escritura}
          campo="tipoDeValor"
          etiqueta="Tipo de valor"
          tipo="sel"
          opciones={TIPOS_DE_VALOR}
        />
        <CampoDeclarado
          escritura={escritura}
          campo="codContribuyente"
          etiqueta="Cod. Contribuyente"
        />
        <Campo
          etiqueta="Tributo"
          tipo="sel"
          opciones={TRIBUTOS}
          eleccionObligatoria
          valor={tributo}
          bloqueado={!puedeEscribirLaTabla}
          onCambio={fijarTributo}
        />
        <Campo
          etiqueta="Periodo"
          tipo="text"
          ph="El ejercicio, p. ej. 2026"
          valor={periodo}
          bloqueado={!puedeEscribirLaTabla}
          onCambio={fijarPeriodo}
        />
      </section>

      <BarraDeAcciones
        acciones={['Previsualizar', 'Imprimir', 'Emitir valor']}
        escritura={escritura}
      />
    </>
  );
}
