package pe.gob.sgtm.seguridad.infraestructura.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarPermisos;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Quien tiene un privilegio sobre un acceso: {@code GET
 * /api/v1/seguridad/accesos/{codigo}/usuarios?privilegio=ESPECIAL} (#583).
 *
 * <h2>El defecto que cierra</h2>
 *
 * <p>«Que cuentas tienen el privilegio Especial» solo se podia contestar cuenta por cuenta. Medido
 * el 2026-09-01 contra el backend local, {@code GET /seguridad/usuarios/1/permisos} devuelve 134
 * filas y 21 511 bytes, y el contrato de esa operacion declara <b>un solo parametro</b>, {@code id}
 * en la ruta: no hay filtro por privilegio ni por acceso. Con los 200 usuarios que la pantalla pide
 * de una vez, la insignia del panel costaba 200 peticiones y ~4,2 MB de JSON.
 *
 * <p>Y no se podia atajar por los grupos, que es lo que uno intentaria: la excepcion propia de una
 * cuenta <b>sustituye</b> a lo que su grupo le da, asi que quien pertenece a un grupo sin el
 * privilegio puede tenerlo por excepcion —y al reves—. Ninguna lectura listaba las excepciones, y
 * un recorrido por grupos deja fuera exactamente esa mitad.
 *
 * <h2>La forma, y las tres cosas que decide</h2>
 *
 * <p><b>Es una lectura sobre un acceso</b>, simetrica a {@code /seguridad/grupos/{grupo}/miembros}
 * —quien esta en un grupo (#582)— y a {@code /seguridad/usuarios/{id}/permisos} —que puede una
 * persona (#543)—. El acceso va por su <b>codigo</b>, que es como lo nombra cada fila de aquella
 * matriz y como viaja en el cuerpo del {@code PUT} de niveles; un codigo que no existe en esta
 * municipalidad es <b>404</b>, no una lista vacia.
 *
 * <p><b>{@code privilegio} es obligatorio</b>, con el vocabulario cerrado de los siete. Sin el, la
 * respuesta seria «quien tiene algo sobre este acceso», que es otra pregunta y no la que se audita;
 * y una palabra que no sea ninguno de los siete se rechaza con 422 enumerandolos, nunca con la
 * lista vacia — que se leeria como «no lo tiene nadie», el defecto que #427 se nego a introducir.
 *
 * <p><b>La lista es la de lo configurado, y cada fila dice si hoy sirve.</b> Una cuenta
 * deshabilitada que conserva el privilegio sale, con {@code efectivoHoy} en falso: filtrarla seria
 * esconder justo la fila que se audita —rehabilitarla se lo devuelve entero—, y publicarla sin la
 * bandera seria afirmar que entra donde el guardia le responderia 403.
 *
 * <p>El acceso exigido es {@code permisos} con {@code LECTURA} —la misma opcion del catalogo que la
 * matriz de un usuario y la de un grupo: es la misma informacion mirada desde el otro lado— y va
 * <b>en el metodo</b> aunque hoy la clase tenga un solo endpoint, para que una escritura añadida
 * despues no herede en silencio el privilegio de una lectura.
 */
@RestController
@RequestMapping(Api.RAIZ + "/seguridad/accesos/{codigo}/usuarios")
public class TitularesDelPrivilegioController {

    private final AdministrarPermisos administrar;

    public TitularesDelPrivilegioController(AdministrarPermisos administrar) {
        this.administrar = administrar;
    }

    @GetMapping
    @RequiereAcceso(acceso = "permisos", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<Recursos.TitularDelPrivilegioResource> titulares(
            @PathVariable("codigo") String codigo,
            @RequestParam("privilegio") String privilegio,
            ParametrosDePaginacion paginacion) {

        return RespuestaPaginada.de(
                administrar.titularesDe(
                        codigo, Privilegios.de(privilegio), paginacion.aPaginacion("cuenta")),
                Recursos.TitularDelPrivilegioResource::de);
    }
}
