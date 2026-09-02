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
 *
 * <h2>Las ocho escrituras que ningun endpoint publica, censadas (#543)</h2>
 *
 * <p>{@link #registrarGrupo}, {@link #inhabilitarGrupo}, {@link #habilitarGrupo}, {@link
 * #fijarVigenciaDeGrupo}, {@link #registrarUsuario}, {@link #inhabilitarUsuario}, {@link
 * #habilitarUsuario} y {@link #fijarVigenciaDeUsuario} <b>solo las llaman las pruebas y {@code
 * ImplantarMunicipalidad}</b>: no hay ninguna ruta en el contrato que llegue a ellas. Quedan
 * nombradas aqui para que deje de ser un hallazgo cada vez que alguien mira, y porque el motivo no
 * es el mismo para las dos mitades:
 *
 * <ul>
 *   <li><b>Las cuatro de grupo</b> no tienen mas obstaculo que no habersele escrito su controlador:
 *       un grupo es una fila de esta base y de ninguna otra.
 *   <li><b>Las cuatro de usuario</b> si lo tienen, y es de diseño: un usuario son <b>dos
 *       mitades</b> —la fila de {@code usuario} y la cuenta del proveedor de identidad (ADR-0005,
 *       ADR-0012)—, y hoy la segunda se administra <b>declarativamente</b>, con un archivo por
 *       municipalidad en {@code despliegue/identidad/} que reconcilia un guion. Publicar {@code
 *       POST /seguridad/usuarios} exige decidir antes como se coordinan las dos —quien crea la
 *       cuenta, que pasa si una de las dos falla, y que hace la reconciliacion con lo creado por
 *       pantalla—, y eso es una decision que este issue no toma. Tiene issue propio: <b>#572</b>.
 * </ul>
 *
 * <p>{@code AdministrarPermisos.fijarParaUsuario} <b>ya no</b>: estuvo en la misma situacion por un
 * motivo propio —es la excepcion de usuario, y escribirla sin poder <b>leerla</b> antes era
 * administrar a ciegas—, y ese motivo se agoto cuando #543 publico la lectura. La escritura es
 * {@code PUT /seguridad/usuarios/&#123;id&#125;/permisos} desde #585.
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

    /**
     * A que grupos pertenece un usuario (#543).
     *
     * <p>Sin esto no hay «heredado» que calcular: la matriz de permisos efectivos distingue lo
     * propio de lo que viene del grupo, y quien la dibuja necesita saber a cuales pertenece.
     *
     * <p>Un usuario que no existe en esta municipalidad es <b>404</b>, no una pagina vacia. No
     * pertenecer a ningun grupo y no existir son dos respuestas distintas y la segunda no se puede
     * decir callando: una pagina vacia se leeria como «no tiene grupos», que es exactamente lo
     * contrario de lo que hay que decirle a quien administra.
     */
    @Transactional(readOnly = true)
    public Pagina<Grupo> gruposDeUsuario(long usuarioId, Paginacion paginacion) {
        repositorio.usuario(usuarioId).orElseThrow(() -> noEncontrado("usuario", usuarioId));
        return repositorio.gruposDeUsuario(usuarioId, paginacion);
    }

    /**
     * Quien esta en un grupo (#582).
     *
     * <p>La pregunta inversa de {@link #gruposDeUsuario}, y hasta ahora no se podia hacer:
     * derivarla obligaba a recorrer el padron de cuentas preguntando por cada una.
     *
     * <p>Un grupo que no existe <b>en esta municipalidad</b> es <b>404</b>, no una pagina vacia. No
     * tener miembros y no existir son dos respuestas distintas, y la segunda no se puede decir
     * callando: cero filas se leeria como «este grupo no lo tiene nadie», que es lo contrario de lo
     * que hay que contestarle a quien administra. Es la misma decision que {@code Optional.empty()}
     * frente a la pagina vacia en el listado de manzanas (#537).
     */
    @Transactional(readOnly = true)
    public Pagina<Usuario> usuariosDeGrupo(long grupoId, Paginacion paginacion) {
        repositorio.grupo(grupoId).orElseThrow(() -> noEncontrado("grupo", grupoId));
        return repositorio.usuariosDeGrupo(grupoId, paginacion);
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
