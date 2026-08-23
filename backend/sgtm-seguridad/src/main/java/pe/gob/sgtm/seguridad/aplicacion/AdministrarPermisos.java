package pe.gob.sgtm.seguridad.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.seguridad.dominio.Acceso;
import pe.gob.sgtm.seguridad.dominio.AdministracionRepository;
import pe.gob.sgtm.seguridad.dominio.Permiso;
import pe.gob.sgtm.seguridad.dominio.PermisoRepository;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Otorgar y retirar los siete privilegios sobre un acceso, por grupo y por usuario (RF-121).
 *
 * <p>Un solo metodo para otorgar y para retirar, con el conjunto completo de privilegios: <b>lo que
 * no esta en el conjunto se retira</b>. Es como funciona la pantalla —siete casillas que se marcan
 * y se desmarcan y se guarda— y evita el defecto de un {@code otorgar}/{@code revocar} por
 * separado, donde desmarcar una casilla se traduce en no hacer nada.
 *
 * <h2>La regla del ultimo administrador</h2>
 *
 * <p>Un cambio que dejara a la municipalidad <b>sin ningun usuario capaz de administrar
 * permisos</b> se rechaza. No es una precaucion teorica: el error mas caro de esta pantalla es
 * tambien el mas facil de cometer —quitarse a uno mismo, o al grupo del que uno es el unico
 * miembro, el privilegio que hacia falta para devolverselo—, y de ahi no se sale por el sistema:
 * hace falta entrar por la base de datos.
 *
 * <p>La comprobacion se hace <b>despues</b> de escribir el cambio y dentro de la misma transaccion,
 * no antes: lo que hay que verificar no es el estado actual sino el que quedaria, y calcularlo
 * simulando el cambio en memoria seria repetir la logica del comprobador y arriesgarse a que las
 * dos versiones se separen.
 */
@Service
public class AdministrarPermisos {

    /** Id en el catalogo (NEG-03) de la pantalla que administra los permisos. */
    private static final String ACCESO_DE_ADMINISTRACION = "permisos";

    private final PermisoRepository permisos;
    private final AdministracionRepository administracion;
    private final Auditoria auditoria;
    private final Clock reloj;

    public AdministrarPermisos(
            PermisoRepository permisos,
            AdministracionRepository administracion,
            Auditoria auditoria,
            Clock reloj) {
        this.permisos = permisos;
        this.administracion = administracion;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /**
     * Los permisos ya configurados de un grupo, con el codigo de cada acceso resuelto.
     *
     * <p><b>No trae las 134 opciones del catalogo</b>: trae las que este grupo tiene configuradas,
     * que para la mayoria son unas pocas. La pantalla de la matriz combina esta lista —sparse— con
     * la pagina de {@code GET /seguridad/accesos} que ya esta conectada, y así nunca carga el
     * catalogo entero en memoria solo para dibujar una matriz.
     */
    @Transactional(readOnly = true)
    public List<PermisoDeAcceso> deGrupo(long grupoId) {
        exigirQueElGrupoExista(grupoId);
        List<PermisoDeAcceso> resultado = new ArrayList<>();
        for (Permiso permiso : permisos.todosLosDeGrupo(grupoId)) {
            resultado.add(resuelto(permiso));
        }
        return resultado;
    }

    private PermisoDeAcceso resuelto(Permiso permiso) {
        Acceso acceso =
                administracion
                        .accesoPorId(permiso.accesoId())
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "El permiso "
                                                        + permiso.id()
                                                        + " apunta al acceso "
                                                        + permiso.accesoId()
                                                        + ", que ya no existe"));
        return new PermisoDeAcceso(
                permiso.id() == null ? 0L : permiso.id(),
                acceso.codigo(),
                permiso.grupoId(),
                permiso.usuarioId(),
                permiso.privilegios());
    }

    /** Un permiso ya resuelto: el codigo de su acceso en vez del id interno. */
    public record PermisoDeAcceso(
            long id,
            String codigoDeAcceso,
            @Nullable Long grupoId,
            @Nullable Long usuarioId,
            Set<Privilegio> privilegios) {}

    /** Fija los privilegios de un <b>grupo</b> sobre un acceso. Lo no incluido se retira. */
    @Transactional
    public Permiso fijarParaGrupo(
            long grupoId,
            String codigoDeAcceso,
            Set<Privilegio> privilegios,
            Observacion observacion) {

        long accesoId = acceso(codigoDeAcceso);
        exigirQueElGrupoExista(grupoId);

        Permiso permiso =
                permisos.deGrupo(accesoId, grupoId)
                        .map(existente -> conPrivilegios(existente, privilegios))
                        .orElseGet(() -> new Permiso(null, accesoId, grupoId, null, privilegios));

        return guardarYComprobar(permiso, codigoDeAcceso, observacion);
    }

    /**
     * Fija los privilegios de un <b>usuario</b> sobre un acceso: la excepcion.
     *
     * <p>Sustituye al grupo para ese acceso, no se suma a el. Sirve tanto para ampliar como para
     * restringir, y la segunda es la que no se puede expresar de otra forma. Ver la precedencia en
     * {@code ComprobadorDeAccesoJdbc}.
     */
    @Transactional
    public Permiso fijarParaUsuario(
            long usuarioId,
            String codigoDeAcceso,
            Set<Privilegio> privilegios,
            Observacion observacion) {

        long accesoId = acceso(codigoDeAcceso);
        exigirQueElUsuarioExista(usuarioId);

        Permiso permiso =
                permisos.deUsuario(accesoId, usuarioId)
                        .map(existente -> conPrivilegios(existente, privilegios))
                        .orElseGet(() -> new Permiso(null, accesoId, null, usuarioId, privilegios));

        return guardarYComprobar(permiso, codigoDeAcceso, observacion);
    }

    // ------------------------------------------------------------------

    private Permiso guardarYComprobar(
            Permiso permiso, String codigoDeAcceso, Observacion observacion) {

        Permiso guardado = permisos.save(permiso);

        // ADR-0008 §5: quien administra la seguridad no puede alterar su propia pista.
        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                LocalDate.now(reloj),
                                "permiso",
                                String.valueOf(guardado.id()),
                                Operacion.PERMISO,
                                observacion)
                        .con(null, descripcion(guardado, codigoDeAcceso)));

        exigirQueQuedeAlgunAdministrador();
        return guardado;
    }

    private void exigirQueQuedeAlgunAdministrador() {
        if (permisos.usuariosQuePuedenAdministrarPermisos(LocalDate.now(reloj)) == 0) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.CONFLICTO,
                    "El cambio dejaria a la municipalidad sin ningun usuario capaz de administrar"
                            + " permisos, y de ahi no se sale por el sistema. Otorgue primero el"
                            + " privilegio a otro usuario o grupo");
        }
    }

    private long acceso(String codigo) {
        Acceso acceso =
                administracion
                        .accesoPorCodigo(codigo)
                        .orElseThrow(
                                () ->
                                        new ProblemaDeNegocio(
                                                CodigoDeError.NO_ENCONTRADO,
                                                "No hay ningun acceso con codigo '"
                                                        + codigo
                                                        + "'"));
        return Objects.requireNonNull(
                acceso.id(), "Un acceso leido de la base tiene identificador");
    }

    private void exigirQueElGrupoExista(long grupoId) {
        administracion
                .grupo(grupoId)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun grupo con identificador " + grupoId));
    }

    private void exigirQueElUsuarioExista(long usuarioId) {
        administracion
                .usuario(usuarioId)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun usuario con identificador " + usuarioId));
    }

    private static Permiso conPrivilegios(Permiso existente, Set<Privilegio> privilegios) {
        return new Permiso(
                existente.id(),
                existente.accesoId(),
                existente.grupoId(),
                existente.usuarioId(),
                privilegios);
    }

    private static String descripcion(Permiso permiso, String codigoDeAcceso) {
        StringBuilder json = new StringBuilder("{\"acceso\":\"").append(codigoDeAcceso).append('"');
        if (permiso.grupoId() != null) {
            json.append(",\"grupoId\":").append(permiso.grupoId());
        }
        if (permiso.usuarioId() != null) {
            json.append(",\"usuarioId\":").append(permiso.usuarioId());
        }
        json.append(",\"privilegios\":[");
        boolean primero = true;
        for (Privilegio privilegio : Privilegio.values()) {
            if (permiso.tiene(privilegio)) {
                if (!primero) {
                    json.append(',');
                }
                json.append('"').append(privilegio.name()).append('"');
                primero = false;
            }
        }
        return json.append("]}").toString();
    }

    /** El acceso que gobierna esta misma pantalla; queda nombrado para que se vea en el diff. */
    static String accesoDeAdministracion() {
        return ACCESO_DE_ADMINISTRACION;
    }
}
