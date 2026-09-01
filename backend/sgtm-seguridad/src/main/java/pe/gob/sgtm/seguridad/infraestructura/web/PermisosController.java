package pe.gob.sgtm.seguridad.infraestructura.web;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarPermisos;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarPermisos.PermisoDeAcceso;
import pe.gob.sgtm.seguridad.dominio.Permiso;
import pe.gob.sgtm.web.Api;

/**
 * Niveles de accesibilidad de un grupo: {@code PUT /api/v1/seguridad/grupos/{id}/permisos}.
 *
 * <p>Es un {@code PUT} y recibe la lista completa de accesos con sus privilegios, no un cambio
 * incremental. La pantalla del manual es una tabla de accesos por siete casillas: lo que el usuario
 * ve al guardar es el estado completo, y aceptar aqui un delta obligaria a la interfaz a calcular
 * que cambio —y a acertar—.
 *
 * <p>Lo que <b>no</b> hace es borrar los permisos que no vengan en el cuerpo. Un acceso ausente se
 * queda como estaba: enviar una lista parcial no debe traducirse en retirar en silencio todo lo
 * demas. Para retirar, se manda el acceso con la lista de privilegios vacia, que es explicito.
 */
@RestController
@RequestMapping(Api.RAIZ + "/seguridad/grupos/{id}/permisos")
public class PermisosController {

    private final AdministrarPermisos administrar;

    public PermisosController(AdministrarPermisos administrar) {
        this.administrar = administrar;
    }

    /**
     * Los permisos ya configurados del grupo, para cargar la matriz antes de guardarla.
     *
     * <p>No trae las 134 opciones del catalogo: trae las que este grupo tiene configuradas. La
     * pantalla combina esta respuesta —tipicamente unas pocas filas— con la pagina de {@code GET
     * /seguridad/accesos}, que ya pagina el catalogo entero. Ninguna de las dos necesita traer las
     * 134 opciones a la vez.
     */
    @GetMapping
    @RequiereAcceso(acceso = "permisos", privilegio = Privilegio.LECTURA)
    public List<PermisoResource> deGrupo(@PathVariable("id") long grupo) {
        List<PermisoResource> resultado = new ArrayList<>();
        for (PermisoDeAcceso permiso : administrar.deGrupo(grupo)) {
            resultado.add(PermisoResource.de(permiso));
        }
        return resultado;
    }

    @PutMapping
    @RequiereAcceso(acceso = "permisos", privilegio = Privilegio.REGISTRO)
    public List<PermisoResource> fijar(
            @PathVariable("id") long grupo, @RequestBody CambioDePermisos cambio) {

        Observacion observacion = Observacion.de(cambio.observacion());
        List<PermisoResource> resultado = new ArrayList<>();

        for (NivelDeAcceso nivel : cambio.niveles()) {
            Permiso permiso =
                    administrar.fijarParaGrupo(
                            grupo, nivel.acceso(), privilegios(nivel), observacion);
            resultado.add(PermisoResource.de(permiso, nivel.acceso()));
        }
        return resultado;
    }

    private static Set<Privilegio> privilegios(NivelDeAcceso nivel) {
        Set<Privilegio> privilegios = EnumSet.noneOf(Privilegio.class);
        for (String nombre : nivel.privilegios()) {
            try {
                privilegios.add(
                        Privilegio.valueOf(nombre.trim().toUpperCase(java.util.Locale.ROOT)));
            } catch (IllegalArgumentException e) {
                // El mensaje enumera los siete: el cliente mando un nombre que no
                // existe, y decirle cuales hay es mas util que decirle que fallo.
                throw new IllegalArgumentException(
                        "Privilegio desconocido: '"
                                + nombre
                                + "'. Los siete son "
                                + java.util.Arrays.toString(Privilegio.values()));
            }
        }
        return privilegios;
    }

    /** Cuerpo de la peticion: los niveles a fijar y por que. */
    public record CambioDePermisos(List<NivelDeAcceso> niveles, String observacion) {}

    /** Un acceso y los privilegios que quedan otorgados sobre el. */
    public record NivelDeAcceso(String acceso, List<String> privilegios) {}

    /**
     * Un permiso configurado, del <b>grupo o del usuario</b>, y se distingue cual (#543).
     *
     * <p>Los dos identificadores son {@code Long} nulables y no {@code long} primitivos. Antes
     * {@code grupoId} era primitivo y valia {@code 0L} cuando la fila no tenia grupo —o sea, cuando
     * era una excepcion de usuario—, y esa fila salia por HTTP <b>indistinguible de una del grupo
     * 0</b>. {@code usuarioId} directamente no se publicaba, asi que el cliente no tenia ni un dato
     * con el que separarlas: una excepcion de usuario se leia como un permiso del grupo.
     *
     * <p>El esquema garantiza que hay exactamente uno de los dos ({@code permiso_sujeto_ck}, V5), y
     * {@link Permiso} lo repite en su constructor: nulo aqui significa «el otro», no «se
     * desconoce».
     */
    public record PermisoResource(
            long id,
            String acceso,
            @Nullable Long grupoId,
            @Nullable Long usuarioId,
            List<String> privilegios) {

        static PermisoResource de(Permiso permiso, String acceso) {
            List<String> nombres =
                    java.util.Arrays.stream(Privilegio.values())
                            .filter(permiso::tiene)
                            .map(Enum::name)
                            .toList();
            return new PermisoResource(
                    permiso.id() == null ? 0L : permiso.id(),
                    acceso,
                    permiso.grupoId(),
                    permiso.usuarioId(),
                    nombres);
        }

        static PermisoResource de(PermisoDeAcceso permiso) {
            List<String> nombres =
                    java.util.Arrays.stream(Privilegio.values())
                            .filter(permiso.privilegios()::contains)
                            .map(Enum::name)
                            .toList();
            return new PermisoResource(
                    permiso.id(),
                    permiso.codigoDeAcceso(),
                    permiso.grupoId(),
                    permiso.usuarioId(),
                    nombres);
        }
    }
}
