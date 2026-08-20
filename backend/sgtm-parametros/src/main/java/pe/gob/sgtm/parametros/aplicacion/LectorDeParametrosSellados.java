package pe.gob.sgtm.parametros.aplicacion;

import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.parametros.dominio.ConjuntoDeParametros;
import pe.gob.sgtm.parametros.dominio.ParametroTributario;
import pe.gob.sgtm.parametros.dominio.ParametrosRepository;

/**
 * Lee conjuntos <b>sellados</b>, y solo sellados. Un conjunto ABIERTO no se lee aunque tenga todos
 * sus parametros: recalcular 2027 en 2037 debe dar el mismo centimo, y para eso lo leido tiene que
 * ser inmutable.
 */
@Service
public class LectorDeParametrosSellados implements LectorDeParametros {

    private final ParametrosRepository repositorio;

    public LectorDeParametrosSellados(ParametrosRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    @Transactional(readOnly = true)
    public ParametrosSellados vigenteEn(Ejercicio ejercicio) {
        ConjuntoDeParametros conjunto =
                repositorio
                        .selladoVigenteDe(ejercicio)
                        .orElseThrow(() -> new EjercicioSinSellar(ejercicio));
        return armar(conjunto);
    }

    @Override
    @Transactional(readOnly = true)
    public IdentificadorDeConjunto conjuntoVigenteEn(Ejercicio ejercicio) {
        ConjuntoDeParametros conjunto =
                repositorio
                        .selladoVigenteDe(ejercicio)
                        .orElseThrow(() -> new EjercicioSinSellar(ejercicio));
        return IdentificadorDeConjunto.de(
                Objects.requireNonNull(conjunto.id(), "Un conjunto leido de la base tiene id"));
    }

    @Override
    @Transactional(readOnly = true)
    public ParametrosSellados porConjunto(IdentificadorDeConjunto identificador) {
        ConjuntoDeParametros conjunto =
                repositorio
                        .selladoPorId(identificador.valor())
                        .orElseThrow(() -> new ConjuntoNoSellado(identificador));
        return armar(conjunto);
    }

    private ParametrosSellados armar(ConjuntoDeParametros conjunto) {
        ParametrosSellados.Constructor constructor =
                ParametrosSellados.de(conjunto.ejercicio(), conjunto.version());

        for (ParametroTributario parametro :
                repositorio.parametrosDe(Objects.requireNonNull(conjunto.id()))) {
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
