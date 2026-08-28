import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { escribe } from '@sgtm/api-client';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../../pruebas/acciones';
import { ACTOS_SIN_CAMPO, impedimentoDelActo } from '../actos';
import { operacionDe } from '../busqueda';
import { OPCIONES_QUE_ESCRIBEN } from '../escrituras';

/**
 * **Las dos transferencias, y el dato que ninguna pantalla tiene** (#73).
 *
 * Lo que estas pruebas fijan no es una funcionalidad nueva: es el motivo por el
 * que dos opciones de Rentas · Registro **no** se conectan, dicho donde se lee
 * —la franja de la primaria— y con la precision que hace falta para que nadie lo
 * arregle por el sitio equivocado.
 *
 * El hallazgo, en una linea: `TransferenciaPredioController` y
 * `TransferenciaVehiculoController` exigen `valorTransferencia` y **ninguna de
 * las dos pantallas del manual dibuja un campo para el**. El prototipo lo dibuja
 * en otra —«Impuesto de alcabala»—, que es justo la que el backend no lee:
 * `RegistrarAlcabala` toma la base de `transferencia.valorTransferencia()`. Asi
 * que el mismo dato esta en dos sitios distintos segun a quien se le pregunte, y
 * ninguno de los dos es inventable desde aqui: es la base imponible de un
 * impuesto (art. 24 de la LTM).
 *
 * Antes de esto, la franja de las dos decia `sin-declaracion` —«la pantalla aún
 * no manda estos campos»—, que **invita a la correccion equivocada**: declararlos
 * en `escrituras.ts` no cambia nada, porque el que falta no esta en el
 * formulario. Es la misma correccion que #333 hizo con `sin-determinacion`.
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

const ACCIONES_DEL_PREDIO = ['Validar deuda del transferente', 'Registrar transferencia'];
const ACCIONES_DEL_VEHICULO = ['Validar deuda', 'Registrar transferencia'];

describe('la causa es la del campo que falta, no la del verbo', () => {
  it.each([
    { opcion: 'transferencia_predio', acciones: ACCIONES_DEL_PREDIO },
    { opcion: 'transferencia_vehiculo', acciones: ACCIONES_DEL_VEHICULO },
  ])('$opcion: sin-campo', ({ opcion, acciones }) => {
    expect(impedimentoDelActo(opcion, acciones)?.causa).toBe('sin-campo');
    /* Y **no** por el verbo: las dos operaciones escriben, asi que sin la
       declaracion caerian en `sin-declaracion`, que es lo que decian hasta hoy.
       Sin esta comprobacion, la causa nueva podria estar puesta por cualquier
       otro motivo —una primaria distinta, un contrato sin la ruta— y la prueba
       no lo notaria. */
    expect(escribe(operacionDe(opcion) ?? 'inicio')).toBe(true);
  });

  /**
   * **La causa nueva no se ha comido a la que habia.** Si `sin-campo` alcanzara
   * a cualquier opcion con verbo de escritura sin declarar, las dos causas
   * dirian lo mismo y distinguirlas no serviria de nada.
   */
  it('una opcion que escribe, sin declarar y sin el registro, sigue en sin-declaracion', () => {
    // Con **sus** acciones del catalogo, no con unas inventadas: la primaria es
    // lo que decide entre tres de las cuatro causas.
    expect(
      impedimentoDelActo('predial_masivo', ['Simular', 'Ver observados', 'Ejecutar proceso'])
        ?.causa,
    ).toBe('sin-declaracion');
  });

  it('el texto habla de la ventanilla y el nombre del campo se queda fuera', () => {
    for (const opcion of ['transferencia_predio', 'transferencia_vehiculo']) {
      const detalle = impedimentoDelActo(opcion, ACCIONES_DEL_PREDIO)?.detalle ?? '';
      // Dice **que** dato falta, con las palabras del papel que lo trae.
      expect(detalle).toMatch(/valor de la transferencia/);
      // Y por donde se sale: el acto existe fuera del sistema.
      expect(detalle).toMatch(/Registra el acto por el procedimiento actual/);
      expect(detalle).toMatch(/avísale a sistemas/);
      /* Lo tecnico **no se pinta**: quien atiende no sabe que es
         `valorTransferencia` ni que son campos declarados, y leyendolo solo
         puede concluir que la pantalla esta rota y que la culpa es suya. */
      expect(detalle).not.toMatch(/valorTransferencia/);
      expect(detalle).not.toMatch(/backend|endpoint|declarad|contrato|API/i);
    }
  });

  it('y la mitad tecnica si nombra el campo, para quien mantiene', () => {
    for (const opcion of ['transferencia_predio', 'transferencia_vehiculo']) {
      expect(ACTOS_SIN_CAMPO[opcion]?.campos).toEqual(['valorTransferencia']);
    }
  });

  /**
   * **Declararse y estar en el registro es una contradiccion**, y el dia que una
   * transferencia gane su campo hay que sacarla de aqui: `impedimentoDelActo`
   * devuelve `undefined` para lo declarado, asi que la entrada quedaria viva y
   * muda, diciendo que falta un dato que ya se escribe.
   */
  it('ninguna opcion esta a la vez declarada y en el registro', () => {
    const declaradas = new Set(OPCIONES_QUE_ESCRIBEN);
    for (const opcion of Object.keys(ACTOS_SIN_CAMPO)) {
      expect(
        declaradas.has(opcion),
        `«${opcion}» declara escritura y ademas dice que le falta`,
      ).toBe(false);
    }
  });
});

describe('las dos pantallas lo dicen donde se lee', () => {
  it.each([
    { opcion: 'transferencia_predio', ruta: '/rentas-registro/transferencia-predio' },
    { opcion: 'transferencia_vehiculo', ruta: '/rentas-registro/transferencia-vehiculo' },
  ])('$opcion: la primaria apagada y la franja nombra el dato', async ({ ruta }) => {
    const montada = montarEnRuta(ruta);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Falta un dato que esta pantalla no tiene dónde escribir/);
    expect(motivoDeLaPrimaria()).toMatch(/valor de la transferencia/);
    // La causa tecnica viaja en el `data-`, como las otras tres.
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      'sin-campo',
    );

    montada.unmount();
  });

  /**
   * **Y no se puede escribir nada, que es lo coherente con no poder guardar.**
   * La negacion por omision de `escrituras.ts` sigue mandando: sin declaracion,
   * ningun campo del formulario entra en el estado de React. Es lo que hace que
   * la franja no sea un cartel encima de un formulario vivo.
   */
  it('no hay ni un campo escribible, ni caja de observacion', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/rentas-registro/transferencia-predio');
    await waitFor(() => expect(document.querySelector('.sgtm-formulario')).not.toBeNull());

    const minuta = screen.getByLabelText('Nº de minuta / escritura');
    expect(minuta).toHaveAttribute('readonly');
    await usuario.type(minuta, 'EP-1');
    expect(minuta).toHaveValue('');

    // Sin escritura no hay observacion que pedir: la regla 10 se cumple sin caja
    // porque no hay a donde guardar (`useEscritura` no se activa).
    expect(screen.queryByRole('region', { name: 'Observación del usuario' })).toBeNull();
  });
});
