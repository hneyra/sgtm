/**
 * Andamio de la aplicacion.
 *
 * **Aqui no hay interfaz todavia, y es deliberado.** Esta iteracion monta el
 * espacio de trabajo —yarn workspaces, paquetes compartidos, verificaciones—
 * para que la siguiente implemente las 134 pantallas contra un terreno ya
 * preparado, igual que el backend construyo primero las barreras de aislamiento
 * y despues el negocio.
 *
 * Lo que viene: el shell (barra lateral de dos niveles, cabecera, paleta de
 * comandos), el hub de modulo y las diez plantillas de contenido, segun
 * `design/design_handoff_sgtm_web/README.md` y FRO-03.
 */
export function App() {
  return (
    <main style={{ maxWidth: '70ch', margin: '0 auto', padding: '18vh 24px' }}>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 10,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          color: 'var(--ink-3)',
          margin: '0 0 10px',
        }}
      >
        SGTM
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 29,
          fontWeight: 400,
          letterSpacing: '-.025em',
          lineHeight: 1.15,
          margin: '0 0 14px',
        }}
      >
        El espacio de trabajo del frontend esta montado.{' '}
        <em>La interfaz se implementa en la siguiente iteracion.</em>
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          lineHeight: 1.6,
          color: 'var(--ink-2)',
          margin: 0,
        }}
      >
        Doce modulos y 134 opciones, con el diseno de referencia en{' '}
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>design/</code> y su mapa en{' '}
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>
          docs/60-frontend/mapa-de-pantallas.md
        </code>
        .
      </p>
    </main>
  );
}
