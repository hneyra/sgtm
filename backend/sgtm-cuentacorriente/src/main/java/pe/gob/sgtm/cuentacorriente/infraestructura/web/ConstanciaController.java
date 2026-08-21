package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultarDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ConstanciaDeNoAdeudo;
import pe.gob.sgtm.web.Api;

/**
 * {@code constancia}: {@code GET /api/v1/consultas/constancias/no-adeudo} (RF-049, RNF-084, #25).
 *
 * <p>Vista previa del documento que se entrega al contribuyente. El formato impreso en una hoja A4
 * y su exportacion a {@code .xls}/{@code .rtf} (RNF-081) son del renderizador comun de reportes del
 * frontend (#55); este endpoint solo entrega los datos y la decision de si se niega —{@link
 * ConsultarDeuda#constanciaDeNoAdeudo} es quien la toma, mirando todas las obligaciones del
 * contribuyente en cualquier fase, sin que este contexto necesite conocer a coactiva ni a un
 * contexto de convenios (regla 2, ARQ-01 §4).
 */
@RestController
@RequestMapping(Api.RAIZ + "/consultas/constancias/no-adeudo")
@RequiereAcceso(acceso = "constancia", privilegio = Privilegio.LECTURA)
public class ConstanciaController {

    private final ConsultarDeuda consulta;

    public ConstanciaController(ConsultarDeuda consulta) {
        this.consulta = consulta;
    }

    @GetMapping
    public ConstanciaResource constancia(
            @RequestParam String codContribuyente,
            @RequestParam(required = false) @Nullable String fecha) {
        if (codContribuyente.isBlank()) {
            throw new IllegalArgumentException(
                    "codContribuyente es obligatorio para emitir la constancia de no adeudo");
        }
        ConstanciaDeNoAdeudo constancia =
                consulta.constanciaDeNoAdeudo(codContribuyente, fechaDe(fecha));
        return ConstanciaResource.de(constancia);
    }

    /**
     * La fecha de corte pedida, o hoy si no viene ninguna. Ver {@link
     * ConsultaDeudaController#fechaDe} para por que {@code DateTimeParseException} necesita su
     * propio {@code catch}.
     */
    private LocalDate fechaDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return consulta.hoy();
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException excepcion) {
            throw new IllegalArgumentException(
                    "La fecha de corte debe tener formato AAAA-MM-DD: '" + texto + "'", excepcion);
        }
    }
}
