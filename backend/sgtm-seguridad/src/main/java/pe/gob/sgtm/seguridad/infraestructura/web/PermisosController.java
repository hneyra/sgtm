package pe.gob.sgtm.seguridad.infraestructura.web;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarPermisos;
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

    public record PermisoResource(long id, String acceso, long grupoId, List<String> privilegios) {

        static PermisoResource de(Permiso permiso, String acceso) {
            List<String> nombres =
                    java.util.Arrays.stream(Privilegio.values())
                            .filter(permiso::tiene)
                            .map(Enum::name)
                            .toList();
            return new PermisoResource(
                    permiso.id() == null ? 0L : permiso.id(),
                    acceso,
                    permiso.grupoId() == null ? 0L : permiso.grupoId(),
                    nombres);
        }
    }
}
