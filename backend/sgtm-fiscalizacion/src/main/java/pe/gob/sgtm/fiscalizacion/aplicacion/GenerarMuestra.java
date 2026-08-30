package pe.gob.sgtm.fiscalizacion.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.FilaDeOmisos;
import pe.gob.sgtm.fiscalizacion.dominio.MuestraDelPrograma;
import pe.gob.sgtm.fiscalizacion.dominio.MuestraDelProgramaRepository;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacionRepository;

/**
 * Sortea la muestra de un programa: los predios que se van a inspeccionar (#481, RF-050).
 *
 * <p><b>No hay ninguna detección nueva aquí.</b> Las filas salen de {@link DeteccionDeOmisos}, que
 * es la única fuente de la condición en el sistema y la misma que dibuja {@code fisc_omisos}.
 * Resolverla otra vez con un criterio propio dejaría dos verdades sobre el mismo predio, y la que
 * se lee en pantalla sería la que nadie recalculó — el defecto que #397 se negó a introducir.
 *
 * <p><b>Se guarda, y no se recalcula.</b> El motivo es la exclusión: una muestra no vuelve a
 * sortear un predio que otro programa abierto ya se llevó, ni uno que ya se fiscalizó este
 * ejercicio, y para saberlo hay que tenerlos escritos. De paso contesta «¿por qué me tocó a mí?»
 * con la fila del día del sorteo, sin necesidad de una semilla reproducible.
 *
 * <p><b>Y depende del orden, que es lo pedido y hay que decirlo:</b> el primer programa que se
 * genere se lleva los predios, y el segundo sale más corto.
 */
@Service
public class GenerarMuestra {

    private static final String TABLA_AUDITADA = "programa_muestra";

    /** Cuántas filas del padrón se piden a la detección por vuelta. */
    private static final int TAMANO_DE_PAGINA = 200;

    private final ProgramaFiscalizacionRepository programas;
    private final MuestraDelProgramaRepository muestras;
    private final ActaFiscalizacionRepository actas;
    private final DeteccionDeOmisos deteccion;
    private final Auditoria auditoria;
    private final Clock reloj;

    public GenerarMuestra(
            ProgramaFiscalizacionRepository programas,
            MuestraDelProgramaRepository muestras,
            ActaFiscalizacionRepository actas,
            DeteccionDeOmisos deteccion,
            Auditoria auditoria,
            Clock reloj) {
        this.programas = programas;
        this.muestras = muestras;
        this.actas = actas;
        this.deteccion = deteccion;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /** El programa no existe, o es de otra municipalidad —lo segundo lo decide RLS—. */
    public static final class ProgramaInexistente extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        ProgramaInexistente(long id) {
            super("No existe el programa de fiscalizacion " + id);
        }
    }

    /**
     * El programa no lleva uno de los parámetros con los que se sortea. Nombra cuál: es lo único
     * honesto que se puede hacer con un programa registrado antes de {@code V60}.
     */
    public static final class ProgramaSinParametros extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        ProgramaSinParametros(String parametro) {
            super(
                    "El programa no declara '"
                            + parametro
                            + "', y sin el no se puede sortear su muestra");
        }
    }

    /** Ya se sorteó. Una muestra es un acto y no se regenera: para otra muestra, otro programa. */
    public static final class MuestraYaSorteada extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        MuestraYaSorteada(long programaId) {
            super(
                    "El programa "
                            + programaId
                            + " ya sorteo su muestra, y una muestra no se vuelve a sortear");
        }
    }

    /**
     * @return cuántos predios entraron a la muestra
     */
    @Transactional
    public int generar(long programaId, Observacion observacion) {
        ProgramaFiscalizacion programa =
                programas
                        .findById(programaId)
                        .orElseThrow(() -> new ProgramaInexistente(programaId));

        programa.parametrosDeLaMuestra()
                .ifPresent(
                        falta -> {
                            throw new ProgramaSinParametros(falta);
                        });

        if (muestras.tieneMuestra(programaId)) {
            throw new MuestraYaSorteada(programaId);
        }

        Ejercicio ejercicio = java.util.Objects.requireNonNull(programa.ejercicio());
        LocalDate fechaSorteo = LocalDate.now(reloj);
        List<MuestraDelPrograma> sorteadas = new ArrayList<>();

        // El padron se recorre por paginas y no de una vez: `Paginacion` tope a 500 filas por
        // peticion a proposito, y un distrito son decenas de miles de predios.
        int pagina = 0;
        long total;
        do {
            Pagina<FilaDeOmisos> encontradas =
                    deteccion.detectar(
                            ejercicio,
                            programa.sectorCodigo(),
                            programa.criterio(),
                            fechaSorteo,
                            new Paginacion(
                                    pagina,
                                    TAMANO_DE_PAGINA,
                                    "predio_id",
                                    Paginacion.Direccion.ASCENDENTE));

            sorteadas.addAll(
                    admisibles(encontradas.contenido(), programaId, ejercicio, fechaSorteo));
            total = encontradas.totalElementos();
            pagina++;
        } while ((long) pagina * TAMANO_DE_PAGINA < total);

        if (!sorteadas.isEmpty()) {
            muestras.insertar(sorteadas, observacion, reloj.instant());
        }

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                fechaSorteo,
                                TABLA_AUDITADA,
                                String.valueOf(programaId),
                                Operacion.ALTA,
                                observacion)
                        .con(null, descripcion(programa, sorteadas.size(), fechaSorteo)));

        return sorteadas.size();
    }

    // ------------------------------------------------------------------

    /**
     * Las dos exclusiones de #481, resueltas por página y no fila a fila: un predio no entra si
     * otro programa que admite visitas ya se lo llevó, ni si ya tiene acta dentro del ejercicio.
     */
    private List<MuestraDelPrograma> admisibles(
            List<FilaDeOmisos> filas, long programaId, Ejercicio ejercicio, LocalDate fechaSorteo) {

        Set<Long> predios = new HashSet<>();
        for (FilaDeOmisos fila : filas) {
            predios.add(fila.predioId());
        }

        Set<Long> yaProgramados = muestras.prediosEnProgramasAbiertos(programaId, predios);
        Set<Long> yaFiscalizados = actas.prediosConActaEnElEjercicio(ejercicio, predios);

        List<MuestraDelPrograma> admitidas = new ArrayList<>();
        for (FilaDeOmisos fila : filas) {
            if (yaProgramados.contains(fila.predioId())
                    || yaFiscalizados.contains(fila.predioId())) {
                continue;
            }
            admitidas.add(MuestraDelPrograma.sorteada(programaId, fila, fechaSorteo));
        }
        return admitidas;
    }

    private static String descripcion(
            ProgramaFiscalizacion programa, int cuantos, LocalDate fechaSorteo) {
        return "{\"programa\":\""
                + programa.codigo()
                + "\",\"criterio\":\""
                + programa.criterio()
                + "\",\"predios\":"
                + cuantos
                + ",\"fechaSorteo\":\""
                + fechaSorteo
                + "\"}";
    }
}
