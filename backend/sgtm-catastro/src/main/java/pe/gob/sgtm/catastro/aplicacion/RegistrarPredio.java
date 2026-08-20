package pe.gob.sgtm.catastro.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.Titularidad;
import pe.gob.sgtm.dominio.Observacion;

/**
 * Alta del predio y de su titularidad.
 *
 * <p>Lo que hace falta entender de esta clase es <b>{@link #transferir}</b>: cierra una titularidad
 * y abre otra <b>en la misma transaccion</b>. Entre las dos operaciones el total vigente del predio
 * queda momentaneamente por encima de 100 —el vendedor todavia figura y el comprador ya figura—, y
 * eso es correcto: la comprobacion de la base es un <b>disparador diferido</b> que se evalua al
 * cerrar la transaccion, no fila a fila.
 *
 * <p>Si el disparador fuera inmediato, una transferencia legitima seria imposible sin dejar el
 * predio sin titular en el intermedio.
 */
@Service
public class RegistrarPredio {

    private final CatastroRepository repositorio;
    private final Auditoria auditoria;
    private final Clock reloj;

    public RegistrarPredio(CatastroRepository repositorio, Auditoria auditoria, Clock reloj) {
        this.repositorio = repositorio;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    @Transactional
    public Predio registrar(Predio predio, Observacion observacion) {
        Predio guardado = repositorio.guardar(predio);
        auditar(
                "predio",
                guardado.id(),
                predio.esNuevo() ? Operacion.ALTA : Operacion.MODIFICACION,
                observacion,
                null,
                descripcion(guardado));
        return guardado;
    }

    /** Se da de baja, nunca se borra: aparece en determinaciones ya emitidas. */
    @Transactional
    public Predio darDeBaja(Predio predio, Observacion observacion) {
        Predio baja = repositorio.guardar(predio.dadoDeBaja());
        auditar(
                "predio",
                baja.id(),
                Operacion.BAJA,
                observacion,
                descripcion(predio),
                descripcion(baja));
        return baja;
    }

    @Transactional
    public Titularidad registrarTitularidad(Titularidad titularidad, Observacion observacion) {
        Titularidad guardada = repositorio.guardar(titularidad);
        auditar(
                "titularidad",
                guardada.id(),
                Operacion.ALTA,
                observacion,
                null,
                descripcion(guardada));
        return guardada;
    }

    /**
     * Transfiere la parte de un titular a otro: cierra la titularidad del que sale y abre la del
     * que entra, en la misma transaccion.
     *
     * <p>La anterior se cierra el dia antes de que empiece la nueva, para que ninguna fecha tenga
     * dos titulares por la misma parte.
     */
    @Transactional
    public Titularidad transferir(
            Titularidad anterior, Titularidad nueva, Observacion observacion) {
        if (!nueva.esNueva()) {
            throw new IllegalArgumentException(
                    "Transferir abre una titularidad nueva; la que llega ya tiene identificador");
        }
        if (anterior.predioId() != nueva.predioId()) {
            throw new IllegalArgumentException(
                    "Una transferencia es sobre el mismo predio; llegaron el "
                            + anterior.predioId()
                            + " y el "
                            + nueva.predioId());
        }

        Titularidad cerrada =
                repositorio.guardar(anterior.cerradaEl(nueva.vigenciaDesde().minusDays(1)));
        auditar(
                "titularidad",
                cerrada.id(),
                Operacion.BAJA,
                observacion,
                descripcion(anterior),
                descripcion(cerrada));

        Titularidad abierta = repositorio.guardar(nueva);
        auditar(
                "titularidad",
                abierta.id(),
                Operacion.ALTA,
                observacion,
                null,
                descripcion(abierta));

        return abierta;
    }

    private void auditar(
            String tabla,
            @org.jspecify.annotations.Nullable Long clave,
            Operacion operacion,
            Observacion observacion,
            @org.jspecify.annotations.Nullable String antes,
            String despues) {
        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                LocalDate.now(reloj),
                                tabla,
                                String.valueOf(clave),
                                operacion,
                                observacion)
                        .con(antes, despues));
    }

    private static String descripcion(Predio predio) {
        return "{\"codigo\":\""
                + predio.codigo()
                + "\",\"tipo\":\""
                + predio.tipo()
                + "\",\"direccion\":\""
                + predio.direccion().replace("\"", "\\\"")
                + "\",\"estado\":\""
                + predio.estado()
                + "\"}";
    }

    private static String descripcion(Titularidad titularidad) {
        return "{\"contribuyenteId\":"
                + titularidad.contribuyenteId()
                + ",\"condicion\":\""
                + titularidad.condicion()
                + "\",\"porcentaje\":\""
                + titularidad.porcentaje()
                + "\",\"vigenciaHasta\":"
                + (titularidad.vigenciaHasta() == null
                        ? "null"
                        : "\"" + titularidad.vigenciaHasta() + "\"")
                + "}";
    }
}
