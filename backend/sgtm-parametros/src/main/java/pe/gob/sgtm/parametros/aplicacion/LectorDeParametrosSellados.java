package pe.gob.sgtm.parametros.aplicacion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.parametros.dominio.ConjuntoDeParametros;
import pe.gob.sgtm.parametros.dominio.ParametroTributario;
import pe.gob.sgtm.parametros.dominio.ParametrosRepository;

/**
 * Lee de la base el conjunto sellado de un ejercicio y lo entrega como objeto inmutable.
 *
 * <p>Es el unico punto del sistema donde los valores normativos pasan de la base a la memoria.
 * Despues de aqui viajan como argumento —{@link ParametrosSellados} dentro de la entrada del
 * calculo— y ninguna regla vuelve a consultar nada, que es lo que hace el calculo reproducible.
 *
 * <p>Es {@code readOnly}: leer parametros no modifica nada y por tanto no exige observacion. Lo que
 * si exige es el contexto de municipalidad, porque los parametros locales son datos de tenant; los
 * de ambito nacional se ven igual, por la politica RLS de {@code parametro_tributario}.
 */
@Service
public class LectorDeParametrosSellados implements LectorDeParametros {

    private final ParametrosRepository repositorio;

    public LectorDeParametrosSellados(ParametrosRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    @Transactional(readOnly = true)
    public ParametrosSellados delEjercicio(Ejercicio ejercicio) {
        ConjuntoDeParametros conjunto =
                repositorio
                        .selladoDe(ejercicio)
                        .orElseThrow(() -> new EjercicioSinSellar(ejercicio));

        ParametrosSellados.Constructor constructor =
                ParametrosSellados.de(conjunto.ejercicio(), conjunto.version());

        for (ParametroTributario parametro :
                repositorio.parametrosDe(java.util.Objects.requireNonNull(conjunto.id()))) {
            parametro
                    .numero()
                    .ifPresent(v -> constructor.numero(parametro.tipo(), parametro.clave(), v));
            parametro
                    .texto()
                    .ifPresent(v -> constructor.texto(parametro.tipo(), parametro.clave(), v));
        }

        return constructor.construir();
    }
}
