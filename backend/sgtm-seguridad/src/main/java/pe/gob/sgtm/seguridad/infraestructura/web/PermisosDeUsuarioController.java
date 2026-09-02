package pe.gob.sgtm.seguridad.infraestructura.web;

import java.util.ArrayList;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarPermisos;
import pe.gob.sgtm.seguridad.dominio.PermisoEfectivo;
import pe.gob.sgtm.web.Api;

/**
 * La matriz de permisos <b>efectivos</b> de un usuario: {@code GET
 * /api/v1/seguridad/usuarios/{id}/permisos} (#543).
 *
 * <h2>Por que no es el {@code GET} de {@link PermisosController} con otro sujeto</h2>
 *
 * <p>Aquel devuelve lo <b>configurado</b> de un grupo: la matriz que se edita y se guarda con el
 * {@code PUT} de la misma ruta. Este devuelve lo que un usuario <b>puede</b>, ya resuelto: la
 * excepcion de usuario sustituye al grupo entero para ese acceso —otorgue o niegue— y la union de
 * grupos manda cuando no hay excepcion. Son dos preguntas distintas y la segunda no se compone con
 * la primera sin volver a implementar la precedencia.
 *
 * <p><b>Y esa es la decision de forma.</b> Publicar las dos listas por separado —«los del grupo» y
 * «los del usuario»— obliga a quien pregunta a reconciliarlas, y la regla que tendria que aplicar
 * es justo la que no se puede equivocar: la interfaz la tenia invertida (calculaba {@code on =
 * esPropio || esHeredado}), que convierte una excepcion que <b>restringe</b> en una que amplia. Por
 * eso cada fila trae {@code origen} y, cuando lo hereda de un solo grupo, cual.
 *
 * <p>El acceso es {@code permisos} —la misma opcion del catalogo que la matriz de grupo— con {@code
 * LECTURA}. Va <b>en el metodo</b> aunque hoy la clase tenga un solo endpoint: es lo que hace que
 * añadir aqui una escritura no herede en silencio el privilegio de una lectura.
 */
@RestController
@RequestMapping(Api.RAIZ + "/seguridad/usuarios/{id}/permisos")
public class PermisosDeUsuarioController {

    private final AdministrarPermisos administrar;

    public PermisosDeUsuarioController(AdministrarPermisos administrar) {
        this.administrar = administrar;
    }

    @GetMapping
    @RequiereAcceso(acceso = "permisos", privilegio = Privilegio.LECTURA)
    public List<Recursos.PermisoEfectivoResource> deUsuario(@PathVariable("id") long usuario) {
        List<Recursos.PermisoEfectivoResource> resultado = new ArrayList<>();
        for (PermisoEfectivo permiso : administrar.efectivosDeUsuario(usuario)) {
            resultado.add(Recursos.PermisoEfectivoResource.de(permiso));
        }
        return resultado;
    }

    /**
     * Lo <b>configurado</b> de esa cuenta: {@code GET
     * /api/v1/seguridad/usuarios/{id}/permisos/configurados} (#583).
     *
     * <h2>Por que es otra ruta y no un parametro de la de arriba</h2>
     *
     * <p>Porque es otra pregunta, no otra respuesta a la misma. La de arriba <b>no cambia</b>: a
     * una cuenta deshabilitada le sigue contestando la lista vacia, con la misma regla que el
     * guardia, porque ensenar en la matriz privilegios que despues responden 403 seria peor que no
     * ensenar nada. Un parametro que apagara esa guarda convertiria una ruta en dos respuestas
     * distintas segun quien la llame, y la que se lee en pantalla acabaria dependiendo de un
     * booleano.
     *
     * <p>Lo que aqui se puede contestar y alli no: <b>que cuenta deshabilitada conserva
     * permisos</b>. Hasta este issue las dos situaciones —conservarlos y no haberlos tenido nunca—
     * eran el mismo JSON, y la diferencia importa porque deshabilitar no retira nada: rehabilitar
     * la cuenta se lo devuelve entero, y quien audita quiere saber que volveria a poder.
     *
     * <p>La respuesta lleva {@code surtenEfectoHoy} y no es adorno: las filas son campo a campo las
     * mismas que las de la matriz efectiva, y sin esa marca las dos lecturas son indistinguibles
     * para quien se equivoque de ruta.
     *
     * <p>Mismo acceso y mismo privilegio que la de arriba —{@code permisos} con {@code LECTURA}—,
     * declarado <b>en el metodo</b>: es lo que hace que una escritura anadida despues no herede en
     * silencio el privilegio de una lectura.
     */
    @GetMapping("/configurados")
    @RequiereAcceso(acceso = "permisos", privilegio = Privilegio.LECTURA)
    public Recursos.PermisosConfiguradosResource configuradosDeUsuario(
            @PathVariable("id") long usuario) {
        return Recursos.PermisosConfiguradosResource.de(administrar.configuradosDeUsuario(usuario));
    }
}
