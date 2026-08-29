import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaEncendida } from '../../pruebas/acciones';

/**
 * **Un solo vocabulario de accion y un solo buscador del predio** (#391 §2 y §3),
 * vistos en la pantalla.
 *
 * El mecanismo —que acciones se quedan y en que orden— se comprueba sin montar
 * nada en `pantallas/actos-honestos.test.tsx`. Aqui se comprueba lo que llega a
 * ventanilla, que es lo que el issue existe para arreglar:
 *
 * 1. que **ningun boton navy imprima**: en cuatro fichas de consulta la regla
 *    «la ultima es la primaria» convertia «Imprimir ficha rural» en el acto de
 *    la pantalla, y en la de al lado el navy guardaba;
 * 2. que los **modos** —«Modificar», «Deshacer», «Quitar»— no esten en la
 *    barra, y que «Quitar» siga estando **por fila**, que es donde dice de que
 *    fila es;
 * 3. que la unica que escribe siga exigiendo su observacion, con su franja y su
 *    `aria-describedby` (regla 10, RNF-052): reordenar no adelanta nada;
 * 4. que se busque el predio en **un** sitio: el campo que lo abre cuando no hay
 *    ninguno abierto, ninguno cuando ya lo hay, y un enlace a «Consulta de
 *    fichas» para lo que esas cinco pantallas nunca supieron buscar.
 */

const URBANA = '/catastro/ficha-urbana/200601010150010101001';
const ECONOMICA = '/catastro/ficha-economica/200601010150010101001';
const BIENES = '/catastro/ficha-bienes/200601010150010101';
const RURAL = '/catastro/ficha-rural/11024-0418';
const ACTUALIZACION = '/catastro/actualizacion-catastro/200601010150010101001';

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** La barra del fondo, por su bloque: hay mas botones en la pagina que los suyos. */
const barra = () => document.querySelector('.sgtm-acciones') as HTMLElement;

const rotulosDeLaBarra = (): string[] =>
  [...barra().querySelectorAll('.sgtm-boton')].map((boton) => boton.textContent ?? '');

const navyDeLaBarra = (): string[] =>
  [...barra().querySelectorAll('.sgtm-boton--primario')].map((boton) => boton.textContent ?? '');

describe('ninguna ficha de consulta tiene un boton navy que imprima', () => {
  /**
   * La rural es donde mas se veia: su catalogo dibuja «Calcular · Guardar ·
   * Imprimir ficha rural», y la ultima —la primaria de FRO-03 §5— era un
   * «Imprimir». El «Guardar» del medio nunca pudo guardar: la operacion de las
   * cuatro fichas es `GET /catastro/fichas/…`.
   */
  it('la rural deja «Calcular» e «Imprimir ficha rural» secundarias, y ninguna primaria', async () => {
    montarEnRuta(RURAL);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    expect(rotulosDeLaBarra()).toEqual(['Calcular', 'Imprimir ficha rural']);
    expect(navyDeLaBarra()).toEqual([]);
    // «Calcular» es una simulacion —ensena un resultado antes de escribir— y va
    // a la izquierda; la impresion, detras. Ninguna de las dos guarda.
    expect(screen.getByRole('button', { name: 'Calcular' })).toHaveClass('sgtm-boton--secundario');
    expect(screen.getByRole('button', { name: 'Imprimir ficha rural' })).toHaveClass(
      'sgtm-boton--secundario',
    );
    // Y el «Guardar» que no podia guardar ya no esta.
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
    // Sin primaria no hay franja que referenciar: no hay ningun acto pendiente.
    expect(motivoDeLaPrimaria()).toBeUndefined();
  });

  /**
   * Bienes comunes se queda con **una sola** accion, y es una simulacion:
   * repartir el valor de la edificacion entre sus unidades es una determinacion
   * que el servidor no hace todavia (D-02a), y por eso su total sale «—».
   */
  it('la de bienes comunes deja «Distribuir valor» secundaria, y ninguna primaria', async () => {
    montarEnRuta(BIENES);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    expect(rotulosDeLaBarra()).toEqual(['Distribuir valor']);
    expect(navyDeLaBarra()).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });

  /**
   * La economica pierde su «Nuevo»: el alta guiada la declara **la modalidad
   * urbana** —es la que se abre por el codigo de referencia catastral
   * (`catastro/composicion.ts`)—, asi que aqui era un boton que no abria ningun
   * formulario. Lo que queda es «Imprimir», y la primaria es el enlace al acto.
   */
  it('la economica pierde el «Nuevo» que no abria nada, y su primaria es el acto', async () => {
    montarEnRuta(ECONOMICA);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    // El enlace al acto se dibuja dentro de la barra y cuenta como uno de sus
    // botones: es la primaria, y por eso va detras de todo.
    expect(rotulosDeLaBarra()).toEqual(['Imprimir', 'Actualizar catastro']);
    expect(screen.queryByRole('button', { name: 'Nuevo' })).not.toBeInTheDocument();
    // La primaria de la barra es el enlace, que si lleva a donde se escribe.
    const acto = screen.getByRole('link', { name: 'Actualizar catastro' });
    expect(acto).toHaveClass('sgtm-boton--primario');
    expect(navyDeLaBarra()).toEqual(['Actualizar catastro']);
  });

  /**
   * Y sin predio abierto tampoco: sin registro no hay enlace al acto, y la regla
   * de FRO-03 §5 pintaria de navy lo unico que quedara —«Imprimir»—.
   */
  it('la economica sin predio abierto tampoco tiene navy: no hay a donde escribir', async () => {
    montarEnRuta('/catastro/ficha-economica');
    await screen.findByText(/Elige un predio/);

    expect(navyDeLaBarra()).toEqual([]);
    expect(screen.queryByRole('link', { name: 'Actualizar catastro' })).not.toBeInTheDocument();
  });

  /**
   * La urbana **si** tiene primaria sin predio abierto, y no es una excepcion a
   * la regla: «Nuevo» abre el alta guiada de #320, que escribe de verdad
   * (`POST /catastro/fichas/urbana`). La regla dice «la que escribe», no «la que
   * guarda esta pantalla».
   */
  it('la urbana sin predio abierto tiene una primaria, y es el alta que escribe', async () => {
    montarEnRuta('/catastro/ficha-urbana');
    await screen.findByText(/Elige un predio/);

    expect(rotulosDeLaBarra()).toEqual(['Nuevo', 'Imprimir']);
    expect(navyDeLaBarra()).toEqual(['Nuevo']);
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeEnabled();
  });
});

describe('los modos salen de la barra, y «Quitar» se queda donde dice de que fila es', () => {
  it('la urbana no dibuja «Modificar» ni «Deshacer» en ninguna parte', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    for (const modo of ['Modificar', 'Deshacer']) {
      expect(screen.queryByRole('button', { name: modo })).not.toBeInTheDocument();
    }
  });

  /**
   * «Quitar» del catalogo de la actualizacion es un modo **y ademas un
   * duplicado**: la accion existe por fila desde #71, con su propio
   * `aria-label`. Uno solo al pie no dice de que piso es; diez iguales no se
   * distinguen. El de fila se queda; el de la barra se va.
   */
  it('la actualizacion no lleva «Quitar» al pie, y si por piso', async () => {
    montarEnRuta(ACTUALIZACION);
    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });

    expect(rotulosDeLaBarra()).toEqual(['Imprimir', 'Guardar']);
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar el piso 02' })).toBeInTheDocument();
    // Y «Nuevo» tampoco: el alta de una ficha es la de la modalidad urbana.
    expect(screen.queryByRole('button', { name: 'Nuevo' })).not.toBeInTheDocument();
  });
});

describe('la unica que escribe conserva su primaria, su franja y su observacion', () => {
  /**
   * Lo que mas protege el repositorio (regla 10, RNF-052). El catalogo dibuja
   * «Nuevo · Guardar · Imprimir · Quitar»: la primaria de FRO-03 §5 seria
   * «Quitar» —un modo—, y «Guardar» quedaba de tercera, apagada para siempre.
   * Uniformada, «Guardar» es **la ultima**, y sigue sin encenderse hasta que hay
   * observacion.
   */
  it('«Guardar» es la ultima, se apaga con `aria-disabled` y su franja se lee', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ACTUALIZACION);
    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });

    const botones = [...barra().querySelectorAll('.sgtm-boton')];
    expect(botones.at(-1)).toHaveTextContent('Guardar');
    expect(botones.at(-1)).toHaveClass('sgtm-boton--primario');

    await usuario.type(screen.getByLabelText('Documento de origen'), 'Acta 2026-9');
    // Apagada y **enfocable**: un boton `disabled` no recibe foco y su
    // `aria-describedby` no lo lee nadie (FRO-04 §6).
    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/observación/i);

    await usuario.type(screen.getByLabelText('Observación'), 'Ampliación verificada en campo.');
    primariaEncendida();
  });
});

describe('un solo buscador del predio', () => {
  /**
   * Sin predio abierto se dibuja **el campo que lo abre y ninguno mas**. Los
   * otros del catalogo prometian acotar una ficha y no viajaban: la conexion de
   * las cuatro manda el codigo de la ruta, `historico` y `fecha`
   * (`catastro/index.ts`).
   */
  it.each([
    {
      ruta: '/catastro/ficha-urbana',
      abre: 'Código de Ref. Catastral · Depto.',
      fuera: [
        ['textbox', 'Cod. Contribuyente Rentas'],
        ['textbox', 'Nro. Ficha'],
        ['combobox', 'Uso'],
      ],
    },
    {
      ruta: '/catastro/ficha-economica',
      abre: 'Código de Ref. Catastral · Depto.',
      fuera: [
        ['textbox', 'Contribuyente'],
        ['textbox', 'CIIU'],
      ],
    },
    {
      ruta: '/catastro/actualizacion-catastro',
      abre: 'Cod. Ref. Catastral · Depto.',
      /* «Sector» va por su **rol** y no por su rotulo: el compositor tiene un
         tramo que se llama igual —el codigo lleva dentro el sector—, y buscar
         por texto encontraria ese. El filtro del catalogo es un desplegable
         (`t: 'sel'`); el tramo, una caja de texto. */
      fuera: [
        ['textbox', 'Nº de ficha'],
        ['combobox', 'Sector'],
        ['combobox', 'Tipo de actualización'],
      ],
    },
  ])('$ruta compone el codigo y no repite la consulta de fichas', async ({ ruta, abre, fuera }) => {
    const montada = montarEnRuta(ruta);
    await screen.findByText(/Elige un predio/);

    const busqueda = within(screen.getByRole('region', { name: 'Búsqueda' }));
    // El compositor de tramos, con el rotulo del catalogo (RNF-080).
    expect(busqueda.getByRole('textbox', { name: abre })).toBeInTheDocument();
    for (const [rol, campo] of fuera) {
      expect(
        busqueda.queryByRole(rol as 'textbox' | 'combobox', { name: campo }),
        `«${campo}» sigue dibujado`,
      ).not.toBeInTheDocument();
    }

    montada.unmount();
  });

  /**
   * Las dos que **no** componen el codigo dibujan su `Campo` de texto, que es lo
   * que ya hacian: su identificador no es un codigo de referencia catastral
   * —`11024-0418`, con guion— y troquelarlo en los diez tramos del manual diria
   * de el algo que su pantalla no dice (`catastro/composicion.ts`).
   */
  it.each([
    { ruta: '/catastro/ficha-bienes', abre: 'Cod. Edificación', fuera: 'Denominación' },
    { ruta: '/catastro/ficha-rural', abre: 'Cod. Unidad Catastral (UC)', fuera: 'Contribuyente' },
  ])('$ruta teclea su identificador, sin troquelarlo', async ({ ruta, abre, fuera }) => {
    const montada = montarEnRuta(ruta);
    await screen.findByText(/Elige un predio/);

    const busqueda = within(screen.getByRole('region', { name: 'Búsqueda' }));
    // Una sola caja, y **entera**: si aqui hubiera compositor, este rotulo no
    // existiria —serian diez tramos con «· Depto.», «· Prov.»…—.
    expect(busqueda.getByRole('textbox', { name: abre })).toBeInTheDocument();
    expect(busqueda.queryByRole('textbox', { name: `${abre} · Depto.` })).not.toBeInTheDocument();
    expect(busqueda.queryByRole('textbox', { name: fuera })).not.toBeInTheDocument();

    montada.unmount();
  });

  /**
   * **Y el enlace no es un adorno**: quien llega sin el codigo —con un nombre,
   * una manzana, un lote— se quedaria delante de una caja que no puede
   * rellenar. El sitio donde esa busqueda existe de verdad es «Consulta de
   * fichas», con su permiso y su paginacion.
   */
  it('y ofrece el sitio donde se busca lo que aqui no se puede buscar', async () => {
    montarEnRuta('/catastro/ficha-urbana');
    await screen.findByText(/Elige un predio/);

    const enlace = screen.getByRole('link', { name: 'Consulta de fichas catastrales' });
    expect(enlace).toHaveAttribute('href', '/catastro/consulta-fichas');
  });

  /** Con el predio en la ruta no hay nada que preguntar: la barra desaparece. */
  it.each([
    { ruta: URBANA },
    { ruta: ECONOMICA },
    { ruta: BIENES },
    { ruta: RURAL },
    { ruta: ACTUALIZACION },
  ])('$ruta ya no pregunta por el predio: esta en la ruta', async ({ ruta }) => {
    const montada = montarEnRuta(ruta);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    expect(screen.queryByRole('region', { name: 'Búsqueda' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Consulta de fichas catastrales' }),
    ).not.toBeInTheDocument();

    montada.unmount();
  });

  /**
   * Lo que el buscador que queda **si** hace: abrir el predio por su ruta, que
   * es la otra mitad de la regla. Buscar aqui no filtra una lista —no hay
   * lista—: lleva a la ficha.
   */
  it('componer el codigo y buscar abre esa ficha, con el predio en la direccion', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/ficha-urbana');
    await screen.findByText(/Elige un predio/);

    await usuario.click(screen.getByLabelText('Código de Ref. Catastral · Depto.'));
    await usuario.paste('200601010150010101001');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(screen.queryByText(/Elige un predio/)).not.toBeInTheDocument());
    // Y al abrirse, la busqueda ya no esta: el predio esta en la ruta.
    expect(screen.queryByRole('region', { name: 'Búsqueda' })).not.toBeInTheDocument();
  });
});
