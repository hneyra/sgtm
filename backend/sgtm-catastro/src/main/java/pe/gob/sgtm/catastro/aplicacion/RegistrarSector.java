package pe.gob.sgtm.catastro.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.dominio.Observacion;

/**
 * Da de alta un sector del catastro.
 *
 * <p>Copia tal cual el patron de {@link RegistrarVia}: la {@link Observacion} en la firma, la
 * auditoria en la misma transaccion, y el reloj inyectado. No existia hasta ahora porque {@code
 * SectorController} solo publicaba lectura (#16); la carga inicial de catalogos territoriales
 * (#121) es su primer llamador, uno por fila del archivo importado.
 */
@Service
public class RegistrarSector {

    private final CatastroRepository repositorio;
    private final Auditoria auditoria;
    private final Clock reloj;

    public RegistrarSector(CatastroRepository repositorio, Auditoria auditoria, Clock reloj) {
        this.repositorio = repositorio;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    @Transactional
    public Sector registrar(Sector sector, Observacion observacion) {
        Sector guardado = repositorio.guardar(sector);

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                LocalDate.now(reloj),
                                "sector",
                                String.valueOf(guardado.id()),
                                sector.esNuevo() ? Operacion.ALTA : Operacion.MODIFICACION,
                                observacion)
                        .con(null, descripcion(guardado)));

        return guardado;
    }

    private static String descripcion(Sector sector) {
        return "{\"codigo\":\""
                + sector.codigo()
                + "\",\"nombre\":\""
                + sector.nombre().replace("\"", "\\\"")
                + "\",\"activo\":"
                + sector.activo()
                + "}";
    }
}
