import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../../pruebas/acciones';
import { AVISOS } from '../prosa-textos';
import { impedimentoDelActo } from '../actos';

/**
 * **La opcion `portal`: la unica que se queda sin backend a proposito** (#400 AC-F).
 *
 * Con las demas rutas encendidas, esta pantalla es la unica de las 134 que se
 * quedaria sin nadie que le conteste: `GET /portal/deuda` no la sirve ningun
 * controlador y ninguno va a servirla. Y eso no esta pendiente, esta decidido en
 * dos sitios —ADR-0016 §3 la deja «con su id, su ruta y su permiso», ADR-0020 le
 * dio al ciudadano su propia aplicacion y `GET /portal/situacion`—, con el pago
 * aparcado en #449.
 *
 * De las cuatro salidas que #400 considero, la elegida fue **dejarla como esta y
 * decirlo en la pantalla**: no se toca la ruta —que es lo que ADR-0016 §3 fijo—,
 * no se reapunta a otra lectura —lo que llenaria la tabla de deuda dejando
 * «Pagar S/ 640.06» prometiendo un pago que no existe, el defecto de #421 y
 * #332— y no se retira del contrato.
 *
 * Lo que esta prueba sostiene es la mitad que se puede perder sin ruido: **que
 * la pantalla lo diga**. Sin el aviso, lo que hay es un formulario de pago
 * completo —medio de pago, correo, celular, terminos— con el boton apagado, y de
 * ahi la lectura natural es que el pago en linea existe y hoy falla.
 */
describe('portal: la vista del funcionario, sin backend y dicho en la pantalla', () => {
  beforeEach(() => {
    instalarProxyDeDatos({ latencia: false });
  });
  afterEach(() => {
    desinstalarProxyDeDatos();
  });

  it('dibuja el aviso permanente, y dice que aqui no se cobra', async () => {
    // Sin esto, quitar la entrada dejaria a `findByText('')` fallando por un
    // motivo que no es el que se mide.
    const declarado = AVISOS['portal'];
    expect(declarado, 'la opcion «portal» tiene que declarar su aviso').toBeDefined();

    montarEnRuta('/inicio/portal');
    expect(await screen.findByText(declarado?.titulo ?? '')).toBeInTheDocument();
    // Las dos cosas que el aviso tiene que dejar dichas: que este boton no cobra,
    // y por donde se cobra mientras tanto. Un aviso que solo dijera «no
    // disponible» dejaria a quien atiende sin saber que hacer con la persona que
    // tiene delante.
    expect(AVISOS['portal']?.detalle).toMatch(/no cobra nada/);
    expect(AVISOS['portal']?.detalle).toMatch(/ventanilla/);
  });

  it('la primaria de pago se queda apagada, con su motivo escrito al lado', async () => {
    montarEnRuta('/inicio/portal');
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    primariaApagada();
    // Se **lee**: un `title` sobre un boton apagado no lo alcanza ni el teclado
    // ni el lector de pantalla (RNF-082, FRO-04 §6).
    expect(motivoDeLaPrimaria()).toBeDefined();
    expect(document.querySelector('[data-causa]')?.getAttribute('data-causa')).toBe('sin-backend');
  });

  it('y su causa sigue siendo la que el censo cuenta', () => {
    // La decision no mueve la causa —no hay campo que falte ni declaracion que
    // hacer: no hay a donde guardar—, asi que el censo de `actos-honestos` no se
    // toca. Lo que cambia es que ahora, ademas de la franja, hay un aviso que
    // dice cual es el motivo de verdad.
    expect(impedimentoDelActo('portal', ['Descargar estado de cuenta', 'Pagar S/ 640.06'])).toEqual(
      {
        causa: 'sin-backend',
        detalle: expect.stringContaining('todavía no se puede guardar nada'),
      },
    );
  });
});
