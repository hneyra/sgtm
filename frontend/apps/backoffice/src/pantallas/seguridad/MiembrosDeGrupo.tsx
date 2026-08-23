import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { SIN_PERMISO } from '../estados';

/**
 * Alta y baja de un usuario en un grupo: `POST /seguridad/grupos/{grupo}/miembros`.
 *
 * **Lo que esta pantalla no puede hacer todavia**: listar quien pertenece al
 * grupo. El manual dibuja un arbol de grupos y usuarios (RF-120), pero
 * `AdministracionRepository` no tiene un metodo para leerlo y ningun
 * controlador lo publica —solo el alta y la baja—. Anadir esa consulta es
 * trabajo de backend que este PR no hace: aqui se deja dicho, en vez de
 * fingir un arbol con datos del prototipo que ninguna llamada respalda.
 *
 * El cuerpo no cabe en un campo plano: `activo` es un booleano y
 * `CampoDelCuerpo` solo sabe de texto y enteros (nunca importes). Por eso usa
 * la misma salida que `permisos` —`cuerpo` en `useEscritura`— en vez de
 * anadirle a la lista blanca un tercer tipo para un solo caso.
 */
export function MiembrosDeGrupo({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const { codigo: grupoId } = useParams();
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);

  const [usuarioId, fijarUsuarioId] = useState('');
  const [activo, fijarActivo] = useState(true);

  const escritura = useEscritura(
    puedeEscribirAqui ? 'miembros' : undefined,
    grupoId === undefined ? {} : { grupo: grupoId },
    {
      cuerpo: () => {
        // La ayuda de abajo ya lo dice antes de que alguien pulse; esto es
        // solo la ultima barrera, para que un identificador invalido nunca
        // llegue a viajar.
        if (!esIdentificadorValido(usuarioId)) {
          throw new Error('Falta un identificador de usuario valido.');
        }
        return { usuarioId: Number.parseInt(usuarioId, 10), activo };
      },
    },
  );

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (grupoId === undefined || grupoId === '') {
    return (
      <Aviso
        titulo="Elige un grupo para administrar sus miembros"
        detalle="Esta pantalla abre un grupo por su identificador. Ábrelo desde «Grupos» o pega el enlace: el grupo abierto va en la dirección, así que se puede compartir."
      />
    );
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Afiliar o retirar un usuario de este grupo</h2>
        </div>
        <p className="sgtm-descripcion">
          Esta pantalla todavía no muestra quién pertenece al grupo: el backend solo publica el
          alta y la baja, no una consulta de miembros. Busca el identificador del usuario en
          «Usuarios» antes de escribirlo aquí.
        </p>

        <Campo
          etiqueta="ID del usuario"
          tipo="text"
          valor={usuarioId}
          ph="el que se ve en «Usuarios»"
          bloqueado={!puedeEscribirAqui}
          onCambio={fijarUsuarioId}
        />
        {!esIdentificadorValido(usuarioId) && (
          <p className="sgtm-descripcion">
            Escribe el identificador del usuario —el que se ve en «Usuarios»— antes de guardar.
          </p>
        )}

        <div className="sgtm-tarjeta__acciones" role="radiogroup" aria-label="Alta o baja">
          <Boton
            variante={activo ? 'primario' : 'secundario'}
            disabled={!puedeEscribirAqui}
            onClick={() => fijarActivo(true)}
          >
            Alta
          </Boton>
          <Boton
            variante={activo ? 'secundario' : 'primario'}
            disabled={!puedeEscribirAqui}
            onClick={() => fijarActivo(false)}
          >
            Baja
          </Boton>
        </div>
      </section>

      <BarraDeAcciones acciones={[activo ? 'Dar de alta' : 'Dar de baja']} escritura={escritura} />
    </>
  );
}

const esIdentificadorValido = (usuarioId: string): boolean => {
  const numero = Number.parseInt(usuarioId, 10);
  return Number.isInteger(numero) && numero > 0 && String(numero) === usuarioId.trim();
};
