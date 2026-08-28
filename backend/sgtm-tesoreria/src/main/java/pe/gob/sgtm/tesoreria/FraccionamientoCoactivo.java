package pe.gob.sgtm.tesoreria;

import pe.gob.sgtm.dominio.Observacion;

/**
 * Suscribe un convenio de fraccionamiento <b>coactivo</b>, publicado para {@code coactiva} (ARQ-01
 * §4, #42, RF-105).
 *
 * <p>Es la segunda API publica de {@code tesoreria}, tras {@link ConveniosDelContribuyente}, y vive
 * en el paquete raiz por el mismo motivo: Spring Modulith trata como interno todo lo que esta en un
 * subpaquete, asi que {@code coactiva} no puede ver {@code
 * tesoreria.aplicacion.RegistrarPreconvenio} ni {@code tesoreria.dominio.Convenio}. Esto es
 * exactamente lo que puede ver.
 *
 * <h2>El mecanismo es el de #35, entero</h2>
 *
 * <p>Este puerto <b>no</b> reimplementa nada: delega en el mismo {@code RegistrarPreconvenio} que
 * usa la ventanilla, con {@code TipoDeConvenio.COACTIVO}. Lo que eso arrastra, y es justamente lo
 * que se queria arrastrar:
 *
 * <ul>
 *   <li>La deuda acogible la resuelve {@code AcogimientoAConvenio} releyendo el libro, cuota por
 *       cuota y <b>con su fase de origen</b>. Ninguna cifra viaja en la peticion.
 *   <li>El interes y el maximo de cuotas salen del conjunto sellado ({@code
 *       CondicionesParametrizadas}), y el convenio guarda de cual (ARQ-09 §3, regla 5).
 *   <li>Lo que sale de aqui es siempre un <b>preconvenio</b>: sin cuota inicial cobrada en caja no
 *       hay convenio. El convenio coactivo se formaliza por la misma caja que el ordinario.
 *   <li>Y el quiebre devuelve la deuda a la fase que {@code convenio_deuda.fase_origen} guardo. Una
 *       cuota que venia de coactiva vuelve a <b>coactiva</b>, no a ordinaria: el expediente sigue
 *       vivo. Eso ya lo hacia el mecanismo de #35 sin saber nada de expedientes, y #42 lo verifica
 *       asiento por asiento en vez de suponerlo.
 * </ul>
 *
 * <p><b>La unica diferencia con el convenio ordinario es el tipo</b>, que es constancia
 * administrativa de bajo que procedimiento se firmo. Lo que de verdad distingue a un
 * fraccionamiento coactivo —a donde vuelve su deuda si se incumple— no lo decide ese campo sino la
 * fase de origen, cuota por cuota. Un convenio marcado ORDINARIO sobre deuda coactiva devolveria
 * igual a coactiva.
 *
 * <h2>Lo que NO se publica aqui</h2>
 *
 * <p>Ni formalizar, ni quebrar, ni anular. Son actos con su recibo, su acta y su observacion, viven
 * en {@code FormalizarConvenio} y {@code CerrarConvenio} y ya tienen su ruta en {@code
 * ConvenioController}. Publicarlos aqui seria un segundo camino al convenio sin nada de eso, y en
 * particular permitiria quebrar un convenio desde coactiva sin pasar por la comprobacion del recibo
 * de la inicial.
 */
public interface FraccionamientoCoactivo {

    /**
     * El cronograma que saldria, <b>sin registrar nada</b>.
     *
     * <p>Ni numera un convenio, ni toca el libro, ni deja auditoria. Es lo que permite que {@code
     * coactiva} compruebe de que fase viene cada cuota <b>antes</b> de firmar.
     *
     * @throws SinDeudaCoactivaQueFraccionar si la seleccion no tiene deuda a la fecha de corte
     */
    ConvenioCoactivo simular(SolicitudDeConvenioCoactivo solicitud);

    /**
     * Registra el preconvenio coactivo con su numero, su deuda congelada y su cronograma.
     *
     * @param observacion por que se registra (regla 10, RNF-052)
     * @throws SinDeudaCoactivaQueFraccionar si la seleccion no tiene deuda a la fecha de corte
     */
    ConvenioCoactivo registrar(SolicitudDeConvenioCoactivo solicitud, Observacion observacion);

    /**
     * La seleccion no tiene deuda a esa fecha.
     *
     * <p>Se traduce en la frontera del modulo —{@code RegistrarPreconvenio.SinDeudaQueFraccionar}
     * vive en un subpaquete y no cruza— para que {@code coactiva} pueda distinguir este caso sin
     * mirar el texto de un mensaje.
     */
    final class SinDeudaCoactivaQueFraccionar extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        public SinDeudaCoactivaQueFraccionar(String mensaje, Throwable causa) {
            super(mensaje, causa);
        }
    }
}
