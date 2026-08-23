import { useEffect, useRef, useState } from 'react';
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
import { hoy, leerLista } from './listado';

/**
 * La matriz de permisos de un grupo: `GET`/`PUT /seguridad/grupos/{id}/permisos`.
 *
 * No cabe en el renderizador comun. Las 133 pantallas restantes piden campos
 * planos o dibujan una tabla de solo lectura; esta guarda una **lista de
 * niveles** —acceso y sus siete privilegios— y antes de guardarla hay que
 * poder cargarla, que es justo lo que #70 dejaba abierto: «no hay GET con el
 * que cargar la matriz, solo PUT». Ahora lo hay (`permisos_de_grupo`), y este
 * componente es el unico lugar donde los dos verbos de la misma ruta se usan
 * juntos.
 *
 * **No trae las 134 opciones del catalogo a memoria.** Carga lo que este
 * grupo ya tiene configurado —tipicamente unas pocas filas— y deja que quien
 * administra escriba el codigo del acceso que quiere anadir; los codigos ya
 * se ven en la pantalla de Accesos, que es la que lista el catalogo entero
 * paginado. Buscarlo desde aqui por nombre exigiria que `SeguridadController`
 * filtrara por el, y hoy no lo hace.
 */
export function PermisosMatrix({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const { codigo: grupoId } = useParams();
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);

  const consulta = useQuery({
    queryKey: ['permisos-de-grupo', grupoId],
    queryFn: ({ signal }) =>
      pedirOperacion('permisos_de_grupo', { id: grupoId ?? '' }, signal).then((cuerpo) =>
        leerLista(cuerpo, 'los permisos del grupo'),
      ),
    enabled: grupoId !== undefined && grupoId !== '',
  });

  const [filas, fijarFilas] = useState<readonly FilaPermiso[]>([]);
  const [codigoNuevo, fijarCodigoNuevo] = useState('');
  // Se resiembra una vez por cada carga que llegue con exito: la primera al
  // entrar, y la siguiente tras guardar, cuando la invalidacion general vuelve
  // a pedir esta misma consulta con lo recien guardado.
  const semilla = useRef<unknown>(undefined);

  useEffect(() => {
    if (consulta.data !== undefined && consulta.data !== semilla.current) {
      semilla.current = consulta.data;
      fijarFilas(consulta.data.map(filaDe));
    }
  }, [consulta.data]);

  const escritura = useEscritura(
    puedeEscribirAqui ? 'permisos' : undefined,
    grupoId === undefined ? {} : { id: grupoId },
    { cuerpo: () => ({ niveles: filas.map(nivelDe) }) },
  );

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (grupoId === undefined || grupoId === '') {
    return (
      <Aviso
        titulo="Elige un grupo para administrar sus permisos"
        detalle="Esta pantalla abre un grupo por su identificador. Ábrelo desde «Grupos» o pega el enlace: el grupo abierto va en la dirección, así que se puede compartir."
      />
    );
  }

  if (consulta.isError) {
    const texto = textoDeError(consulta.error);
    return (
      <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza}>
        <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  const cargando = consulta.isPending;

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}
      <FechaDeCalculo fecha={hoy()} />

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Permisos otorgados a este grupo</h2>
          <span className="sgtm-tarjeta__conteo">
            {cargando ? '…' : `${filas.length} accesos configurados`}
          </span>
        </div>

        {cargando ? (
          <Esqueleto alto={120} />
        ) : (
          <div className="sgtm-tabla__marco">
            <table className="sgtm-tabla">
              <thead>
                <tr>
                  <th>Acceso</th>
                  {PRIVILEGIOS.map(({ etiqueta }) => (
                    <th key={etiqueta} className="sgtm-tabla--numerica">
                      {etiqueta}
                    </th>
                  ))}
                  <th aria-label="Acciones de la fila" />
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={PRIVILEGIOS.length + 2}>
                      Este grupo todavía no tiene ningún acceso configurado.
                    </td>
                  </tr>
                )}
                {filas.map((fila, indice) => (
                  <tr key={fila.acceso}>
                    <td>{fila.acceso}</td>
                    {PRIVILEGIOS.map(({ clave, etiqueta }) => (
                      <td key={clave} className="sgtm-tabla--numerica">
                        <input
                          type="checkbox"
                          aria-label={`${etiqueta} sobre ${fila.acceso}`}
                          checked={fila.privilegios.has(clave)}
                          disabled={!puedeEscribirAqui}
                          onChange={() =>
                            fijarFilas((previas) =>
                              previas.map((otra, i) =>
                                i === indice ? conPrivilegioAlternado(otra, clave) : otra,
                              ),
                            )
                          }
                        />
                      </td>
                    ))}
                    <td>
                      {puedeEscribirAqui && (
                        <Boton
                          variante="fantasma"
                          onClick={() =>
                            fijarFilas((previas) =>
                              previas
                                .map((otra, i) => (i === indice ? sinPrivilegios(otra) : otra))
                                .filter((otra, i) => i !== indice || otra.deServidor),
                            )
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
          <div className="sgtm-tarjeta__acciones">
            <Campo
              etiqueta="Código del acceso a añadir"
              tipo="text"
              valor={codigoNuevo}
              ph="por ejemplo: calles"
              onCambio={fijarCodigoNuevo}
            />
            <Boton
              onClick={() => {
                const codigo = codigoNuevo.trim();
                if (codigo === '' || filas.some((fila) => fila.acceso === codigo)) return;
                fijarFilas((previas) => [
                  ...previas,
                  { acceso: codigo, privilegios: new Set(), deServidor: false },
                ]);
                fijarCodigoNuevo('');
              }}
            >
              Agregar
            </Boton>
          </div>
        )}
      </section>

      {estructura.acciones && <BarraDeAcciones acciones={estructura.acciones} escritura={escritura} />}
    </>
  );
}

interface FilaPermiso {
  readonly acceso: string;
  readonly privilegios: ReadonlySet<string>;
  /** Si ya existía en la lectura del servidor: quitarla no la borra, la deja en cero. */
  readonly deServidor: boolean;
}

/** Los siete privilegios del manual (RF-121), con la etiqueta que usa el prototipo. */
const PRIVILEGIOS: ReadonlyArray<{ readonly clave: string; readonly etiqueta: string }> = [
  { clave: 'EJECUCION', etiqueta: 'Ejecuta' },
  { clave: 'LECTURA', etiqueta: 'Consulta' },
  { clave: 'REGISTRO', etiqueta: 'Ingresa' },
  { clave: 'MODIFICACION', etiqueta: 'Modifica' },
  { clave: 'ELIMINACION', etiqueta: 'Anula' },
  { clave: 'IMPRESION', etiqueta: 'Imprime' },
  { clave: 'ESPECIAL', etiqueta: 'Especial' },
];

function filaDe(permiso: Readonly<Record<string, unknown>>): FilaPermiso {
  const acceso = typeof permiso['acceso'] === 'string' ? permiso['acceso'] : '';
  const privilegios = Array.isArray(permiso['privilegios']) ? permiso['privilegios'] : [];
  return {
    acceso,
    privilegios: new Set(privilegios.filter((p): p is string => typeof p === 'string')),
    deServidor: true,
  };
}

function conPrivilegioAlternado(fila: FilaPermiso, privilegio: string): FilaPermiso {
  const privilegios = new Set(fila.privilegios);
  if (privilegios.has(privilegio)) privilegios.delete(privilegio);
  else privilegios.add(privilegio);
  return { ...fila, privilegios };
}

const sinPrivilegios = (fila: FilaPermiso): FilaPermiso => ({ ...fila, privilegios: new Set() });

const nivelDe = (fila: FilaPermiso): { acceso: string; privilegios: readonly string[] } => ({
  acceso: fila.acceso,
  privilegios: [...fila.privilegios],
});
