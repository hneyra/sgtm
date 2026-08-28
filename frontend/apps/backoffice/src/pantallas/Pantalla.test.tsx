import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../pruebas/montar';
import { elBloque } from '../pruebas/nodos';

/**
 * El renderizador compone una pantalla a partir del catalogo y de la respuesta
 * de la API.
 *
 * Se prueba con el **proxy de datos instalado**, es decir, pidiendo por HTTP:
 * es el mismo camino que recorrera contra el backend. Una prueba que inyectara
 * los datos por props no diria nada sobre si la integracion funciona.
 */

beforeEach(() => instalarProxyDeDatos());
afterEach(() => desinstalarProxyDeDatos());

describe('la estructura se ve antes que los datos', () => {
  it('las columnas llegan con el modulo; las filas, cuando responde la API', async () => {
    // Sin conectar (#73 conecto `vehiculos`, que ya no pasa por el proxy
    // generico y no sirve como ejemplo de este camino): un listado cualquiera
    // de los que siguen pidiendo la forma comun basta para el punto de la
    // prueba.
    montarEnRuta('/transito/papeletas');

    // El catalogo sigue sin preguntarle nada a la API: la estructura viaja con
    // el trozo del modulo, que el navegador cachea, y llega antes que los datos.
    expect(await screen.findByRole('columnheader', { name: 'Nro. Papeleta' })).toBeInTheDocument();
    expect(screen.queryAllByText('MPS-2026-041182')).toHaveLength(0);

    // Las filas son de la API, y llegan cuando llegan. Con `findAllBy` y no
    // `findBy`: el numero de papeleta se repite en mas de una fila del mock.
    expect(await screen.findAllByText('MPS-2026-041182')).not.toHaveLength(0);
  });
});

describe('los bloques del descriptor', () => {
  it('el panel de recaudacion pinta indicadores y paneles con su avance', async () => {
    montarEnRuta('/inicio/inicio');

    expect(await screen.findByText('S/ 18.42 M')).toBeInTheDocument();
    expect(screen.getByText('Recaudado 2026')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avance 89 %' })).toBeInTheDocument();
  });

  it('una celda con tono se pinta como insignia, con su texto dentro', async () => {
    montarEnRuta('/transito/papeletas');

    const tabla = (await screen.findAllByRole('table', {}, { timeout: 3000 }))[0];
    expect(tabla).toBeDefined();
    if (!tabla) return;
    // El encabezado de la tabla existe desde el principio; las insignias llegan
    // con las filas, asi que hay que esperarlas.
    const insignias = await within(tabla).findAllByText(/./, { selector: '.sgtm-insignia' });
    expect(insignias.length).toBeGreaterThan(0);
    // Sin informacion solo por color (FRO-04 §7): la insignia siempre lleva texto.
    expect(insignias.every((i) => (i.textContent ?? '').trim().length > 0)).toBe(true);
  });

  it('los campos de solo lectura muestran el valor que sirvio la API', async () => {
    // `t: 'ro'` se dibuja como `<output>`, que si es texto real —a diferencia
    // de un `<input>`, cuyo valor no encuentra `getByText`—. Con registro en
    // la ruta: sin el, la operacion no se pide (`useDatosDePantalla`).
    montarEnRuta('/coactiva/proceso-coactivo/0000001201');
    await waitFor(() => expect(screen.getAllByText('701.08T1').length).toBeGreaterThan(0));
  });

  it('la barra de acciones deja la ultima como primaria', async () => {
    // Sobre la ficha rural y ya no sobre la urbana: desde #319 el acto de la
    // urbana vive en «Actualización del catastro», y entonces la primaria de su
    // barra es ese enlace y ninguna de las suyas —lo comprueba
    // `catastro/ficha-compuesta.test.tsx`—. La rural no declara acto, asi que
    // sigue siendo el ejemplo de la regla de FRO-03 §5.
    montarEnRuta('/catastro/ficha-rural/11024-0418');
    // El catalogo declara «Calcular · Guardar · Imprimir ficha rural», y la
    // ultima es la primaria.
    const primaria = await screen.findByRole('button', { name: 'Imprimir ficha rural' });
    expect(primaria).toHaveClass('sgtm-boton--primario');
    expect(screen.getByRole('button', { name: 'Calcular' })).toHaveClass('sgtm-boton--secundario');
  });

  it('el reporte se puede imprimir y su hoja lleva las dos firmas', async () => {
    montarEnRuta('/consultas/constancia');
    // La hoja y la barra de acciones ofrecen «Imprimir» las dos, como en el
    // prototipo; aqui interesa la de la hoja.
    const hoja = await screen.findByText('Cajero / Responsable');
    expect(hoja).toBeInTheDocument();
    expect(screen.getByText('Contribuyente')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Imprimir' }).length).toBeGreaterThan(0);
    // El resultado —se emite o se niega— viene de la API, no del catalogo.
    // El codigo del documento (#72) sale vacio a proposito: la numeracion es
    // D-09, todavia abierta, y un folio inventado aqui no lo emitiria nadie.
    expect(await screen.findByText(/SE EMITE|SE NIEGA/)).toBeInTheDocument();
  });
});

describe('las secciones colapsables', () => {
  it('«Opcional» arranca cerrada y el resto abiertas', async () => {
    montarEnRuta('/rentas-registro/predial-individual');

    /* Dentro del formulario, y no en la pantalla entera: desde #333 esta opcion
       lleva indice, y el indice repite el rotulo de cada seccion en una entrada
       que se llama «Ir a Beneficios aplicados». Con la busqueda global habia dos
       botones que casaban y no podia decidir. Lo que aqui se comprueba sigue
       siendo el colapso, que es el de las 134. */
    await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });
    const formulario = within(elBloque('.sgtm-formulario', 'el formulario'));

    const opcional = formulario.getByRole('button', { name: /Beneficios aplicados/ });
    expect(opcional).toHaveAttribute('aria-expanded', 'false');

    const sinHint = formulario.getByRole('button', { name: /Escala progresiva acumulativa/ });
    expect(sinHint).toHaveAttribute('aria-expanded', 'true');
  });

  it('«Solo lectura» tambien arranca cerrada', async () => {
    montarEnRuta('/coactiva/proceso-coactivo');
    const soloLectura = await screen.findByRole('button', { name: /Deuda del expediente/ });
    expect(soloLectura).toHaveAttribute('aria-expanded', 'false');
  });

  it('se abren y se cierran al pulsarlas', async () => {
    const usuario = userEvent.setup();
    // Sobre «Papeletas» y no sobre la ficha de vehiculo: desde #330 esa lleva
    // indice, y el indice repite el rotulo de cada seccion como una entrada mas
    // —dos botones con el mismo nombre, que es un problema de la busqueda de la
    // prueba y no del dibujo—. Lo que aqui se comprueba es el colapso, que es
    // igual en las 134.
    montarEnRuta('/transito/papeletas');

    const cabecera = await screen.findByRole('button', { name: /Infractor y vehículo/ });
    expect(cabecera).toHaveAttribute('aria-expanded', 'true');
    await usuario.click(cabecera);
    expect(cabecera).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('las pestanas', () => {
  it('cambiar de pestana cambia las secciones que se ven', async () => {
    const usuario = userEvent.setup();
    // «Papeletas» conserva sus cuatro pestanas: el indice que las sustituye es
    // opt-in por opcion (#330), y las demas pantallas con pestanas del sistema
    // se dibujan exactamente como se dibujaban. Esto es lo que lo comprueba.
    montarEnRuta('/transito/papeletas');

    const pestanas = await screen.findAllByRole('tab');
    expect(pestanas[0]).toHaveAttribute('aria-selected', 'true');

    const segunda = pestanas[1];
    expect(segunda).toBeDefined();
    if (!segunda) return;
    await usuario.click(segunda);
    expect(segunda).toHaveAttribute('aria-selected', 'true');
    expect(pestanas[0]).toHaveAttribute('aria-selected', 'false');
  });
});

describe('un desplegable de busqueda empieza donde el prototipo lo pone', () => {
  it('«Todas» sigue siendo su primera opcion, sin ninguna vacia delante', async () => {
    montarEnRuta('/transito/papeletas');

    // Los `sel` de **escritura** llevan una opcion vacia delante para no ensenar
    // una eleccion que nadie hizo (`eleccionObligatoria`). Los de **busqueda**
    // no: 78 filtros del catalogo traen «Todos»/«Todas» como primera opcion, y
    // esa **es** su posicion de partida —anteponerles una vacia los deja los 78
    // en blanco, y «Todas» pasaria a viajar como si fuera un valor de filtro—.
    const busqueda = await screen.findByRole('region', { name: 'Búsqueda' });
    const estado = within(busqueda).getByLabelText('Estado') as HTMLSelectElement;
    expect(estado.value).toBe('Todas');
    expect(estado.options[0]?.value).toBe('Todas');
  });
});

describe('cuando la API falla', () => {
  it('se muestra el mensaje del backend, no uno inventado', async () => {
    // El proxy responde 404 a lo que no esta en el contrato; se fuerza pidiendo
    // una operacion que el catalogo no declara.
    desinstalarProxyDeDatos();
    instalarProxyDeDatos();
    montarEnRuta('/catastro/no-existe');

    expect(await screen.findByText('Esa opción no existe en el catálogo')).toBeInTheDocument();
  });
});
