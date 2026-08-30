import type { ComposicionDeOpcion } from '../composicion';

/**
 * Tesorería compone alrededor de los bloques comunes (#74, esta pasada).
 *
 * `caja_tributaria` es la única: su catálogo no declara `filtros` —el
 * prototipo no le dibuja una barra de búsqueda, solo el formulario de
 * cobranza— y sin uno, `Filtros` nunca se dibuja: el «Cód. Contribuyente» de
 * la pantalla se ve, sale de solo lectura para siempre y «Cargar deudas» se
 * queda apagado. `caja_tributaria` lee `consulta_deuda`
 * (`pantallas/tesoreria/index.ts`, igual que `baja_deuda`), así que la
 * grilla sí sabe qué hacer con `codContribuyente` una vez que llega: lo único
 * que faltaba era el control para escribirlo.
 */
export const COMPOSICION_DE_TESORERIA: Readonly<Record<string, ComposicionDeOpcion>> = {
  caja_tributaria: {
    filtrosPropios: [{ clave: 'codContribuyente', label: 'Cód. Contribuyente', t: 'text' }],
    /**
     * **Los tres datos que el cobro exige y el manual no dibuja** (#430, #422).
     *
     * `CajaController.cobranza` pasa por `exigir` la caja, el cajero y la forma
     * de pago, y el catalogo de esta pantalla no tiene un campo para ninguno de
     * los tres. El del medio de pago es el que mas confunde y por eso lleva su
     * ayuda: **«Forma de pago» del prototipo es el tipo de cobranza** —NORMAL
     * TRIBUTARIO, A CUENTA, PRECONVENIO…, o sea `tipoDePago`— y el medio con que
     * entra el dinero es otro campo, `FormaDePago`, con otras cinco palabras.
     * Dos cosas distintas no pueden llamarse igual en la misma pantalla
     * (RNF-080), asi que la clave es `medioDePago` y la etiqueta, «Medio de
     * pago».
     *
     * La caja y el cajero **no van por `filtrosPropios`** como en `cierre_caja`,
     * y la diferencia importa: alli identifican el turno que se lee, y son de
     * verdad criterios de la lectura; aqui no acotan nada —`consulta_deuda` no
     * los admite, y `parametrosDeBusqueda` los descartaria—, asi que en la barra
     * de busqueda serian dos cajas que no buscan.
     */
    controles: [
      {
        campo: 'medioDePago',
        etiqueta: 'Medio de pago',
        tipo: 'sel',
        opciones: ['EFECTIVO', 'CHEQUE', 'DEPOSITO', 'TARJETA', 'TRANSFERENCIA'],
        ayuda:
          'Con qué entra el dinero. Es distinto de «Forma de pago», que aquí es el tipo de cobranza.',
        seccion: 'Forma de pago y beneficio',
      },
      {
        campo: 'caja',
        etiqueta: 'Caja',
        tipo: 'text',
        ph: 'C01',
        ayuda: 'El código de la ventanilla desde la que se cobra: su serie numera el recibo.',
        seccion: 'Forma de pago y beneficio',
      },
      {
        campo: 'cajero',
        etiqueta: 'Cajero',
        tipo: 'text',
        ph: 'jperez',
        ayuda: 'Quien cobra. El turno que se abre —o el que ya está abierto— es el suyo.',
        seccion: 'Forma de pago y beneficio',
      },
    ],
    /**
     * **Y las deudas que se cobran, elegidas en la grilla** (#332).
     *
     * Es el patron de `baja_deuda` sobre la **misma** lectura (`consulta_deuda`)
     * y por el mismo motivo: `PeticionDeCobranza.obligaciones` identifica la
     * obligacion —tributo, ejercicio y la unidad—, no la valora; el importe lo
     * relee el libro a la fecha de pago. La primera columna que el prototipo
     * dibuja vacia es justo la casilla.
     */
    /**
     * **Y las deudas que se cobran, elegidas en la grilla** (#332).
     *
     * Es el patron de `baja_deuda` sobre la **misma** lectura (`consulta_deuda`)
     * y por el mismo motivo: `PeticionDeCobranza.obligaciones` identifica la
     * obligacion —tributo, ejercicio y la unidad—, no la valora; el importe lo
     * relee el libro a la fecha de pago. La primera columna que el prototipo
     * dibuja vacia es justo la casilla.
     */
    seleccion: {
      tabla: 'obligaciones',
      una: 'deuda',
      varias: 'deudas',
      genero: 'femenino',
      // El contribuyente no es una columna: la pantalla entera es de uno solo y
      // su codigo esta en el filtro. Entra como una columna mas de la fila y
      // pasa por la misma lista blanca, igual que en la baja de deuda.
      contexto: (busqueda) => ({ codContribuyente: busqueda.get('codContribuyente') ?? '' }),
    },
  },

  /**
   * Y `cierre_caja` es la segunda, por el mismo motivo y con una consecuencia
   * mas (#423).
   *
   * Su catálogo tampoco declara `filtros` —el prototipo dibuja el turno ya
   * abierto, porque el cliente de escritorio sabía de qué caja y de qué cajero
   * era la sesión—, y aquí **la caja y el cajero son el sujeto de la pantalla
   * entera**: identifican el turno (`cierre_uq` de V3 lo hace único por caja,
   * cajero y fecha), el backend los exige en el cuerpo (`PeticionDeCierre`) y son
   * los dos parámetros con que `GET /tesoreria/recaudacion/avance` responde el
   * arqueo en vivo, que es lo que la pantalla llama «Cuadrar».
   *
   * Los dos campos que el catálogo dibuja con esos rótulos son `"ro"` y siguen
   * siéndolo: enseñan lo que el servidor encontró, no lo que se tecleó. El
   * mismo reparto que en `caja_tributaria` —donde «Cód. Contribuyente» se
   * pregunta arriba y la grilla la responde el backend—, y el mismo que
   * `EscrituraDeclarada.delFiltro` documenta para el cuerpo.
   */
  cierre_caja: {
    filtrosPropios: [
      { clave: 'caja', label: 'Caja', t: 'text' },
      { clave: 'cajero', label: 'Cajero', t: 'text' },
    ],
  },
};
