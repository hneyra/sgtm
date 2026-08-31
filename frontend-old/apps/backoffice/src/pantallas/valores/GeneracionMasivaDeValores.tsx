import { useState } from 'react';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { SIN_PERMISO } from '../estados';
import { notaDe } from '../prosa';
import { EJERCICIOS_DEL_DESPLEGABLE } from './index';
import { CampoDeclarado } from './CampoDeclarado';

const TIPOS_DE_VALOR = ['ORDEN DE PAGO', 'RESOLUCIÓN DE DETERMINACIÓN'];
const TRIBUTOS = ['TODOS', 'IMPUESTO PREDIAL', 'ARBITRIOS', 'PATRIMONIO VEHICULAR'];

/** Lo que quedó de la última corrida registrada, para enseñarlo en la etapa final. */
interface CorridaRegistrada {
  readonly totalCandidatos?: unknown;
  readonly fechaCriterio?: unknown;
}

/** Un código de contribuyente por línea, sin blancos ni líneas vacías. */
function codigosDe(texto: string): readonly string[] {
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '');
}

/**
 * Generación masiva de valores: `POST /valores/masivo` (#38, #75).
 *
 * **Las tres etapas, tal como las publica el backend y no más.** `IniciarCorridaMasiva`
 * solo registra el **criterio** de la corrida: no hay ningún `GET` que deje revisar
 * candidatos antes de ese registro —`ValorMasivoResource` lo dice en su propio
 * javadoc: "no trae los valores emitidos... la etapa generación corre aparte, en el
 * perfil batch"—. Por eso "revisar" aquí es releer lo que se acaba de teclear, no una
 * consulta contra el padrón: la pantalla no inventa un total de candidatos que el
 * servidor todavía no puede dar. **preparar** son los campos, sin ninguna petición;
 * **revisar** es un resumen local de lo escrito, con un botón para volver a preparar;
 * **emitir** es el único `POST`, y su respuesta —`totalCandidatos`, el conteo real que
 * el servidor calculó al registrar el criterio— es lo único que se muestra como
 * resultado, con la aclaración de que la generación en sí corre aparte.
 *
 * **Emitir la misma tanda dos veces es imposible**: la primaria exige observación
 * (regla 10) y se vacía al guardar como en cualquier escritura, y `useEscritura`
 * regenera la clave de idempotencia cada vez que la lista de códigos cambia
 * (`fijarFilas`) — pulsar "Generar valores" dos veces seguidas sin tocar nada manda la
 * misma clave, así que un reintento no crea una segunda corrida.
 */
export function GeneracionMasivaDeValores({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const declarada = escrituraDe(estructura.id);
  const nota = notaDe(estructura.id);

  const [etapa, fijarEtapa] = useState<'preparar' | 'revisar'>('preparar');
  const [textoDeCodigos, fijarTextoDeCodigos] = useState('');
  const [resultado, fijarResultado] = useState<CorridaRegistrada | null>(null);
  const codigos = codigosDe(textoDeCodigos);

  const escritura = useEscritura(
    puedeEscribirAqui ? 'valores_masivo' : undefined,
    {},
    {
      campos: declarada?.campos ?? {},
      tablas: declarada?.tablas ?? {},
      exigir: (borrador, filas) => {
        if ((borrador['tipoDeValor'] ?? '').trim() === '') return 'Elige el tipo de valor.';
        const desde = Number.parseInt(borrador['ejercicioDesde'] ?? '', 10);
        const hasta = Number.parseInt(borrador['ejercicioHasta'] ?? '', 10);
        if (!Number.isInteger(desde) || !Number.isInteger(hasta)) {
          return 'Elige el ejercicio desde y el ejercicio hasta.';
        }
        if (desde > hasta) {
          return 'El ejercicio desde no puede ser posterior al ejercicio hasta.';
        }
        if ((filas['contribuyentes'] ?? []).length === 0) {
          return 'Escribe al menos un código de contribuyente, uno por línea.';
        }
        // No se puede emitir sin haber pasado por «Revisar»: es la etapa que
        // deja ver, antes del único POST, sobre qué se va a registrar.
        if (etapa !== 'revisar') {
          return 'Revisa el criterio antes de generar: pulsa «Revisar» arriba.';
        }
        return undefined;
      },
      alGuardar: (respuesta) => {
        if (respuesta !== null && typeof respuesta === 'object') {
          fijarResultado(respuesta as CorridaRegistrada);
        }
        fijarEtapa('preparar');
        fijarTextoDeCodigos('');
      },
    },
  );

  const puedeEscribirLosCodigos = escritura.tablas.has('contribuyentes');
  const filaQueToca = puedeEscribirLosCodigos ? codigos.map((codigo) => ({ codigo })) : [];
  const filaActual = escritura.filasDe('contribuyentes');
  if (puedeEscribirLosCodigos && JSON.stringify(filaActual) !== JSON.stringify(filaQueToca)) {
    escritura.fijarFilas('contribuyentes', filaQueToca);
  }

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}
      {nota !== undefined && <Aviso titulo="Cómo funciona esta pantalla" detalle={nota} />}

      {resultado !== null && (
        <Aviso
          titulo="Criterio registrado"
          detalle={`El servidor cuenta ${texto(resultado.totalCandidatos)} candidato(s), a la fecha ${texto(resultado.fechaCriterio)}. La generación corre aparte: se revisa en «Búsqueda y mantenimiento de valores».`}
        />
      )}

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">
            Etapa: {etapa === 'preparar' ? '1. Preparar' : '2. Revisar'}
          </h2>
        </div>

        {etapa === 'preparar' ? (
          <>
            <CampoDeclarado
              escritura={escritura}
              campo="tipoDeValor"
              etiqueta="Tipo de valor"
              tipo="sel"
              opciones={TIPOS_DE_VALOR}
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
              campo="tributo"
              etiqueta="Tributo"
              tipo="sel"
              opciones={TRIBUTOS}
            />
            <CampoDeclarado
              escritura={escritura}
              campo="fechaDeEmision"
              etiqueta="Fecha de emisión"
              tipo="date"
              ayuda="A qué fecha se evalúa la deuda de cada candidato. Sin fecha, hoy."
            />
            <Campo
              etiqueta="Códigos de contribuyente (uno por línea)"
              tipo="area"
              ancho
              valor={textoDeCodigos}
              bloqueado={!puedeEscribirLosCodigos}
              ph="00000003541&#10;00000006550"
              ayuda={`${codigos.length} código(s) leído(s).`}
              onCambio={fijarTextoDeCodigos}
            />
            <Boton
              variante="primario"
              disabled={
                (escritura.borrador['tipoDeValor'] ?? '') === '' ||
                (escritura.borrador['ejercicioDesde'] ?? '') === '' ||
                (escritura.borrador['ejercicioHasta'] ?? '') === '' ||
                codigos.length === 0
              }
              onClick={() => fijarEtapa('revisar')}
            >
              Revisar
            </Boton>
          </>
        ) : (
          <>
            <p>
              <strong>Tipo de valor:</strong> {escritura.borrador['tipoDeValor'] || '—'}
              <br />
              <strong>Ejercicios:</strong> {escritura.borrador['ejercicioDesde'] || '—'} —{' '}
              {escritura.borrador['ejercicioHasta'] || '—'}
              <br />
              <strong>Tributo:</strong> {escritura.borrador['tributo'] || 'TODOS'}
              <br />
              <strong>Contribuyentes elegidos:</strong> {codigos.length}
            </p>
            <p className="sgtm-descripcion">
              No es una simulación: el servidor todavía no publica una consulta que cuente
              candidatos antes de registrar el criterio.
            </p>
            <Boton onClick={() => fijarEtapa('preparar')}>Volver a preparar</Boton>
          </>
        )}
      </section>

      <BarraDeAcciones
        acciones={['Generar valores']}
        escritura={escritura}
        alcance={`${codigos.length} contribuyente(s) elegido(s)`}
      />
    </>
  );
}

function texto(valor: unknown): string {
  return valor === undefined || valor === null ? '—' : String(valor);
}
