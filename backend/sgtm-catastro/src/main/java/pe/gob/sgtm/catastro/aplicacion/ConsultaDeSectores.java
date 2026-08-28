package pe.gob.sgtm.catastro.aplicacion;

import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.catastro.dominio.SectorConConteos;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * Lectura del catalogo de sectores: la opcion {@code sectores} del contrato.
 *
 * <p>Existe por lo mismo que {@link ConsultaDeVias}, y llega con el mismo defecto ya cometido una
 * vez: {@code SectorController} llamaba al repositorio <b>directamente</b>, y una lectura fuera de
 * transaccion no emite el {@code SET LOCAL app.municipalidad_id} que la politica RLS de {@code
 * sector} consulta. Sin el, la consulta no devuelve vacio —falla con «invalid input syntax for type
 * bigint: ""»—. En {@code GET /catastro/vias} el sintoma tardo en aparecer porque nadie con permiso
 * habia llegado nunca al endpoint; aqui pasaba exactamente igual.
 *
 * <p>El {@code @Transactional(readOnly = true)} de cada metodo es el que abre la transaccion donde
 * {@code TenantTransactionManager} fija el tenant.
 */
@Service
public class ConsultaDeSectores {

    private final CatastroRepository repositorio;

    public ConsultaDeSectores(CatastroRepository repositorio) {
        this.repositorio = repositorio;
    }

    /**
     * El catalogo con los conteos de cada sector: manzanas, predios activos y lotes (#290).
     *
     * <p>Los cuenta la base, en la misma transaccion y sobre la pagina ya limitada. Contarlos aqui
     * —pidiendo las manzanas y los predios de cada sector para llamar a {@code size()}— serian dos
     * consultas por fila y un padron entero en memoria para pintar veinte numeros.
     */
    @Transactional(readOnly = true)
    public Pagina<SectorConConteos> listar(Paginacion paginacion) {
        return repositorio.sectores(paginacion);
    }

    /**
     * El sector de un codigo, para que la edicion sepa que id esta tocando y para que el alta de
     * una manzana pueda decir «ese sector no existe» antes de intentar escribir.
     *
     * <p>Lleva su propia transaccion por lo mismo que {@link #listar}: sin ella no hay {@code SET
     * LOCAL} y la politica RLS de {@code sector} no tiene contexto de tenant.
     */
    @Transactional(readOnly = true)
    public Optional<Sector> buscarPorCodigo(String codigo) {
        return repositorio.sectorPorCodigo(codigo);
    }
}
