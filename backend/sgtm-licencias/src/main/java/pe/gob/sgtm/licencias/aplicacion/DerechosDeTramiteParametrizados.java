package pe.gob.sgtm.licencias.aplicacion;

import java.time.LocalDate;
import java.util.Locale;
import org.springframework.stereotype.Service;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;

/**
 * De donde sale <b>que concepto del TUPA</b> es el derecho de tramite de una licencia: del conjunto
 * sellado que rige a la fecha del tramite (#44, RF-110).
 *
 * <h2>Lo que se parametriza aqui es el concepto, no su importe</h2>
 *
 * <p>Y la distincion importa, porque la tentacion es la contraria. El <b>importe</b> del derecho ya
 * es dato versionado desde V3: vive en la tabla {@code tasa}, con su {@code documento_fuente} —la
 * ordenanza que lo fijo— y su {@code vigencia_desde}, y es de ahi de donde {@code CobrarTasa} lo
 * saca al cobrarlo (regla 5, ADR-0007). Copiarlo tambien al conjunto sellado dejaria <b>dos</b>
 * sitios donde vive la misma tarifa, y el dia que difieran la caja cobraria una cifra y la licencia
 * comprobaria otra.
 *
 * <p>Lo que si falta —y no puede ir compilado— es <b>cual</b> de los conceptos del TUPA cuenta como
 * el derecho de tramite de una licencia de funcionamiento. Cada municipalidad numera su TUPA como
 * quiere: un {@code "LF-001"} escrito en el codigo obligaria a recompilar para cada instalacion, y
 * peor, la primera que no lo tuviera veria pasar como valido cualquier recibo de tasas.
 *
 * <p>Mismo mecanismo que {@code PlazosParametrizados} (#39) y {@code CondicionesParametrizadas}
 * (#35): el conjunto sellado vigente a la fecha, sin valor por omision, y un error que dice <b>que
 * llave falta</b>.
 *
 * <h2>Tampoco hay valor por omision, y aqui la consecuencia es concreta</h2>
 *
 * <p>Si el concepto faltara y se sustituyera por «cualquier concepto», bastaria un recibo de
 * fotocopias para emitir una licencia. Si se sustituyera por «ninguno», no se podria emitir
 * ninguna. Falta el parametro, falla la operacion, y el mensaje dice cual falta.
 *
 * <h2>«Vigente a la fecha del tramite», no vigente hoy</h2>
 *
 * <p>El conjunto se resuelve por el ejercicio de la fecha de emision. Sin eso, revisar dentro de
 * dos anios por que se admitio el recibo que se admitio resolveria «el vigente» y podria dar otro
 * concepto, sin avisar (ARQ-09 §3).
 */
@Service
public class DerechosDeTramiteParametrizados {

    /**
     * El {@code tipo} de {@code parametro_tributario} bajo el que viven los conceptos del TUPA.
     *
     * <p>Es el <b>nombre</b> del parametro, no su valor: no hay ninguna cifra en esta constante.
     */
    private static final String TIPO_TUPA = "TUPA";

    /** El concepto que cobra el derecho de tramite de una licencia de funcionamiento nueva. */
    private static final String CLAVE_LICENCIA = "DERECHO_LICENCIA_FUNCIONAMIENTO";

    /** El que cobra el derecho de un duplicado de licencia. */
    private static final String CLAVE_DUPLICADO = "DERECHO_DUPLICADO_LICENCIA";

    private final LectorDeParametros parametros;

    public DerechosDeTramiteParametrizados(LectorDeParametros parametros) {
        this.parametros = parametros;
    }

    /** Los derechos que rigen a esa fecha, resueltos del <b>mismo</b> conjunto. */
    public Vigentes aLaFechaDe(LocalDate fechaDelTramite) {
        Ejercicio ejercicio = Ejercicio.de(fechaDelTramite);
        return new Vigentes(ejercicio, parametros.vigenteEn(ejercicio));
    }

    /**
     * Los conceptos de un ejercicio, ya resueltos.
     *
     * <p>Se entrega como objeto y no como llamadas sueltas para que las dos lecturas salgan del
     * mismo conjunto: resolverlas por separado abriria la puerta a que un sellado ocurrido entre
     * las dos dejara una operacion comprobada con dos versiones distintas.
     */
    public static final class Vigentes {

        private final Ejercicio ejercicio;
        private final ParametrosSellados sellados;

        private Vigentes(Ejercicio ejercicio, ParametrosSellados sellados) {
            this.ejercicio = ejercicio;
            this.sellados = sellados;
        }

        /** El codigo del concepto del TUPA que cobra el derecho de una licencia nueva. */
        public String paraLaLicencia() {
            return codigo(CLAVE_LICENCIA);
        }

        /** El codigo del concepto que cobra el derecho de un duplicado. */
        public String paraElDuplicado() {
            return codigo(CLAVE_DUPLICADO);
        }

        private String codigo(String clave) {
            String texto =
                    sellados.texto(TIPO_TUPA, clave)
                            .orElseThrow(() -> new DerechoSinParametrizar(ejercicio, clave))
                            .strip()
                            .toUpperCase(Locale.ROOT);
            if (texto.isEmpty()) {
                throw new DerechoSinParametrizar(ejercicio, clave);
            }
            return texto;
        }
    }

    /**
     * Falta el concepto del TUPA que la operacion necesita.
     *
     * <p>Que falle aqui, nombrando la llave, es preferible a que la operacion siga con un concepto
     * inventado: con «cualquier concepto» bastaria un recibo de fotocopias para emitir una
     * licencia.
     */
    public static final class DerechoSinParametrizar extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        private final String llave;

        DerechoSinParametrizar(Ejercicio ejercicio, String clave) {
            super(
                    String.format(
                            Locale.ROOT,
                            "El conjunto sellado del ejercicio %s no tiene el parametro %s:%s. Sin"
                                    + " el no se sabe que concepto del TUPA cobra el derecho de"
                                    + " tramite, y admitir cualquiera dejaria emitir una licencia con"
                                    + " el recibo de otra cosa (regla 5, RF-110)",
                            ejercicio,
                            TIPO_TUPA,
                            clave));
            this.llave = TIPO_TUPA + ":" + clave;
        }

        /** La llave que falta, {@code tipo:clave}, legible por programa. */
        public String llave() {
            return llave;
        }
    }
}
