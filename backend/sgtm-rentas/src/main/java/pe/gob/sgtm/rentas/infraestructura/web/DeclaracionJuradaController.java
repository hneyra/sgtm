package pe.gob.sgtm.rentas.infraestructura.web;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.rentas.dominio.DeclaracionJuradaRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Declaracion jurada: {@code GET /api/v1/rentas/declaraciones/{djNro}} (RF-023).
 *
 * <p>Se busca por numero y año: {@code dj_numero_uq} (V2) es unica por ejercicio, no sola, y sin el
 * año dos declaraciones de ejercicios distintos con el mismo numero serian indistinguibles.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/declaraciones")
@RequiereAcceso(acceso = "declaracion_jurada", privilegio = Privilegio.LECTURA)
public class DeclaracionJuradaController {

    private final DeclaracionJuradaRepository repositorio;

    public DeclaracionJuradaController(DeclaracionJuradaRepository repositorio) {
        this.repositorio = repositorio;
    }

    /**
     * {@code @Transactional(readOnly = true)} directo en el controlador, y no un caso de uso
     * intermedio: es un passthrough de lectura sin ninguna regla que aplicar. Sin esta anotacion la
     * consulta falla en la base por falta de contexto —{@code RepositorioJdbc} no abre transaccion
     * propia, y sin una activa no hay {@code SET LOCAL}—, el mismo defecto que la prueba de
     * regresion de {@code CuentaCorrienteController} y {@code AltasBajasController} encontro para
     * esos dos endpoints (#164).
     */
    @GetMapping("/{djNro}")
    @Transactional(readOnly = true)
    public DeclaracionJuradaResource obtener(@PathVariable String djNro, @RequestParam String ano) {
        int anio;
        try {
            anio = Integer.parseInt(ano.strip());
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "El año no es un numero");
        }

        return repositorio
                .porNumero(djNro, new Ejercicio(anio))
                .map(DeclaracionJuradaResource::de)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ninguna declaracion jurada con ese numero en ese"
                                                + " año"));
    }
}
