package pe.gob.sgtm.valores.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.valores.ObligacionDelValor;
import pe.gob.sgtm.valores.ValorParaCoactiva;
import pe.gob.sgtm.valores.ValoresEnCoactiva;
import pe.gob.sgtm.valores.dominio.CriterioDeConsultaDeValores;
import pe.gob.sgtm.valores.dominio.MovimientoDeValor;
import pe.gob.sgtm.valores.dominio.MovimientoDeValorRepository;
import pe.gob.sgtm.valores.dominio.TipoDeMovimiento;
import pe.gob.sgtm.valores.dominio.Valor;
import pe.gob.sgtm.valores.dominio.ValorDetalle;
import pe.gob.sgtm.valores.dominio.ValorEnConsulta;
import pe.gob.sgtm.valores.dominio.ValorRepository;

/**
 * Implementa {@link ValoresEnCoactiva} sobre las consultas que ya existen (#40, RF-100).
 *
 * <p><b>No escribe una segunda consulta de situacion.</b> Arma el mismo {@code
 * CriterioDeConsultaDeValores} que arma {@code consulta_valores} y llama al mismo {@code
 * ValorRepository#consultar}: la situacion de un valor se resuelve en un solo SQL, y la pantalla de
 * importacion no puede discrepar de la de consulta sobre si un valor es exigible.
 *
 * <p><b>Trae todas las paginas, no la primera.</b> Quien importa necesita ver todos los valores del
 * contribuyente —tambien los que va a rechazar, para poder decir por que—, y una lista recortada en
 * silencio dejaria valores fuera del expediente sin que nadie lo notara. Se recorre la paginacion
 * en lugar de fijar un tope, porque un tope es exactamente eso mismo con otro nombre.
 */
@Service
public class ValoresEnCoactivaValores implements ValoresEnCoactiva {

    /** Salvaguarda contra un bucle infinito si la consulta y su conteo discreparan. */
    private static final int PAGINAS_MAXIMAS = 100;

    private final ValorRepository repositorio;
    private final MovimientoDeValorRepository movimientos;

    public ValoresEnCoactivaValores(
            ValorRepository repositorio, MovimientoDeValorRepository movimientos) {
        this.repositorio = repositorio;
        this.movimientos = movimientos;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ValorParaCoactiva> delContribuyente(long contribuyenteId, LocalDate aLaFecha) {
        CriterioDeConsultaDeValores criterio =
                new CriterioDeConsultaDeValores(null, contribuyenteId, null, null, null, aLaFecha);

        List<ValorParaCoactiva> todos = new ArrayList<>();
        for (int pagina = 0; pagina < PAGINAS_MAXIMAS; pagina++) {
            Pagina<ValorEnConsulta> actual =
                    repositorio.consultar(
                            criterio, Paginacion.de(pagina, Paginacion.TAMANO_MAXIMO, "numero"));
            if (actual.estaVacia()) {
                break;
            }
            for (ValorEnConsulta fila : actual.contenido()) {
                todos.add(aPublico(fila));
            }
            if (todos.size() >= actual.totalElementos()) {
                break;
            }
        }
        return List.copyOf(todos);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ValorParaCoactiva> porNumero(String numero, LocalDate aLaFecha) {
        CriterioDeConsultaDeValores criterio =
                new CriterioDeConsultaDeValores(
                        numero.strip().toUpperCase(Locale.ROOT), null, null, null, null, aLaFecha);
        return repositorio.consultar(criterio, Paginacion.de(0, 1, "numero")).contenido().stream()
                .findFirst()
                .map(this::aPublico);
    }

    @Override
    @Transactional
    public void aceptarEnCoactiva(long valorId, LocalDate fecha, Observacion observacion) {
        MovimientoDeValor pase =
                movimientos
                        .paseDe(valorId)
                        .orElseThrow(
                                () ->
                                        new SinPaseACoactiva(
                                                "El valor "
                                                        + valorId
                                                        + " no tiene pase a coactiva (PCO): sin el"
                                                        + " no hay nada que aceptar, y un ACO"
                                                        + " huerfano no lo explica ninguna"
                                                        + " resolucion"));

        movimientos.registrarRespuesta(
                new MovimientoDeValor(
                        null,
                        valorId,
                        TipoDeMovimiento.ACO,
                        fecha,
                        // Copiados del pase, no resueltos otra vez: si se recalcularan, un plazo
                        // sellado despues daria otra fecha y el expediente pareceria haber nacido
                        // en otro dia (#39, V28).
                        pase.notificacionId(),
                        pase.exigibleDesde(),
                        null,
                        observacion));
    }

    // ------------------------------------------------------------------

    private ValorParaCoactiva aPublico(ValorEnConsulta fila) {
        Valor valor = fila.valor();
        Long id = valor.id();
        if (id == null) {
            throw new IllegalStateException("Un valor leido de la base siempre tiene su id");
        }
        return new ValorParaCoactiva(
                id,
                valor.tipo().codigo(),
                valor.numero(),
                valor.ejercicio(),
                valor.fechaEmision(),
                valor.contribuyenteId(),
                fila.situacion().name(),
                fila.situacionA(),
                fila.exigibleDesde(),
                fila.enCoactiva(),
                valor.total(),
                valor.proyectadoA(),
                obligacionesDe(id));
    }

    /**
     * Las obligaciones que el valor formaliza, sin sus importes congelados.
     *
     * <p>Una consulta por valor. Es aceptable aqui y no lo seria en la grilla de {@code
     * consulta_valores}: aquella pinta cualquier numero de contribuyentes, y esto se pide de los
     * valores de <b>uno</b>, que nunca son muchos.
     */
    private List<ObligacionDelValor> obligacionesDe(long valorId) {
        List<ObligacionDelValor> obligaciones = new ArrayList<>();
        for (ValorDetalle detalle : repositorio.detalleDe(valorId)) {
            obligaciones.add(
                    new ObligacionDelValor(
                            detalle.tributo(),
                            detalle.ejercicio(),
                            detalle.predioId(),
                            detalle.vehiculoId()));
        }
        return obligaciones;
    }
}
