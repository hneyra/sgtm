import { Esqueleto, Insignia } from '@sgtm/design-system';
import { formatearFecha } from '@sgtm/dominio';
import type { ResumenDePantallaProps } from '../composicion';
import { SIN_DATO } from '../seguridad/listado';
import { formatearCodigoCatastral } from './CodigoCatastral';

/**
 * La cabecera-resumen de una ficha catastral (#319).
 *
 * Una ficha son entre una y once pestanas de campos; quien la abre necesita
 * antes que nada saber **cual ficha esta viendo y de cuando es**. Eso ya estaba
 * en la pantalla, repartido: el codigo en la barra de direcciones, el uso en la
 * pestana de datos generales y la vigencia en el bloque de versionado, mas
 * abajo. Aqui se dice de una vez, arriba del todo.
 *
 * **No pide nada nuevo.** Las cuatro cosas salen de lo que el adaptador ya trae:
 * el codigo de la ruta, el uso y el titular de los campos que compone
 * `catastro/index.ts`, y la vigencia del mismo `versionado` que dibuja el bloque
 * de historico. Una cabecera que necesitara otra peticion seria otra peticion
 * por ficha abierta, y no hay nada aqui que la justifique.
 *
 * Lo que el recurso no publica sale con «—», como en el resto del modulo:
 *
 *   titular          `FichaResource` no lo trae —lo tiene contribuyentes—, y
 *                    ponerle el de la consulta de fichas seria cruzar dos
 *                    respuestas distintas y llamarlo dato
 *   area construida  es la **suma** de los pisos, y la interfaz no suma
 *                    (RNF-083). El dia que el recurso publique el total, se
 *                    muestra; hasta entonces, el hueco dice a quien le toca
 */
export function ResumenDeFicha({ codigo, datos, cargando }: ResumenDePantallaProps) {
  if (cargando) return <Esqueleto alto={72} />;

  const campos = datos?.campos ?? {};
  const version = datos?.versionado?.actual;

  return (
    <section className="sgtm-resumen" aria-label="Resumen de la ficha">
      <div className="sgtm-resumen__identidad">
        <p className="sgtm-resumen__codigo">{formatearCodigoCatastral(codigo ?? '')}</p>
        {version !== undefined && (
          <p className="sgtm-resumen__vigencia">
            {/* El estado nunca solo por color, y nunca una cifra sin su fecha:
                la version que rige va con desde cuando y de donde salio. */}
            <Insignia tono={version.vigente ? 'ok' : 'neutro'}>
              {version.vigente ? 'VIGENTE' : 'HISTÓRICA'}
            </Insignia>
            <span>
              v{version.version} · desde {formatearFecha(version.vigenciaDesde)} ·{' '}
              {version.origen === '' ? SIN_DATO : version.origen}
            </span>
          </p>
        )}
      </div>
      <dl className="sgtm-resumen__datos">
        <Dato etiqueta="Titular" valor={texto(campos['nombreDelContribuyente'])} />
        <Dato etiqueta="Uso" valor={texto(campos['uso2'])} />
        <Dato etiqueta="Área de terreno" valor={texto(campos['areaTotalHa'])} />
        {/* La suma de las areas por piso la haria el backend o no la hace nadie. */}
        <Dato etiqueta="Área construida" valor={SIN_DATO} />
      </dl>
    </section>
  );
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string }) {
  return (
    <div className="sgtm-resumen__dato">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

const texto = (valor: unknown): string =>
  typeof valor === 'string' && valor !== '' ? valor : SIN_DATO;
