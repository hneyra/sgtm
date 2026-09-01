package pe.gob.sgtm.seguridad.dominio;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * Puerto de persistencia de los permisos (RF-121).
 *
 * <p>Un permiso es de un grupo <b>o</b> de un usuario, nunca de los dos, asi que las consultas van
 * separadas: mezclarlas en un {@code findBySujeto(Object)} obligaria a preguntar el tipo en cada
 * llamada, que es la forma de que un dia se pregunte mal.
 */
public interface PermisoRepository {

    Permiso save(Permiso permiso);

    Optional<Permiso> deGrupo(long accesoId, long grupoId);

    Optional<Permiso> deUsuario(long accesoId, long usuarioId);

    /** Todos los permisos de un grupo, para la pantalla de niveles de accesibilidad. */
    List<Permiso> todosLosDeGrupo(long grupoId);

    /**
     * La matriz de permisos <b>efectivos</b> de un usuario: por cada opcion del catalogo sobre la
     * que tiene algun privilegio, el conjunto de privilegios. Las opciones sin ninguno no aparecen.
     *
     * <p>Misma precedencia que el guardia ({@code ComprobadorDeAcceso}): la excepcion del usuario
     * decide —otorgue o niegue—, y si no la hay manda la union de sus grupos vigentes. Vigencia y
     * habilitacion se comprueban en el usuario, en el grupo y en la pertenencia (RF-123); un
     * usuario deshabilitado o fuera de vigencia recibe la matriz vacia.
     *
     * <p>Es la fuente del menu de la interfaz (ADR-0013): resolverlo con otra regla que la del
     * guardia mostraria opciones que despues responden 403, o esconderia opciones que si funcionan.
     */
    Map<String, Set<Privilegio>> efectivosDe(String cuenta, LocalDate fecha);

    /**
     * La misma matriz, pero de <b>otro</b> usuario y diciendo de donde viene cada fila (#543).
     *
     * <p>No es una variante por comodidad de la de arriba. Aquella sirve a la interfaz para
     * dibujarse a si misma —el sujeto sale del token y lo unico que importa es que se puede—; esta
     * sirve para <b>administrar a otro</b>, y ahi lo que hay que ver es la precedencia: si lo que
     * manda es la excepcion del usuario o sus grupos. Aplanarlas juntas dejaria a quien administra
     * sin poder distinguir un permiso propio de uno heredado, que es exactamente lo que la pantalla
     * de la matriz existe para enseñar.
     *
     * <p>El sujeto va por <b>identificador</b> y no por cuenta porque asi lo nombra la ruta que la
     * publica, y porque es lo que el resto de la administracion usa (grupo, miembro).
     *
     * <p>Misma regla que el guardia en todo lo demas: vigencia y habilitacion en los tres eslabones
     * (RF-123), y un usuario deshabilitado o fuera de vigencia recibe la lista vacia. Resolverlo
     * con otra regla mostraria en la matriz privilegios que despues responden 403.
     *
     * @see PermisoEfectivo
     */
    List<PermisoEfectivo> efectivosConOrigenDe(long usuarioId, LocalDate fecha);

    /**
     * La misma matriz, pero <b>configurada</b> en vez de efectiva (#583).
     *
     * <p>Es {@link #efectivosConOrigenDe} <b>sin</b> la comprobacion de habilitacion y vigencia
     * <b>del usuario</b>, y esa unica diferencia es el issue entero: {@code efectivosConOrigenDe}
     * aplica la regla del guardia, asi que a una cuenta deshabilitada le devuelve la lista vacia
     * <b>tanto si conserva permisos como si nunca los tuvo</b>. Las dos respuestas son el mismo
     * JSON, y quien audita necesita separarlas: una cuenta que se deshabilita conserva lo que
     * tuviera configurado, y rehabilitarla se lo devuelve entero.
     *
     * <p><b>Lo que si conserva es la vigencia del grupo y de la pertenencia.</b> Lo que se pregunta
     * es que podria esta cuenta el dia que alguien la reactive, y reactivar al usuario no reactiva
     * un grupo inhabilitado ni devuelve a quien salio de el. Quitar ahi la comprobacion convertiria
     * la respuesta en «lo que alguna vez estuvo escrito», que es otra pregunta.
     *
     * <p>No sustituye a la efectiva y no la cambia: son dos preguntas, no dos respuestas a la
     * misma. Comparten la expresion de precedencia, de modo que no puedan decir cosas distintas
     * sobre quien manda —la excepcion o el grupo—.
     */
    List<PermisoEfectivo> configuradosConOrigenDe(long usuarioId, LocalDate fecha);

    /**
     * Quien tiene un privilegio sobre un acceso, en <b>una</b> consulta (#583).
     *
     * <p>La pregunta inversa de {@link #efectivosConOrigenDe}, y hasta ahora no se podia hacer:
     * costaba una peticion por cuenta del padron. Componerla desde el cliente ademas <b>no
     * funciona</b> si se atajaba por los grupos, porque la excepcion de usuario sustituye a lo que
     * el grupo da y ningun recorrido por grupos encuentra a quien lo tiene por excepcion.
     *
     * <p>Devuelve lo <b>configurado</b>, no lo efectivo: la cuenta deshabilitada que conserva el
     * privilegio sale, con {@code efectivoHoy} en falso. Filtrarla seria esconder justo la fila que
     * se audita; publicarla sin la bandera seria afirmar que puede entrar donde el guardia le
     * responderia 403.
     *
     * @param accesoId el acceso ya resuelto: un codigo que no existe es 404 antes de llegar aqui
     * @param privilegio uno de los siete; su columna es la que decide, y no hay texto libre
     */
    Pagina<TitularDelPrivilegio> titularesDe(
            long accesoId, Privilegio privilegio, LocalDate fecha, Paginacion paginacion);

    /**
     * Cuantos usuarios habilitados y vigentes pueden hoy administrar permisos.
     *
     * <p>Existe para una sola cosa: impedir que el ultimo se quede sin el privilegio. Un sistema
     * sin nadie que pueda otorgar permisos no se arregla desde el sistema —hace falta entrar por la
     * base de datos—, asi que el error mas caro de esta pantalla es tambien el mas facil de
     * cometer: quitarse a uno mismo el permiso que hacia falta para devolverselo.
     */
    long usuariosQuePuedenAdministrarPermisos(LocalDate fecha);
}
