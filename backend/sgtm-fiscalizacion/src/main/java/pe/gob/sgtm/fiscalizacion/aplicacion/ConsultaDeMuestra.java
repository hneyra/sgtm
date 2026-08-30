package pe.gob.sgtm.fiscalizacion.aplicacion;

import java.util.HashSet;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.MuestraDelPrograma;
import pe.gob.sgtm.fiscalizacion.dominio.MuestraDelProgramaRepository;

/**
 * La muestra sorteada de un programa, para la grilla de {@code fisc_programa} y para que {@code
 * fisc_predial} resuelva su fila (#481).
 *
 * <p>El {@code @Transactional} no es decorativo: sin él no hay {@code SET LOCAL} y la política RLS
 * no deja leer ni una fila. Es el defecto que {@code ConsultaDeVias} cerró y que #53 volvió a
 * encontrar.
 */
@Service
public class ConsultaDeMuestra {

    private final MuestraDelProgramaRepository muestras;
    private final ActaFiscalizacionRepository actas;

    public ConsultaDeMuestra(
            MuestraDelProgramaRepository muestras, ActaFiscalizacionRepository actas) {
        this.muestras = muestras;
        this.actas = actas;
    }

    /**
     * Una página de la muestra, con el dato derivado que la fila no guarda.
     *
     * @param predioId acota a un predio; es como {@code fisc_predial} pide la suya
     */
    @Transactional(readOnly = true)
    public Resultado buscar(long programaId, @Nullable Long predioId, Paginacion paginacion) {
        Pagina<MuestraDelPrograma> pagina = muestras.delPrograma(programaId, predioId, paginacion);

        Set<Long> predios = new HashSet<>();
        for (MuestraDelPrograma fila : pagina.contenido()) {
            predios.add(fila.predioId());
        }

        return new Resultado(pagina, actas.prediosConActaEnElPrograma(programaId, predios));
    }

    /**
     * La página y <b>cuáles de sus predios ya se visitaron</b>, que es de donde sale la columna
     * «Estado» de la grilla.
     *
     * <p>No es una columna de la fila a propósito: guardarla dejaría dos verdades sobre lo mismo, y
     * la que se lee en pantalla sería la que nadie recalculó ({@code V60} §2).
     */
    public record Resultado(Pagina<MuestraDelPrograma> pagina, Set<Long> prediosConActa) {

        public boolean visitado(MuestraDelPrograma fila) {
            return prediosConActa.contains(fila.predioId());
        }
    }
}
