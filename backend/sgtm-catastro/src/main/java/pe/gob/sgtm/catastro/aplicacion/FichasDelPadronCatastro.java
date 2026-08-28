package pe.gob.sgtm.catastro.aplicacion;

import java.time.LocalDate;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import pe.gob.sgtm.catastro.BusquedaDeFichas;
import pe.gob.sgtm.catastro.FichaDelPadron;
import pe.gob.sgtm.catastro.FichasDelPadron;
import pe.gob.sgtm.catastro.dominio.FichaEncontrada;
import pe.gob.sgtm.catastro.dominio.FiltroDeFichas;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * Implementacion de {@link FichasDelPadron} (ADR-0015 §2, #344).
 *
 * <p>Es una traduccion, no una consulta nueva: delega en {@link ConsultaDeFichas#buscar}, que es
 * exactamente lo que sirve la grilla de {@code GET /api/v1/catastro/fichas}. Escribir aqui un SQL
 * propio habria dejado dos consultas que responden la misma pregunta, y el dia que una cambie —el
 * titular vigente a la fecha, el area construida sumada— la pantalla de catastro y la de la
 * conciliacion mostrarian dos padrones distintos sin que nadie sepa cual es el bueno.
 *
 * <p><b>No lleva {@code @Transactional}</b> a proposito: {@link ConsultaDeFichas#buscar} ya es
 * {@code readOnly = true} y es un bean proxiado, asi que la llamada pasa por su interceptor y el
 * {@code SET LOCAL} ocurre. Anotarlo aqui tambien no anadiria nada, y lo que hace falta es que
 * <b>exista</b> una transaccion: sin ella no hay contexto de tenant y la politica RLS falla en vez
 * de devolver filas.
 */
@Service
public class FichasDelPadronCatastro implements FichasDelPadron {

    private final ConsultaDeFichas consulta;

    public FichasDelPadronCatastro(ConsultaDeFichas consulta) {
        this.consulta = consulta;
    }

    @Override
    public Pagina<FichaDelPadron> buscar(
            BusquedaDeFichas criterio, LocalDate aLaFecha, Paginacion paginacion) {

        FiltroDeFichas filtro =
                new FiltroDeFichas(
                        criterio.codRefCatastral(),
                        criterio.contribuyente(),
                        criterio.manzana(),
                        criterio.lote(),
                        tipoDe(criterio.tipo()));

        return consulta.buscar(filtro, aLaFecha, paginacion).mapear(FichasDelPadronCatastro::fila);
    }

    /**
     * La fila publica, sin el {@code titularId}.
     *
     * <p>Es la frontera de ADR-0015 §2.4 hecha de tipos: quien reciba esta pagina no tiene el
     * identificador del contribuyente aunque quiera publicarlo.
     */
    private static FichaDelPadron fila(FichaEncontrada encontrada) {
        return new FichaDelPadron(
                encontrada.fichaId(),
                encontrada.predioId(),
                encontrada.codigo().valor(),
                encontrada.direccion(),
                encontrada.manzana(),
                encontrada.lote(),
                encontrada.tipo().name(),
                encontrada.version(),
                encontrada.areaTerreno(),
                encontrada.areaConstruida(),
                encontrada.uso(),
                encontrada.vigenciaDesde(),
                encontrada.titular());
    }

    private static @Nullable TipoFicha tipoDe(@Nullable String tipo) {
        if (tipo == null || tipo.isBlank()) {
            return null;
        }
        try {
            return TipoFicha.valueOf(tipo.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException noExiste) {
            throw new IllegalArgumentException(
                    "El tipo de ficha va entre UNICA, ECONOMICA, BIENES_COMUNES y RURAL: '"
                            + tipo
                            + "'",
                    noExiste);
        }
    }
}
