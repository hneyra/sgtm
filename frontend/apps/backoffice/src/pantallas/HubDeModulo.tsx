import { Link, useParams } from 'react-router-dom';
import { Aviso, Icono, IconoDeModulo } from '@sgtm/design-system';
import { bloquesDe, moduloPorId, rutaDeOpcion } from '../catalogo';

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
  const modulo = moduloPorId(moduloId);

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
        {bloques.map((bloque) => (
          <section key={bloque.label} className="sgtm-tarjeta">
            <div className="sgtm-hub__bloque-cabecera">
              <h3 className="sgtm-hub__bloque-etiqueta">{bloque.label}</h3>
              <span className="sgtm-tarjeta__conteo">{bloque.opciones.length}</span>
            </div>
            <div className="sgtm-hub__filas">
              {bloque.opciones.map((opcion) => (
                <Link key={opcion.id} to={rutaDeOpcion(modulo, opcion)} className="sgtm-hub__fila">
                  <span className="sgtm-hub__fila-texto">
                    <span className="sgtm-hub__fila-etiqueta">{opcion.label}</span>
                    <span className="sgtm-hub__fila-desc">{recortar(opcion.resumen)}</span>
                  </span>
                  <Icono nombre="chevronDerecha" tamano={14} />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
