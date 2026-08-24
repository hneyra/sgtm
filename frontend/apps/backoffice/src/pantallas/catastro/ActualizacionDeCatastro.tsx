import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo, Esqueleto } from '@sgtm/design-system';
import { pedirOperacion } from '@sgtm/api-client';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { FechaDeCalculo } from '../bloques/FechaDeCalculo';
import { SIN_PERMISO, textoDeError } from '../estados';
import { hoy } from '../seguridad/listado';
import { leerFicha } from './fichas';

/**
 * Actualización del catastro: `PUT /catastro/fichas/{codigo}/actualizacion` (#71).
 *
 * **El cuerpo no cabe en campos planos.** El backend recibe una lista de
 * construcciones —piso, área y siete categorías de una letra—, y
 * `CampoDelCuerpo` solo sabe de texto y enteros. Vive en su propio componente
 * por lo mismo que `PermisosMatrix` y `MiembrosDeGrupo`.
 *
 * **Guardar reemplaza la lista entera de pisos, no solo el que cambia**: es
 * lo que dice `ActualizacionController` (`construcciones: null` significa
 * «lo mismo que tenía»; una lista significa esa lista, completa). Por eso la
 * pantalla carga primero los pisos de la versión vigente —de la misma
 * lectura que ya usa `ficha_urbana`— y dejar de declarar uno aquí es
 * borrarlo de la ficha, no «no tocarlo».
 *
 * Lo que el prototipo dibuja y esta pantalla **no manda**, porque
 * `ActualizacionController.PeticionDeActualizacion` no lo acepta: mes, año,
 * MEP, ECS, ECC, UCA y la pestaña entera de «Otras instalaciones». Un campo
 * que el backend no pide no entra por aquí (lista blanca, regla del
 * catálogo).
 */
export function ActualizacionDeCatastro({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  const { codigo } = useParams();
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);

  const actual = useQuery({
    queryKey: ['ficha-urbana-para-actualizar', codigo],
    queryFn: ({ signal }) =>
      pedirOperacion('ficha_urbana', { codRefCatastral: codigo ?? '' }, signal).then((cuerpo) =>
        leerFicha(cuerpo, 'urbana'),
      ),
    enabled: codigo !== undefined && codigo !== '',
  });

  const [filas, fijarFilas] = useState<readonly FilaConstruccion[] | null>(null);
  const [origen, fijarOrigen] = useState('DECLARACION_JURADA');
  const [documentoOrigen, fijarDocumentoOrigen] = useState('');
  const [vigenciaDesde, fijarVigenciaDesde] = useState('');
  const [borrador, fijarBorrador] = useState<FilaConstruccion>(FILA_VACIA);
  const [errorDeFila, fijarErrorDeFila] = useState<string | undefined>(undefined);

  // Se siembra una sola vez, con los pisos de la version vigente: guardar
  // sin haberlos visto los borraria de la ficha sin que nadie lo pidiera.
  if (filas === null && actual.data !== undefined) {
    fijarFilas(actual.data.construcciones.map(filaDeConstruccionLeida));
  }
  const filasActuales = filas ?? [];

  const escritura = useEscritura(
    puedeEscribirAqui ? 'actualizacion_catastro' : undefined,
    codigo === undefined ? {} : { codigo },
    {
      cuerpo: () => {
        if (documentoOrigen.trim() === '') {
          throw new Error('Falta el documento de origen (acta, resolución o declaración jurada).');
        }
        return {
          documentoOrigen: documentoOrigen.trim(),
          origen,
          ...(vigenciaDesde.trim() === '' ? {} : { vigenciaDesde: vigenciaDesde.trim() }),
          construcciones: filasActuales.map(nivelDe),
        };
      },
    },
  );

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (codigo === undefined || codigo === '') {
    return (
      <Aviso
        titulo="Elige un predio para actualizar su catastro"
        detalle="Esta pantalla abre un predio por su código de referencia catastral. Búscalo en «Consulta de fichas» o pega el enlace: el código va en la dirección, así que se puede compartir."
      />
    );
  }

  if (actual.isError) {
    const error = textoDeError(actual.error);
    return (
      <Aviso tipo="error" titulo={error.titulo} detalle={error.detalle} traza={error.traza}>
        <Boton onClick={() => void actual.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  const cargando = actual.isPending;

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}
      <FechaDeCalculo fecha={hoy()} />

      <Aviso
        titulo="Guardar reemplaza la lista completa de pisos"
        detalle="La versión nueva lleva exactamente los pisos que estén en la tabla de abajo. Se cargaron los de la versión vigente: si quitas uno, la ficha nueva no lo tendrá."
      />

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Pisos declarados en la nueva versión</h2>
          <span className="sgtm-tarjeta__conteo">
            {cargando ? '…' : `${filasActuales.length} pisos`}
          </span>
        </div>

        {cargando ? (
          <Esqueleto alto={120} />
        ) : (
          <div className="sgtm-tabla__marco">
            <table className="sgtm-tabla">
              <thead>
                <tr>
                  <th>Piso</th>
                  <th className="sgtm-tabla--numerica">Área construida (m²)</th>
                  {CATEGORIAS.map(({ etiqueta }) => (
                    <th key={etiqueta}>{etiqueta}</th>
                  ))}
                  <th aria-label="Acciones de la fila" />
                </tr>
              </thead>
              <tbody>
                {filasActuales.length === 0 && (
                  <tr>
                    <td colSpan={CATEGORIAS.length + 3}>
                      Ningún piso declarado. La ficha quedaría sin construcciones si guardas así.
                    </td>
                  </tr>
                )}
                {filasActuales.map((fila, indice) => (
                  <tr key={indice}>
                    <td>{fila.piso}</td>
                    <td className="sgtm-tabla--numerica">{fila.areaConstruida}</td>
                    {CATEGORIAS.map(({ clave, etiqueta }) => (
                      <td key={etiqueta}>{fila[clave]}</td>
                    ))}
                    <td>
                      {puedeEscribirAqui && (
                        <Boton
                          variante="fantasma"
                          onClick={() =>
                            fijarFilas(filasActuales.filter((_fila, i) => i !== indice))
                          }
                        >
                          Quitar
                        </Boton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {puedeEscribirAqui && (
          <>
            <div className="sgtm-tarjeta__acciones">
              <Campo
                etiqueta="Nº Piso"
                tipo="text"
                valor={borrador.piso}
                onCambio={(valor) => fijarBorrador({ ...borrador, piso: valor })}
              />
              <Campo
                etiqueta="Área construida (m²)"
                tipo="text"
                valor={borrador.areaConstruida}
                onCambio={(valor) => fijarBorrador({ ...borrador, areaConstruida: valor })}
              />
              {CATEGORIAS.map(({ clave, etiqueta }) => (
                <Campo
                  key={clave}
                  etiqueta={etiqueta}
                  tipo="text"
                  ph="A–I"
                  valor={borrador[clave]}
                  onCambio={(valor) =>
                    fijarBorrador({ ...borrador, [clave]: valor.toUpperCase().slice(0, 1) })
                  }
                />
              ))}
            </div>
            {errorDeFila !== undefined && (
              <Aviso tipo="error" titulo="No se puede agregar este piso" detalle={errorDeFila} />
            )}
            <Boton
              onClick={() => {
                const error = errorDeLaFila(borrador);
                if (error) {
                  fijarErrorDeFila(error);
                  return;
                }
                fijarErrorDeFila(undefined);
                fijarFilas([...filasActuales, borrador]);
                fijarBorrador(FILA_VACIA);
              }}
            >
              Agregar piso
            </Boton>
          </>
        )}
      </section>

      {puedeEscribirAqui && (
        <section className="sgtm-tarjeta">
          <div className="sgtm-tarjeta__cabecera">
            <h2 className="sgtm-tarjeta__titulo">De dónde sale esta versión</h2>
          </div>
          <Campo
            etiqueta="Origen"
            tipo="sel"
            opciones={ORIGENES}
            valor={origen}
            onCambio={fijarOrigen}
          />
          <Campo
            etiqueta="Documento de origen"
            tipo="text"
            ph="Acta de inspección, resolución o declaración jurada"
            valor={documentoOrigen}
            onCambio={fijarDocumentoOrigen}
          />
          <Campo
            etiqueta="Vigente desde"
            tipo="date"
            ph="Sin fecha, rige desde hoy"
            valor={vigenciaDesde}
            onCambio={fijarVigenciaDesde}
          />
        </section>
      )}

      <BarraDeAcciones acciones={['Guardar']} escritura={escritura} />
    </>
  );
}

interface FilaConstruccion {
  readonly piso: string;
  readonly areaConstruida: string;
  readonly categoriaMuros: string;
  readonly categoriaTechos: string;
  readonly categoriaPisos: string;
  readonly categoriaPuertas: string;
  readonly categoriaRevestimientos: string;
  readonly categoriaBanios: string;
  readonly categoriaInstalaciones: string;
}

const FILA_VACIA: FilaConstruccion = {
  piso: '',
  areaConstruida: '',
  categoriaMuros: '',
  categoriaTechos: '',
  categoriaPisos: '',
  categoriaPuertas: '',
  categoriaRevestimientos: '',
  categoriaBanios: '',
  categoriaInstalaciones: '',
};

const ORIGENES = ['DECLARACION_JURADA', 'FISCALIZACION', 'RESOLUCION', 'MIGRACION'];

const CATEGORIAS: ReadonlyArray<{
  readonly clave: Exclude<keyof FilaConstruccion, 'piso' | 'areaConstruida'>;
  readonly etiqueta: string;
}> = [
  { clave: 'categoriaMuros', etiqueta: 'Muros' },
  { clave: 'categoriaTechos', etiqueta: 'Techos' },
  { clave: 'categoriaPisos', etiqueta: 'Pisos' },
  { clave: 'categoriaPuertas', etiqueta: 'Puertas' },
  { clave: 'categoriaRevestimientos', etiqueta: 'Revest.' },
  { clave: 'categoriaBanios', etiqueta: 'Baños' },
  { clave: 'categoriaInstalaciones', etiqueta: 'Instalaciones' },
];

/** Una letra de A a I, o vacío: ninguna categoría es tan valida como declarar las siete. */
const LETRA_VALIDA = /^[A-I]?$/;

function errorDeLaFila(fila: FilaConstruccion): string | undefined {
  if (fila.piso.trim() === '') return 'Falta el número de piso.';
  if (fila.areaConstruida.trim() === '' || Number.isNaN(Number(fila.areaConstruida))) {
    return 'El área construida tiene que ser un número.';
  }
  for (const { clave, etiqueta } of CATEGORIAS) {
    if (!LETRA_VALIDA.test(fila[clave])) {
      return `La categoría de ${etiqueta.toLowerCase()} va de A a I.`;
    }
  }
  return undefined;
}

function nivelDe(fila: FilaConstruccion): Readonly<Record<string, string>> {
  const nivel: Record<string, string> = { piso: fila.piso, areaConstruida: fila.areaConstruida };
  for (const { clave } of CATEGORIAS) {
    if (fila[clave] !== '') nivel[clave] = fila[clave];
  }
  return nivel;
}

/**
 * Del recurso de `ficha_urbana`: las categorías llegan como texto —`[BCCBCBB]`
 * en el backend, `C B C C B C B` en el juego de datos del prototipo— y aquí
 * se separan por letra, admitiendo las dos formas.
 */
function filaDeConstruccionLeida(construccion: {
  readonly piso: string;
  readonly areaConstruida: string;
  readonly categorias: string;
}): FilaConstruccion {
  const limpio = construccion.categorias.replace(/[[\]]/g, '').trim();
  const letras = limpio === '' ? [] : limpio.includes(' ') ? limpio.split(/\s+/) : [...limpio];
  const letra = (indice: number): string => {
    const caracter = letras[indice];
    return caracter === undefined || caracter === '-' ? '' : caracter;
  };
  return {
    piso: construccion.piso,
    areaConstruida: construccion.areaConstruida,
    categoriaMuros: letra(0),
    categoriaTechos: letra(1),
    categoriaPisos: letra(2),
    categoriaPuertas: letra(3),
    categoriaRevestimientos: letra(4),
    categoriaBanios: letra(5),
    categoriaInstalaciones: letra(6),
  };
}
