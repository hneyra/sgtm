/* La maqueta del panel de Inicio se ha ido entera.
 *
 * Aqui vivian `DEUDA`, `UNIDADES`, `PAGOS` y `PARADO`, «copiados literalmente
 * del artboard `Inicio.dc.html`» —lo decia su propio encabezado—, y la cara del
 * contribuyente los dibujaba como la cuenta de una persona: su nombre, cuatro
 * obligaciones con sus importes, tres unidades con su autovaluo, tres pagos con
 * su numero de recibo, y botones de «Pagar en linea» y «Fraccionar la deuda».
 *
 * Tenia encima un aviso que decia «las cifras de abajo son del prototipo, no de
 * nadie», y **ese es el arreglo que este repositorio rechaza**: una cifra que el
 * backend no publica sale con el guion largo y su motivo, nunca con la de la
 * maqueta. #702 lo midio del otro lado: lo que rodea a un dato hace que el dato
 * parezca cierto, y un listado real encima de un formulario de maqueta es peor
 * que el formulario solo.
 *
 * **Y no lo veia ningun arnes.** El conmutador que lleva a esa cara declara su
 * estado con `aria-pressed` y vive FUERA de `<main>`; `sin-red` visitaba los
 * pasos de un asistente y `role="tab"` —que en este producto sale **0**— y no
 * los conmutadores, de los que hay **27 en 7 destinos**. Con la red cortada,
 * esa cara ensenaba doce importes y dos codigos catastrales y el arnes decia
 * «ninguna ensena una cifra». Desde #735 los visita.
 *
 * `PARADO` era ademas codigo muerto: las seis filas de «lo que no entra» las
 * lee `trabajoParado()` del backend desde que el panel se conecto.
 *
 * El fichero se queda —vacio y con este porque— en vez de borrarse: lo que
 * explica no esta en ningun otro sitio, y la siguiente maqueta que alguien
 * quiera dejar «solo mientras tanto» entra por aqui.
 */
export {};
