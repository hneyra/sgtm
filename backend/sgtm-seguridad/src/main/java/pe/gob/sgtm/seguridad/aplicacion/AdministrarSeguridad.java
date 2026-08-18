package pe.gob.sgtm.seguridad.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.Vigencia;
import pe.gob.sgtm.seguridad.dominio.Acceso;
import pe.gob.sgtm.seguridad.dominio.AdministracionRepository;
import pe.gob.sgtm.seguridad.dominio.Grupo;
import pe.gob.sgtm.seguridad.dominio.Miembro;
import pe.gob.sgtm.seguridad.dominio.Modulo;
import pe.gob.sgtm.seguridad.dominio.Usuario;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Los casos de uso del modelo de administracion del manual (cap. 4).
 *
 * <p><b>Toda escritura deja auditoria con observacion</b> (ADR-0008 §5). Es la parte del sistema
 * donde mas importa: quien administra la seguridad es quien mas facilmente podria alterar su propia
 * pista, y la unica defensa es que cada cambio quede escrito con su porque antes de que la
 * transaccion se confirme.
 *
 * <p>Las lecturas van en el mismo servicio y marcadas {@code readOnly}: no abren transaccion de
 * escritura y por tanto no exigen observacion, que es lo que la regla 10 distingue.
 */
@Service
public class AdministrarSeguridad {

    private final AdministracionRepository repositorio;
    private final Auditoria auditoria;
    private final Clock reloj;

    public AdministrarSeguridad(
            AdministracionRepository repositorio, Auditoria auditoria, Clock reloj) {
        this.repositorio = repositorio;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    // ------------------------------------------------------------------ consultas

    @Transactional(readOnly = true)
    public Pagina<Modulo> modulos(Paginacion paginacion) {
        return repositorio.modulos(paginacion);
    }

    @Transactional(readOnly = true)
    public Pagina<Acceso> accesos(Paginacion paginacion) {
        return repositorio.accesos(paginacion);
    }

    @Transactional(readOnly = true)
    public Pagina<Grupo> grupos(Paginacion paginacion) {
        return repositorio.grupos(paginacion);
    }

    @Transactional(readOnly = true)
    public Pagina<Usuario> usuarios(Paginacion paginacion) {
        return repositorio.usuarios(paginacion);
    }

    // ------------------------------------------------------------------ grupos

    @Transactional
    public Grupo registrarGrupo(Grupo grupo, Observacion observacion) {
        Grupo guardado = repositorio.guardar(grupo);
        auditar("grupo", guardado.id(), Operacion.ALTA, observacion, descripcion(guardado));
        return guardado;
    }

    /**
     * Inhabilita un grupo.
     *
     * <p>Retira el acceso de todos sus miembros de golpe —el comprobador exige {@code
     * grupo.habilitado}— y <b>no borra ninguna relacion</b>: las filas de {@code miembro} siguen
     * ahi, diciendo quien pudo hacer que y hasta cuando. Volver a habilitarlo devuelve el acceso a
     * los mismos, que es lo que se espera de una suspension temporal.
     */
    @Transactional
    public Grupo inhabilitarGrupo(long id, Observacion observacion) {
        Grupo grupo = repositorio.grupo(id).orElseThrow(() -> noEncontrado("grupo", id));
        Grupo guardado = repositorio.guardar(grupo.inhabilitado());
        auditar("grupo", id, Operacion.BAJA, observacion, descripcion(guardado));
        return guardado;
    }

    @Transactional
    public Grupo habilitarGrupo(long id, Observacion observacion) {
        Grupo grupo = repositorio.grupo(id).orElseThrow(() -> noEncontrado("grupo", id));
        Grupo guardado = repositorio.guardar(grupo.habilitadoDeNuevo());
        auditar("grupo", id, Operacion.MODIFICACION, observacion, descripcion(guardado));
        return guardado;
    }

    @Transactional
    public Grupo fijarVigenciaDeGrupo(long id, Vigencia vigencia, Observacion observacion) {
        Grupo grupo = repositorio.grupo(id).orElseThrow(() -> noEncontrado("grupo", id));
        Grupo guardado = repositorio.guardar(grupo.con(vigencia));
        auditar("grupo", id, Operacion.MODIFICACION, observacion, descripcion(guardado));
        return guardado;
    }

    // ------------------------------------------------------------------ usuarios

    @Transactional
    public Usuario registrarUsuario(Usuario usuario, Observacion observacion) {
        Usuario guardado = repositorio.guardar(usuario);
        auditar("usuario", guardado.id(), Operacion.ALTA, observacion, descripcion(guardado));
        return guardado;
    }

    @Transactional
    public Usuario inhabilitarUsuario(long id, Observacion observacion) {
        Usuario usuario = repositorio.usuario(id).orElseThrow(() -> noEncontrado("usuario", id));
        Usuario guardado = repositorio.guardar(usuario.inhabilitado());
        auditar("usuario", id, Operacion.BAJA, observacion, descripcion(guardado));
        return guardado;
    }

    @Transactional
    public Usuario habilitarUsuario(long id, Observacion observacion) {
        Usuario usuario = repositorio.usuario(id).orElseThrow(() -> noEncontrado("usuario", id));
        Usuario guardado = repositorio.guardar(usuario.habilitadoDeNuevo());
        auditar("usuario", id, Operacion.MODIFICACION, observacion, descripcion(guardado));
        return guardado;
    }

    @Transactional
    public Usuario fijarVigenciaDeUsuario(long id, Vigencia vigencia, Observacion observacion) {
        Usuario usuario = repositorio.usuario(id).orElseThrow(() -> noEncontrado("usuario", id));
        Usuario guardado = repositorio.guardar(usuario.con(vigencia));
        auditar("usuario", id, Operacion.MODIFICACION, observacion, descripcion(guardado));
        return guardado;
    }

    // ------------------------------------------------------------------ miembros

    /** Afiliar a alguien a un grupo, o reafiliarlo: la fila anterior se reactiva. */
    @Transactional
    public Miembro afiliar(long grupoId, long usuarioId, Observacion observacion) {
        exigirQueExistan(grupoId, usuarioId);
        Miembro guardado = repositorio.guardar(Miembro.alta(grupoId, usuarioId));
        auditarMiembro(guardado, Operacion.ALTA, observacion);
        return guardado;
    }

    /** Sacar a alguien de un grupo: se da de baja, no se borra (RNF-051). */
    @Transactional
    public Miembro desafiliar(long grupoId, long usuarioId, Observacion observacion) {
        exigirQueExistan(grupoId, usuarioId);
        Miembro guardado = repositorio.guardar(new Miembro(grupoId, usuarioId, false));
        auditarMiembro(guardado, Operacion.BAJA, observacion);
        return guardado;
    }

    // ------------------------------------------------------------------

    private void exigirQueExistan(long grupoId, long usuarioId) {
        repositorio.grupo(grupoId).orElseThrow(() -> noEncontrado("grupo", grupoId));
        repositorio.usuario(usuarioId).orElseThrow(() -> noEncontrado("usuario", usuarioId));
    }

    private void auditar(
            String tabla,
            @Nullable Long clave,
            Operacion operacion,
            Observacion observacion,
            String datos) {
        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                LocalDate.now(reloj),
                                tabla,
                                String.valueOf(clave),
                                operacion,
                                observacion)
                        .con(null, datos));
    }

    private void auditarMiembro(Miembro miembro, Operacion operacion, Observacion observacion) {
        auditar(
                "miembro",
                miembro.grupoId(),
                operacion,
                observacion,
                "{\"grupoId\":"
                        + miembro.grupoId()
                        + ",\"usuarioId\":"
                        + miembro.usuarioId()
                        + ",\"activo\":"
                        + miembro.activo()
                        + "}");
    }

    /**
     * No existe, o existe en otra municipalidad. Desde aqui es lo mismo, y decir cual de las dos
     * seria filtrar la existencia de datos ajenos.
     */
    private static ProblemaDeNegocio noEncontrado(String que, long id) {
        return new ProblemaDeNegocio(
                CodigoDeError.NO_ENCONTRADO, "No hay ningun " + que + " con identificador " + id);
    }

    private static String descripcion(Grupo grupo) {
        return "{\"nombre\":\""
                + grupo.nombre()
                + "\",\"habilitado\":"
                + grupo.habilitado()
                + ",\"vigenciaDesde\":"
                + comillas(grupo.vigencia().desde())
                + ",\"vigenciaHasta\":"
                + comillas(grupo.vigencia().hasta())
                + "}";
    }

    private static String descripcion(Usuario usuario) {
        return "{\"cuenta\":\""
                + usuario.cuenta()
                + "\",\"nombre\":\""
                + usuario.nombre()
                + "\",\"habilitado\":"
                + usuario.habilitado()
                + ",\"vigenciaDesde\":"
                + comillas(usuario.vigencia().desde())
                + ",\"vigenciaHasta\":"
                + comillas(usuario.vigencia().hasta())
                + "}";
    }

    private static String comillas(@Nullable Object valor) {
        return valor == null ? "null" : "\"" + valor + "\"";
    }
}
