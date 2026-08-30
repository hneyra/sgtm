package pe.gob.sgtm.catastro.aplicacion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.FiltroDePredios;
import pe.gob.sgtm.catastro.dominio.PredioDelCatastro;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * El listado de predios del catastro, con sus filtros.
 *
 * <p><b>Existe por la frontera transaccional, no por la logica</b>: el metodo no hace mas que
 * delegar, y lo que aporta es el {@code @Transactional(readOnly = true)} donde se fija el tenant.
 * Sin el, la consulta corre sin el {@code SET LOCAL app.municipalidad_id} que la politica RLS exige
 * y falla con «invalid input syntax for type bigint: ""». Es el mismo motivo por el que existe
 * {@link ConsultaDeVias}, que se descubrio cuando alguien con permiso llego por primera vez a
 * {@code GET /catastro/vias} y no antes.
 *
 * <p>No recibe el identificador de municipalidad (regla 2).
 */
@Service
public class ConsultaDePredios {

    private final CatastroRepository catastro;

    public ConsultaDePredios(CatastroRepository catastro) {
        this.catastro = catastro;
    }

    @Transactional(readOnly = true)
    public Pagina<PredioDelCatastro> buscar(FiltroDePredios filtro, Paginacion paginacion) {
        return catastro.predios(filtro, paginacion);
    }
}
