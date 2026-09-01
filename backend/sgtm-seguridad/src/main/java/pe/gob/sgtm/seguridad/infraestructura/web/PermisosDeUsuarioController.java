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
        return comoRecursos(administrar.efectivosDeUsuario(usuario));
    }

    /**
     * Lo <b>configurado</b> de esa cuenta: {@code GET
     * /api/v1/seguridad/usuarios/{id}/permisos/configurados} (#583).
     *
     * <h2>Por que es otra ruta y no un parametro de la de arriba</h2>
     *
     * <p>Porque no es otra respuesta a la misma pregunta: es otra pregunta. La de arriba aplica la
     * regla del guardia y <b>no cambia</b> —a una cuenta deshabilitada le sigue contestando la
     * lista vacia—, porque enseñar en la matriz privilegios que despues responden 403 seria peor
     * que no enseñar ninguno. Su efecto secundario es que «se deshabilito y conserva permisos» y
     * «nunca tuvo ninguno» son <b>el mismo JSON</b>, y esa es exactamente la pregunta que quien
     * audita necesita: una cuenta que se deshabilita conserva lo que tuviera configurado, y
     * rehabilitarla se lo devuelve entero.
     *
     * <p>Un parametro sobre la misma operacion —{@code ?vista=configurado}— dejaria a la misma ruta
     * contestando con dos reglas distintas segun un filtro, y el cliente que lo omita creeria estar
     * leyendo lo que puede cuando lee lo que tiene escrito.
     *
     * <p><b>La forma es la misma a proposito</b>: las dos respuestas se comparan campo a campo, y
     * ahi esta la diferencia que el issue existe para poder ver.
     *
     * <p>El acceso es el mismo, {@code permisos} con {@code LECTURA}, y va <b>en el metodo</b> como
     * el de arriba: la clase declara solo el {@code @RequestMapping}, asi que un endpoint sin la
     * suya se quedaria sin guardia.
     */
    @GetMapping("/configurados")
    @RequiereAcceso(acceso = "permisos", privilegio = Privilegio.LECTURA)
    public List<Recursos.PermisoEfectivoResource> configuradosDeUsuario(
            @PathVariable("id") long usuario) {
        return comoRecursos(administrar.configuradosDeUsuario(usuario));
    }

    private static List<Recursos.PermisoEfectivoResource> comoRecursos(
            List<PermisoEfectivo> permisos) {
        List<Recursos.PermisoEfectivoResource> resultado = new ArrayList<>();
        for (PermisoEfectivo permiso : permisos) {
            resultado.add(Recursos.PermisoEfectivoResource.de(permiso));
        }
        return resultado;
    }
}
