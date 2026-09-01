package pe.gob.sgtm.seguridad.infraestructura.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarSeguridad;
import pe.gob.sgtm.seguridad.dominio.Miembro;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Los cinco endpoints de administracion del manual (RF-120), tal como los declara el contrato.
 *
 * <p>Van en un solo controlador porque son las cinco pantallas de un mismo modulo del menu y
 * comparten el caso de uso; cinco clases de un metodo no aclararian nada.
 *
 * <p><b>Cada operacion declara su acceso por separado</b> y no la clase entera: son cinco opciones
 * distintas del catalogo, con permisos distintos. Quien administra usuarios no tiene por que poder
 * ver los modulos del sistema.
 */
@RestController
@RequestMapping(Api.RAIZ + "/seguridad")
public class SeguridadController {

    private final AdministrarSeguridad administrar;

    public SeguridadController(AdministrarSeguridad administrar) {
        this.administrar = administrar;
    }

    @GetMapping("/modulos")
    @RequiereAcceso(acceso = "modulos", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<Recursos.ModuloResource> modulos(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                administrar.modulos(paginacion.aPaginacion("orden")), Recursos.ModuloResource::de);
    }

    @GetMapping("/accesos")
    @RequiereAcceso(acceso = "accesos", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<Recursos.AccesoResource> accesos(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                administrar.accesos(paginacion.aPaginacion("codigo")), Recursos.AccesoResource::de);
    }

    @GetMapping("/grupos")
    @RequiereAcceso(acceso = "grupos", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<Recursos.GrupoResource> grupos(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                administrar.grupos(paginacion.aPaginacion("nombre")), Recursos.GrupoResource::de);
    }

    @GetMapping("/usuarios")
    @RequiereAcceso(acceso = "usuarios", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<Recursos.UsuarioResource> usuarios(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                administrar.usuarios(paginacion.aPaginacion("cuenta")),
                Recursos.UsuarioResource::de);
    }

    /**
     * A que grupos pertenece un usuario: {@code GET /seguridad/usuarios/{id}/grupos} (#543).
     *
     * <p>Sin esta lectura la matriz de permisos de un usuario no puede decir de donde le viene lo
     * heredado, porque no se sabe de quien hereda. {@code /grupos/{grupo}/miembros} solo tenia el
     * {@code POST} que afilia y desafilia, y el dominio solo sabia contestar por la pareja concreta
     * —{@code miembro(grupoId, usuarioId)}—.
     *
     * <p><b>Su acceso es {@code usuarios} y no {@code miembros}</b>: es una lectura sobre un
     * usuario, y la propia grilla de «Usuarios del sistema» del manual dibuja una columna «Grupo».
     * Quien puede ver el padron de usuarios puede ver a que grupos pertenece cada uno; afiliarlo y
     * desafiliarlo sigue exigiendo {@code miembros} con {@code REGISTRO}.
     *
     * <p>La anotacion va <b>en el metodo</b>, como las otras cinco de este controlador: cada
     * operacion es una opcion distinta del catalogo. Aqui eso importa el doble, porque la clase no
     * declara ninguna y una lectura sin la suya se quedaria sin guardia (regla de ArchUnit: «en la
     * clase o en cada endpoint»).
     */
    @GetMapping("/usuarios/{id}/grupos")
    @RequiereAcceso(acceso = "usuarios", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<Recursos.GrupoResource> gruposDeUsuario(
            @PathVariable("id") long usuario, ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                administrar.gruposDeUsuario(usuario, paginacion.aPaginacion("nombre")),
                Recursos.GrupoResource::de);
    }

    /**
     * Alta y baja de la pertenencia a un grupo.
     *
     * <p>Un solo endpoint para las dos, con {@code activo} en el cuerpo, porque la baja <b>no es un
     * borrado</b>: es el mismo registro con otro estado (RNF-051). Un {@code DELETE} aqui sugeriria
     * lo contrario a quien lea el contrato.
     *
     * <p>La observacion viaja en el cuerpo y se convierte en el tipo antes de llegar al caso de
     * uso: si viene vacia, el constructor de {@link Observacion} la rechaza y la peticion es 422.
     */
    @PostMapping("/grupos/{grupo}/miembros")
    @RequiereAcceso(acceso = "miembros", privilegio = Privilegio.REGISTRO)
    public Recursos.MiembroResource miembros(
            @PathVariable("grupo") long grupo, @RequestBody Recursos.CambioDeMiembro cambio) {

        Observacion observacion = Observacion.de(cambio.observacion());
        Miembro resultado =
                cambio.activo()
                        ? administrar.afiliar(grupo, cambio.usuarioId(), observacion)
                        : administrar.desafiliar(grupo, cambio.usuarioId(), observacion);

        return new Recursos.MiembroResource(
                resultado.grupoId(), resultado.usuarioId(), resultado.activo());
    }
}
