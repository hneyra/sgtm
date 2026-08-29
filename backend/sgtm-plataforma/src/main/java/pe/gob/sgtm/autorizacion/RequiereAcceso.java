package pe.gob.sgtm.autorizacion;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declara que acceso y que privilegio exige una operacion.
 *
 * <pre>
 *   &#64;RequiereAcceso(acceso = "ficha_urbana", privilegio = Privilegio.REGISTRO)
 *   &#64;PostMapping
 *   public FichaResource registrar(...) { … }
 * </pre>
 *
 * <p>El {@code acceso} es el <b>id de la opcion en el catalogo de pantallas</b> (NEG-03), que es el
 * mismo que se siembra en la tabla {@code acceso}. Asi se cumple lo que promete el manual: «al
 * crearse una nueva opcion de menu el sistema automaticamente la reconoce y brinda la posibilidad
 * de configurar los diferentes niveles de acceso».
 *
 * <p><b>Es obligatoria en todo controlador</b>, y lo verifica una regla de ArchUnit: un endpoint
 * sin anotacion rompe el build. Sin esa regla, el endpoint numero cuarenta se publicaria sin
 * guardia y nadie lo notaria hasta que alguien lo encontrara.
 *
 * <p>Se admite en la clase —para todo el controlador— y en el metodo, que gana sobre la clase: un
 * mismo controlador suele tener una consulta con {@code LECTURA} y un alta con {@code REGISTRO}.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface RequiereAcceso {

    /**
     * Centinela para {@link #acceso()}: la operacion <b>no es una opcion del catalogo</b>, sino la
     * lectura de la propia sesion del usuario autenticado —quien es, y que puede hacer—.
     *
     * <p>El guardia no la comprueba contra el catalogo: no hay ningun privilegio que configurar, y
     * leer los permisos propios no revela nada que el usuario no pueda enumerar probando cada
     * endpoint (REQ-03 §5: que la interfaz oculte una opcion es comodidad, no seguridad). Lo que
     * sigue exigiendo es un token valido, igual que cualquier otro endpoint. Ver ADR-0013.
     */
    String SESION_PROPIA = "__sesion_propia__";

    /**
     * Segundo centinela para {@link #acceso()}: la operacion la pide el <b>ciudadano</b> desde el
     * portal, y el ciudadano no esta en el catalogo de permisos (ADR-0020).
     *
     * <p>El precedente exacto es {@link #SESION_PROPIA}, y el motivo es del mismo tipo: no hay
     * ningun privilegio que comprobar. Un ciudadano <b>no tiene fila en {@code usuario}</b> —no es
     * personal de ninguna municipalidad, no pertenece a ningun grupo y nadie le configura una
     * matriz—, asi que preguntarle al catalogo por sus privilegios devolveria siempre que no tiene
     * ninguno y el portal seria un 403 permanente.
     *
     * <p>Lo que <b>si</b> se comprueba, y es lo que distingue este centinela del anterior: que la
     * peticion haya llegado por la <b>cadena del ciudadano</b>. Sin esa comprobacion, anotar un
     * endpoint con este centinela seria la forma de saltarse el catalogo de permisos entero —«pon
     * CIUDADANO y ya no hace falta privilegio»—, que es exactamente lo que no puede poder hacerse.
     * Ver {@code GuardiaDeAcceso}.
     *
     * <p>Y hay una tercera barrera, en el build: un endpoint <b>del catalogo</b> —cualquiera que no
     * cuelgue de {@code /api/v1/portal}— anotado con este centinela rompe {@code
     * verificarArquitectura}. Es la regla {@code EL_CENTINELA_DEL_CIUDADANO_SOLO_SIRVE_AL_PORTAL},
     * con su clase de muestra.
     */
    String CIUDADANO = "__ciudadano__";

    /** Id de la opcion en el catalogo de pantallas (NEG-03), tal como esta en {@code acceso}. */
    String acceso();

    /** Cual de los siete privilegios exige. */
    Privilegio privilegio();
}
