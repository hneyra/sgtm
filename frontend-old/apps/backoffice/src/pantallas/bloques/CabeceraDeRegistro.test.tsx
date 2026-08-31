import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CabeceraDeRegistro } from './CabeceraDeRegistro';
import { SIN_DATO } from '../seguridad/listado';

/**
 * El bloque compartido de la cabecera-resumen (#391 §4).
 *
 * Lo que se aísla aquí es **lo que el bloque garantiza a las tres superficies
 * que lo usan**, sin montar ninguna de ellas: la ficha del predio, el territorio
 * y el cuadro de valuación ya se comprueban de punta a punta en
 * `anatomia-uniforme.test.tsx`.
 *
 * Dos cosas, y la segunda es la que no puede sostener un tipo:
 *
 * 1. **La forma es una sola**: identificador, insignias con su texto y rejilla
 *    de datos, y cada valor anunciado con su etiqueta.
 * 2. **Ninguna cifra sin su fecha** (regla 9, RNF-075). Que una cifra declare su
 *    fecha lo exige el tipo —`cifra: true` obliga a `aLaFecha`— y eso lo caza el
 *    compilador; que esa fecha **no llegue en blanco** no lo puede exigir
 *    ningún tipo, y ahí el bloque se planta: la cifra no se enseña.
 */

describe('la forma de la cabecera es una sola', () => {
  it('el identificador va en monoespaciada y las insignias llevan su texto', () => {
    render(
      <CabeceraDeRegistro
        rotulo="Resumen de prueba"
        identificador="00-11-22"
        insignias={[{ texto: 'VIGENTE', tono: 'ok' }]}
        apostilla="v3 · desde 12/03/2026"
        datos={[{ etiqueta: 'Titular', valor: 'PEÑA GARCÍA, ROSA' }]}
      />,
    );

    const region = screen.getByRole('region', { name: 'Resumen de prueba' });
    expect(region.querySelector('.sgtm-resumen__codigo')).toHaveTextContent('00-11-22');
    // El estado nunca solo por color: la insignia lleva su palabra (FRO-02 §2.1).
    expect(within(region).getByText('VIGENTE')).toBeInTheDocument();
    expect(within(region).getByText('v3 · desde 12/03/2026')).toBeInTheDocument();
    // Y el valor se anuncia con su etiqueta, que es lo que un `dl` a secas no hace.
    expect(within(region).getByLabelText('Titular')).toHaveTextContent('PEÑA GARCÍA, ROSA');
  });

  it('sin identificador dice que falta, en vez de dejar el hueco en blanco', () => {
    render(<CabeceraDeRegistro rotulo="Resumen de prueba" datos={[]} />);
    const region = screen.getByRole('region', { name: 'Resumen de prueba' });
    expect(region.querySelector('.sgtm-resumen__codigo')).toHaveTextContent(SIN_DATO);
  });

  /**
   * Sin registro abierto la ranura **no desaparece**: es lo que permite al
   * territorio conservar su cabecera mientras nadie ha señalado nada, diciendo
   * qué hay que elegir. Una cabecera que se esfuma deja la página empezando por
   * otra cosa, y con ella se va la anatomía.
   */
  it('con `vacio` conserva la ranura y dice qué falta, sin dibujar rejilla', () => {
    render(
      <CabeceraDeRegistro
        rotulo="Resumen de prueba"
        identificador="00-11-22"
        datos={[{ etiqueta: 'Titular', valor: 'PEÑA GARCÍA, ROSA' }]}
        vacio="Elige algo para ver su detalle."
      />,
    );

    const region = screen.getByRole('region', { name: 'Resumen de prueba' });
    expect(within(region).getByText('Elige algo para ver su detalle.')).toBeInTheDocument();
    expect(region.querySelector('.sgtm-resumen__datos')).toBeNull();
    expect(region.querySelector('.sgtm-resumen__codigo')).toBeNull();
  });

  it('mientras carga no enseña datos a medias: enseña su esqueleto', () => {
    const { container } = render(
      <CabeceraDeRegistro
        rotulo="Resumen de prueba"
        identificador="00-11-22"
        datos={[{ etiqueta: 'Titular', valor: 'PEÑA GARCÍA, ROSA' }]}
        cargando
      />,
    );
    expect(screen.queryByRole('region', { name: 'Resumen de prueba' })).not.toBeInTheDocument();
    expect(container.querySelector('.sgtm-esqueleto')).not.toBeNull();
  });
});

describe('ninguna cifra de la cabecera sin la fecha a la que está (regla 9)', () => {
  it('una cifra se dibuja con su fecha al lado', () => {
    render(
      <CabeceraDeRegistro
        rotulo="Resumen de prueba"
        identificador="01"
        datos={[
          { etiqueta: 'Predios inscritos', valor: '512', cifra: true, aLaFecha: '2026-08-29' },
        ]}
      />,
    );
    expect(screen.getByLabelText('Predios inscritos')).toHaveTextContent('512 al 29/08/2026');
  });

  /**
   * **Y sin fecha no se enseña.** Es la mitad que el tipo no puede sostener: la
   * unión discriminada obliga a declarar `aLaFecha`, pero no puede impedir que
   * llegue vacía —una respuesta sin `fechaCalculo`, un adaptador que todavía no
   * la trae—. Un `512` que nadie puede fechar es una afirmación que acaba en el
   * sustento de una determinación; sale «—», que es lo que se puede sostener.
   */
  it('una cifra cuya fecha llega en blanco no se enseña: sale «—»', () => {
    render(
      <CabeceraDeRegistro
        rotulo="Resumen de prueba"
        identificador="01"
        datos={[{ etiqueta: 'Predios inscritos', valor: '512', cifra: true, aLaFecha: '' }]}
      />,
    );
    const dato = screen.getByLabelText('Predios inscritos');
    expect(dato).toHaveTextContent(SIN_DATO);
    expect(dato).not.toHaveTextContent('512');
  });

  it('un hueco no se fecha: «—» no es una cifra a la que ponerle día', () => {
    render(
      <CabeceraDeRegistro
        rotulo="Resumen de prueba"
        identificador="01"
        datos={[{ etiqueta: 'Manzanas', valor: SIN_DATO, cifra: true, aLaFecha: '2026-08-29' }]}
      />,
    );
    const dato = screen.getByLabelText('Manzanas');
    expect(dato).toHaveTextContent(SIN_DATO);
    expect(dato).not.toHaveTextContent('29/08/2026');
  });

  it('lo que no es cifra no lleva fecha: un titular no está «a una fecha»', () => {
    render(
      <CabeceraDeRegistro
        rotulo="Resumen de prueba"
        identificador="01"
        datos={[{ etiqueta: 'Denominación', valor: 'CERCADO' }]}
      />,
    );
    expect(screen.getByLabelText('Denominación')).toHaveTextContent('CERCADO');
    expect(screen.getByLabelText('Denominación')).not.toHaveTextContent('al ');
  });
});
