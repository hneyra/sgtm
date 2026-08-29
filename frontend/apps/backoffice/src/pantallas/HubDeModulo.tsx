import { Link, useParams } from 'react-router-dom';
import { Aviso, Icono, IconoDeModulo } from '@sgtm/design-system';
import { bloquesDe, rutaDeOpcion } from '../catalogo';
import type { BloqueDeNavegacion } from '../catalogo';
import { useCatalogoVisible } from '../app/sesion/useCatalogoVisible';

/**
 * Que dice la fila de un bloque plegado, que es lo unico que distingue los dos
 * pliegues en toda la navegacion (ADR-0014 §5).
 *
 * **Con carril**, la frase describe el centro de reportes: se elige la hoja a la
 * izquierda y se emite a la derecha. **Sin carril**, describe lo que de verdad
 * hay —una sola pantalla con sus pestanas o su conmutador—, y decir lo del
 * carril ahi seria prometer una lista que esa pantalla no dibuja.
 */
const descripcionDelPliegue = (bloque: BloqueDeNavegacion): string =>
  bloque.carril
    ? `${bloque.opciones.length} hojas en una pantalla: se elige la hoja a la izquierda y se emite a la derecha.`
    : `${bloque.opciones.length} opciones en una sola pantalla: se pasa de una a otra sin volver al menú.`;

/** Lo que cabe de la descripcion en una fila del hub, segun el prototipo. */
const RECORTE = 108;

const recortar = (texto: string): string =>
  texto.length > RECORTE ? `${texto.slice(0, RECORTE).replace(/\s\S*$/, '')}…` : texto;

/**
 * Hub de modulo (FRO-03 §3): la portada de cada uno de los doce.
 *
 * Un menu de dos niveles esconde lo que hay dentro de un modulo hasta que se
 * abre; el hub lo ensena de golpe, con la descripcion de cada opcion, que es lo
 * que permite elegir sin abrir cuatro para ver cual era.
 */
export function HubDeModulo() {
  const { moduloId = '' } = useParams();
  const catalogo = useCatalogoVisible();
  // El modulo que este usuario ve, con las opciones que este usuario ve. Un
  // modulo cuyas opciones estan todas ocultas no esta en esta lista, y entonces
  // no existe para el —que es lo mismo que dice el menu— (REQ-03 §5).
  const modulo = catalogo.modulos.find((m) => m.id === moduloId);

  if (!modulo) {
    return (
      <Aviso
        titulo="Ese módulo no existe"
        detalle="El sistema tiene doce módulos, los del manual. Usa Ctrl K para buscar."
      />
    );
  }

  const bloques = bloquesDe(modulo);

  return (
    <>
      <header className="sgtm-hub__cabecera">
        <span className="sgtm-hub__icono">
          <IconoDeModulo trazos={modulo.icono} tamano={24} />
        </span>
        <div>
          <h2 className="sgtm-hub__titulo">{modulo.label}</h2>
          <p className="sgtm-hub__conteo">
            {modulo.opciones.length} opciones en {bloques.length}{' '}
            {bloques.length === 1 ? 'bloque' : 'bloques'}
          </p>
        </div>
      </header>

      <div className="sgtm-hub__rejilla">
        {bloques.map((bloque) => {
          // Un bloque plegado ensena **una** fila —la que abre su superficie—
          // con el conteo de las opciones que hay dentro (ADR-0014 §5). La
          // primera visible es la que abre, igual que en la barra lateral: no
          // hay ruta del pliegue, y por tanto no hay permiso que inventar.
          const filas = bloque.plegado ? bloque.opciones.slice(0, 1) : bloque.opciones;
          return (
            <section key={bloque.label} className="sgtm-tarjeta">
              <div className="sgtm-hub__bloque-cabecera">
                <h3 className="sgtm-hub__bloque-etiqueta">{bloque.label}</h3>
                <span className="sgtm-tarjeta__conteo">{bloque.opciones.length}</span>
              </div>
              <div className="sgtm-hub__filas">
                {filas.map((opcion) => (
                  <Link
                    key={opcion.id}
                    to={rutaDeOpcion(modulo, opcion)}
                    className="sgtm-hub__fila"
                  >
                    <span className="sgtm-hub__fila-texto">
                      <span className="sgtm-hub__fila-etiqueta">
                        {bloque.plegado ? bloque.label : opcion.label}
                      </span>
                      <span className="sgtm-hub__fila-desc">
                        {bloque.plegado ? descripcionDelPliegue(bloque) : recortar(opcion.resumen)}
                      </span>
                    </span>
                    <Icono nombre="chevronDerecha" tamano={14} />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
