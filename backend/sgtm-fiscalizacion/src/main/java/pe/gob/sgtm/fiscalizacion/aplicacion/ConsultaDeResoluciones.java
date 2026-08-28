package pe.gob.sgtm.fiscalizacion.aplicacion;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.fiscalizacion.dominio.LineaDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.Liquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.LiquidacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.ResolucionDeDeterminacion;
import pe.gob.sgtm.fiscalizacion.dominio.ResolucionDeDeterminacionRepository;

/**
 * La resolucion de determinacion de fiscalizacion por su numero, con lo que la explica (#52,
 * RF-057; pantalla {@code resolucion_determinacion_fisc}).
 *
 * <p>Devuelve la resolucion <b>con la liquidacion y su detalle</b>, no la fila desnuda: el cuadro
 * que la pantalla pinta —Ejercicio, Determinado, Declarado, Diferencia— es el contraste de la
 * liquidacion, y pedirlo en dos llamadas obligaria a la pantalla a saber que la resolucion tiene
 * una liquidacion detras.
 *
 * <p>{@code @Transactional(readOnly = true)}: sin transaccion no hay {@code SET LOCAL}, y sin el la
 * politica RLS falla en vez de devolver filas. Es lo que la marcha blanca de #290 destapo con
 * {@code GET /catastro/vias}.
 */
@Service
public class ConsultaDeResoluciones {

    private final ResolucionDeDeterminacionRepository resoluciones;
    private final LiquidacionRepository liquidaciones;
    private final DirectorioDeContribuyentes contribuyentes;

    public ConsultaDeResoluciones(
            ResolucionDeDeterminacionRepository resoluciones,
            LiquidacionRepository liquidaciones,
            DirectorioDeContribuyentes contribuyentes) {
        this.resoluciones = resoluciones;
        this.liquidaciones = liquidaciones;
        this.contribuyentes = contribuyentes;
    }

    /** Una resolucion por su numero, con la liquidacion que la sustenta. */
    @Transactional(readOnly = true)
    public Optional<ResolucionConsultada> porNumero(String numero) {
        return resoluciones.porNumero(numero).map(this::componer);
    }

    /** Las transferencias de un contribuyente, de la mas reciente a la primera. */
    @Transactional(readOnly = true)
    public List<ResolucionConsultada> deContribuyente(long contribuyenteId) {
        return resoluciones.deContribuyente(contribuyenteId).stream().map(this::componer).toList();
    }

    private ResolucionConsultada componer(ResolucionDeDeterminacion resolucion) {
        Liquidacion liquidacion =
                liquidaciones
                        .findById(resolucion.liquidacionId())
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "La resolucion "
                                                        + resolucion.numero()
                                                        + " referencia una liquidacion que no"
                                                        + " existe: la foranea de V49 lo impide"));
        return new ResolucionConsultada(
                resolucion,
                liquidacion,
                liquidaciones.lineasDe(liquidacion.identificador()),
                contribuyentes
                        .porIds(java.util.Set.of(resolucion.contribuyenteId()))
                        .get(resolucion.contribuyenteId()));
    }

    /**
     * Una resolucion con todo lo que su pantalla necesita.
     *
     * @param resolucion la fila registrada
     * @param liquidacion el resultado que transfirio
     * @param lineas el contraste, una linea por ejercicio
     * @param contribuyente quien es el obligado; nulo si el padron ya no lo tiene
     */
    public record ResolucionConsultada(
            ResolucionDeDeterminacion resolucion,
            Liquidacion liquidacion,
            List<LineaDeLiquidacion> lineas,
            @Nullable ResumenDeContribuyente contribuyente) {

        public ResolucionConsultada {
            Objects.requireNonNull(resolucion, "La consulta es de una resolucion");
            Objects.requireNonNull(liquidacion, "La resolucion siempre trae su liquidacion");
            lineas = List.copyOf(lineas);
        }
    }
}
