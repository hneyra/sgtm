import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, FechaDeCalculo } from '@sgtm/design-system';
import type { Celda } from '@sgtm/api-client';
import { pedirOperacion } from '@sgtm/api-client';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { SIN_PERMISO, textoDeError } from '../estados';
import { TablaDePantalla } from '../bloques/TablaDePantalla';
import { SIN_DATO, hoy, instante, leerPaginado, tablaDe, texto } from './listado';

/**
 * Estado de las copias de seguridad: `POST /seguridad/respaldos` (RF-126).
 *
 * **Por que solo se conecta la lectura.** El controlador consulta; no
 * ejecuta ningun respaldo, porque la aplicacion se conecta como
 * `sgtm_app` —sin privilegio para respaldar— y dárselo deshace la
 * separación de privilegios de ARQ-03 §4. «Ejecutar respaldo» y «Restaurar»
 * son del prototipo, no del backend: conectarlos igual que un guardado
 * mandaria un `POST` que no hace nada y diria «Guardado» sobre algo que no
 * paso. Se quedan visibles y deshabilitados, con la razón dicha, en vez de
 * fingir una acción que no existe.
 */
export function Respaldos({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const catalogo = useCatalogoVisible();
  const [pagina, fijarPagina] = useState(1);

  const consulta = useQuery({
    queryKey: ['respaldos', pagina],
    queryFn: ({ signal }) =>
      pedirOperacion('respaldo', { pagina: String(pagina - 1) }, signal).then((cuerpo) =>
        leerPaginado(cuerpo, 'los respaldos'),
      ),
  });

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (consulta.isError) {
    const error = textoDeError(consulta.error);
    return (
      <Aviso tipo="error" titulo={error.titulo} detalle={error.detalle} traza={error.traza}>
        <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}
      <FechaDeCalculo fecha={hoy()} />

      {estructura.tabla && (
        <TablaDePantalla
          estructura={estructura.tabla}
          datos={
            consulta.data && tablaDe(consulta.data, fila, 'respaldos')
          }
          cargando={consulta.isPending}
          onPagina={fijarPagina}
        />
      )}

      <Aviso
        titulo="«Ejecutar respaldo» y «Restaurar» no hacen nada todavía"
        detalle="La aplicación no puede ejecutar copias de seguridad: se conecta con un usuario de base de datos sin ese privilegio, a propósito, para que un defecto de la aplicación no pueda dañar los respaldos. Quien respalda es el proceso de despliegue. Conectar estos botones sin esa capacidad de verdad diría «Guardado» sobre algo que no ocurrió."
      >
        <Boton disabled title="El backend no ejecuta respaldos: lo hace el despliegue">
          Ejecutar respaldo
        </Boton>
        <Boton
          variante="secundario"
          disabled
          title="El backend no restaura respaldos: lo hace el despliegue"
        >
          Restaurar
        </Boton>
      </Aviso>
    </>
  );
}

function fila(registro: Readonly<Record<string, unknown>>): readonly Celda[] {
  return [
    { texto: instante(registro['inicio']) },
    { texto: SIN_DATO }, // El manual pide el tipo (DIARIA/MENSUAL/MANUAL); el recurso no lo trae.
    { texto: tamanoDe(registro['tamanoBytes']) },
    { texto: texto(registro['destino']) },
    { texto: SIN_DATO }, // Y quien lo ejecuto: lo hace el despliegue, no una persona con sesion.
    resultadoDe(registro['resultado']),
  ];
}

/** El resultado del respaldo, con su tono: exitoso en verde, el resto no. */
function resultadoDe(valor: unknown): Celda {
  if (typeof valor !== 'string' || valor === '') return { texto: SIN_DATO };
  if (valor === 'EXITOSO') return { texto: valor, tono: 'ok' };
  if (valor === 'EN_CURSO') return { texto: valor, tono: 'warn' };
  return { texto: valor, tono: 'bad' };
}

function tamanoDe(valor: unknown): string {
  if (typeof valor !== 'number') return SIN_DATO;
  const megas = valor / (1024 * 1024);
  return `${megas.toFixed(1)} MB`;
}
