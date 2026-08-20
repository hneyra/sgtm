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

    /** Id de la opcion en el catalogo de pantallas (NEG-03), tal como esta en {@code acceso}. */
    String acceso();

    /** Cual de los siete privilegios exige. */
    Privilegio privilegio();
}
