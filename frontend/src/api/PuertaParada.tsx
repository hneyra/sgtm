import { olvidarLaParada, entrar } from './sesion';

/**
 * Lo que se dibuja cuando la puerta NO se puede cruzar.
 *
 * Existe porque el estado que sustituye era una pantalla en blanco parpadeando:
 * sin token y con puerta, el arranque iba al formulario, el emisor devolvía el
 * mismo error, y vuelta a empezar. Nada dibujado, ninguna traza, y el emisor
 * recibiendo la ráfaga.
 *
 * Se dibuja sin la aplicación detrás —no hay sesión con que montarla— así que
 * lleva sus propios estilos y no depende de nada del shell.
 */
export function PuertaParada({ motivo, detalle, salida = false }: { motivo: string; detalle?: string; salida?: boolean }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg)',
        color: 'var(--ink)',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          background: 'var(--bg-card)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-1)',
          padding: '28px 30px 26px',
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
          Sistema de Gestión Tributaria Municipal
        </p>
        <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.015em', textWrap: 'pretty' }}>
          {motivo}
        </h1>
        {detalle !== undefined && (
          <p style={{ margin: '0 0 20px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>{detalle}</p>
        )}
        <button
          onClick={() => {
            olvidarLaParada();
            void entrar();
          }}
          style={{
            appearance: 'none',
            border: 0,
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 500,
            padding: '10px 18px',
            cursor: 'pointer',
          }}
        >
          {salida ? 'Entrar otra vez' : 'Volver a intentarlo'}
        </button>
      </div>
    </main>
  );
}
