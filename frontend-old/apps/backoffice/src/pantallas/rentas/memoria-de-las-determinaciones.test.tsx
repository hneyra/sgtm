import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { PANTALLAS } from '../../catalogo/pantallas/rentas-registro.generado';
import { COMPOSICION_DE_RENTAS } from './composicion';

/**
 * **Cual de las seis determinaciones puede leerse como una cuenta, y cual no**
 * (#503 F4).
 *
 * #393 le dio a cinco de ellas la misma anatomia —sujeto, memoria del calculo,
 * acto— y solo dos declararon memoria. La razon estaba escrita en un comentario:
 * las demas no tienen ninguna seccion de solo lectura que encadene. Un
 * comentario no se pone rojo, y el reparto es justo lo que un porte del catalogo
 * puede mover sin que nadie se entere.
 *
 * Aqui se **computa de las estructuras portadas**: una seccion es una cuenta
 * cuando dos o mas de sus campos son de solo lectura, que es lo que
 * `MemoriaDeCalculo` sabe leer —un solo campo `"ro"` no encadena nada—. La lista
 * de las que la declaran tiene que coincidir con la lista de las que pueden.
 */

const SEIS = [
  'predial_individual',
  'predial_masivo',
  'arbitrios',
  'vehicular_calculo',
  'alcabala',
  'espectaculos',
] as const;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Las secciones de una opcion que encadenan: dos o mas campos de solo lectura. */
function seccionesQueEncadenan(opcion: string): readonly string[] {
  return (PANTALLAS[opcion]?.secciones ?? [])
    .filter((seccion) => seccion.campos.filter((campo) => campo.t === 'ro').length >= 2)
    .map((seccion) => seccion.label);
}

describe('el reparto de la memoria sale del catalogo, no de una lista escrita', () => {
  it('declaran memoria exactamente las que tienen una seccion que encadena', () => {
    const puede = SEIS.filter((opcion) => seccionesQueEncadenan(opcion).length > 0);
    const declara = SEIS.filter((opcion) => COMPOSICION_DE_RENTAS[opcion]?.memoria !== undefined);
    expect(declara).toEqual(puede);
    // Y son tres de las seis, no una cifra que se mueva sola.
    expect(declara).toEqual(['predial_individual', 'alcabala', 'espectaculos']);
  });

  it('cada memoria declarada nombra una seccion que existe, y su total un campo de ella', () => {
    for (const opcion of SEIS) {
      const memoria = COMPOSICION_DE_RENTAS[opcion]?.memoria;
      if (memoria === undefined) continue;
      for (const [seccion, declarada] of Object.entries(memoria)) {
        const delCatalogo = (PANTALLAS[opcion]?.secciones ?? []).find((s) => s.label === seccion);
        expect(delCatalogo, `${opcion}: la sección «${seccion}»`).toBeDefined();
        if (declarada.total === undefined) continue;
        expect(
          delCatalogo?.campos.some((campo) => campo.clave === declarada.total),
          `${opcion}: el total «${declarada.total}» es un campo de «${seccion}»`,
        ).toBe(true);
      }
    }
  });

  /**
   * **Las tres que no pueden, y por que**, medido en vez de comentado. La que
   * mas dice es el calculo vehicular: el prototipo del rediseño le dibuja una
   * memoria —el mayor entre el valor declarado y la tabla referencial del MEF,
   * por la tasa, contra el minimo— y su catalogo **no tiene ni una seccion**,
   * asi que portarla seria inventar una que el manual no capturo.
   */
  it('a las otras tres les falta la seccion, no la declaracion', () => {
    expect(PANTALLAS['vehicular_calculo']?.secciones).toBeUndefined();
    expect(PANTALLAS['arbitrios']?.secciones).toBeUndefined();
    // El masivo si tiene seccion, y es la de los parametros que se eligen antes
    // de correr el proceso: de sus ocho campos uno solo es de solo lectura.
    const masivo = PANTALLAS['predial_masivo']?.secciones ?? [];
    expect(masivo).toHaveLength(1);
    expect(masivo[0]?.campos.filter((campo) => campo.t === 'ro')).toHaveLength(1);
  });
});

describe('la memoria del espectaculo, dibujada', () => {
  /**
   * La cuenta del art. 57 se lee de una pasada, y **con guiones**: la
   * recaudacion declarada es entradas por precio, y esa multiplicacion es la
   * base imponible del art. 56 —una regla tributaria, que no vive en un
   * componente de React (regla 6)—. `PeticionDeEspectaculo` no tiene ni campo
   * para las entradas vendidas (#432), asi que las tres lineas salen «—» hasta
   * que el backend las publique. Un guion no es un cero.
   */
  it('las tres lineas de solo lectura salen de la rejilla y entran en la memoria', async () => {
    montarEnRuta('/rentas-registro/espectaculos');
    await screen.findByLabelText('Aforo autorizado');
    await waitFor(() => expect(document.querySelector('.sgtm-memoria')).not.toBeNull());
    const memoria = within(document.querySelector('.sgtm-memoria') as HTMLElement);

    // Los dos pasos de la cuenta, con el rotulo del manual y con guion: no
    // llegaron, no valen cero. `espectaculos` es un `POST` y no se pide al
    // abrir, y la recaudacion declarada la compone el backend (#432).
    for (const paso of ['Recaudación declarada (S/)', 'Tasa aplicable']) {
      const linea = memoria.getByText(paso).closest('.sgtm-memoria__linea') as HTMLElement;
      expect(linea.querySelector('.sgtm-memoria__importe')?.textContent, paso).toBe('—');
    }
    // Y el resultado va aparte de los pasos que lo producen.
    const resultado = document.querySelector('.sgtm-memoria__resultado') as HTMLElement;
    expect(resultado.textContent).toContain('Impuesto a pagar (S/)');
    expect(resultado.querySelector('.sgtm-memoria__resultado-valor')?.textContent).toBe('—');

    // Lo que se teclea sigue siendo un control, no una linea de la cuenta.
    expect(memoria.queryByLabelText('Aforo autorizado')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Garantía depositada (S/)')).toBeInTheDocument();
  });
});
