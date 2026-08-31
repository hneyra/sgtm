import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { Aviso, Esqueleto } from '@sgtm/design-system';
import { pedirDatosDePantalla } from '@sgtm/api-client';
import type { DatosDePantalla } from '@sgtm/api-client';
import { opcionPorId, todasLasPantallas } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { operacionDe } from '../busqueda';
import { conexionDe } from '../conexiones';
import type { TablaDeOtraOpcion } from '../composicion';
import { TablaDePantalla } from './TablaDePantalla';

/**
 * **La tabla que una seccion toma prestada de otra opcion** (#503 F2).
 *
 * Ver {@link TablaDeOtraOpcion} para el porque. Aqui lo unico que hay que tener
 * delante es lo que **no** hace:
 *
 *   no redacta columnas   son las del catalogo de la opcion prestada, con sus
 *                         rotulos del manual (RNF-080)
 *   no compone cifras     lo que dibuja es lo que el adaptador de esa opcion ya
 *                         trae; una celda que el backend no manda sale «—»
 *   no salta el permiso   sin el de la opcion prestada **no pide nada** y dice
 *                         cual falta, con su rotulo. Una tabla vacia se leeria
 *                         como «no tiene predios», que es una afirmacion, y
 *                         falsa (ADR-0016 §2)
 */
export function TablaPrestada({ tabla }: { readonly tabla: TablaDeOtraOpcion }) {
  const catalogo = useCatalogoVisible();
  const { codigo = '' } = useParams();
  const [busqueda] = useSearchParams();
  const sujeto = codigo !== '' ? codigo : (busqueda.get('codigo') ?? '');

  const puedeVer = catalogo.puedeVer(tabla.opcion);
  const parametros = tabla.parametros(sujeto);
  const operacion = operacionDe(tabla.opcion);
  const clave = tabla.conexion ?? tabla.opcion;

  const estructura = useQuery({
    queryKey: ['pantallas', 'prestada', tabla.opcion],
    enabled: puedeVer && sujeto !== '',
    queryFn: async () => (await todasLasPantallas())[tabla.opcion],
  });

  /* **Se lee por la conexion de la opcion prestada, no por el camino comun.**
     `pedirDatosDePantalla` castea la respuesta a `DatosDePantalla` y ya esta; una
     opcion **conectada** contesta su propio recurso —`PredioDeRentasResource`—,
     asi que por ahi la tabla saldria vacia **en silencio**, que es exactamente el
     defecto que #363 documento. La conexion trae su `leer` —que valida la
     forma— y su `adaptar` —que compone las celdas con los rotulos del catalogo—.
     Sin conexion se cae al camino comun, que es lo correcto para una opcion que
     todavia contesta la forma compartida. */
  const conexion = conexionDe(tabla.conexion ?? tabla.opcion);
  const consulta = useQuery<DatosDePantalla>({
    queryKey: ['prestada', clave, parametros],
    enabled: puedeVer && sujeto !== '' && operacion !== undefined,
    retry: 1,
    queryFn: ({ signal }) =>
      conexion === undefined
        ? pedirDatosDePantalla(operacion!, parametros, signal)
        : conexion.cargar(parametros, signal),
  });

  if (!puedeVer) {
    const rotulo = opcionPorId(tabla.opcion)?.title ?? tabla.opcion;
    return (
      <Aviso
        titulo={`Falta «${rotulo}»`}
        detalle={`Esta lista la publica esa opción, y tu perfil no la tiene. Píde­sela al administrador de tu municipalidad: sin ella no se puede decir si hay unidades o no.`}
      />
    );
  }

  // Sin sujeto no hay a quien preguntarle: la seccion se dibuja igual, y la
  // tabla espera. Es lo mismo que hace la cabecera-resumen del padron.
  if (sujeto === '') return null;

  const delCatalogo = estructura.data?.tabla;
  if (delCatalogo === undefined) return <Esqueleto alto={120} />;

  return (
    <TablaDePantalla
      estructura={delCatalogo}
      opcion={tabla.opcion}
      cargando={consulta.isFetching}
      {...(consulta.data === undefined ? {} : { datos: consulta.data.tabla })}
    />
  );
}
