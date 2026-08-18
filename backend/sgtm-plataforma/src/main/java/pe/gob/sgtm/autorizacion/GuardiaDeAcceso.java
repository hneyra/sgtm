package pe.gob.sgtm.autorizacion;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Comprueba {@link RequiereAcceso} antes de que el controlador reciba el control.
 *
 * <p>Es un interceptor y no una comprobacion dentro de cada metodo porque una comprobacion que hay
 * que escribir en 134 sitios falta en alguno, y el que falta no se descubre revisando: se descubre
 * cuando alguien entra.
 *
 * <h2>Que pasa si falta la anotacion</h2>
 *
 * <p><b>Se deniega.</b> No se deja pasar «porque no dice nada». Un endpoint sin anotacion es un
 * defecto, y la regla de ArchUnit rompe el build antes de que llegue aqui; pero si por algun camino
 * llegara —un controlador registrado en tiempo de ejecucion, un {@code @ControllerAdvice} que
 * publique rutas—, negar es lo unico razonable. La alternativa, permitir por omision, convierte
 * cualquier olvido en una puerta abierta.
 *
 * <p>Se exceptua lo que no es un metodo de controlador: recursos estaticos, el manejador de errores
 * y las rutas del propio contenedor.
 */
public class GuardiaDeAcceso implements HandlerInterceptor {

    private final ComprobadorDeAcceso comprobador;
    private final Clock reloj;

    public GuardiaDeAcceso(ComprobadorDeAcceso comprobador, Clock reloj) {
        this.comprobador = comprobador;
        this.reloj = reloj;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest peticion, HttpServletResponse respuesta, Object manejador) {

        if (!(manejador instanceof HandlerMethod metodo)) {
            return true;
        }

        RequiereAcceso requisito =
                AnnotatedElementUtils.findMergedAnnotation(
                        metodo.getMethod(), RequiereAcceso.class);
        if (requisito == null) {
            requisito =
                    AnnotatedElementUtils.findMergedAnnotation(
                            metodo.getBeanType(), RequiereAcceso.class);
        }
        if (requisito == null) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.SIN_PRIVILEGIO,
                    "La operacion no declara que acceso exige, asi que no se autoriza");
        }

        String usuario = OrigenContext.actual().usuario();
        if (!comprobador.autoriza(
                usuario, requisito.acceso(), requisito.privilegio(), LocalDate.now(reloj))) {
            // El mensaje dice que falta, no quien lo tiene ni como se configura: eso
            // ya es informacion sobre la organizacion de la municipalidad.
            throw new ProblemaDeNegocio(
                    CodigoDeError.SIN_PRIVILEGIO,
                    "No tiene el privilegio "
                            + requisito.privilegio()
                            + " sobre "
                            + requisito.acceso());
        }
        return true;
    }
}
