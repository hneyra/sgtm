package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.aplicacion.RegistrarActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.Hallazgo;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Acta de inspección predial: {@code POST /api/v1/fiscalizacion/predial/actas} (RF-051, #45).
 *
 * <p>Trabaja sobre una copia: no toca ninguna fila de {@code catastro} (AC de #45). El cuerpo es
 * una <b>lista blanca</b>, mismo patrón que {@code TransferenciaPredioController}.
 *
 * <h2>No hay ningún {@code GET} de actas, y publicar uno no desbloquearía la pantalla (#546, AC 8)
 * </h2>
 *
 * <p>Un acta se registra y no se puede volver a leer: el único sitio donde asoma es {@code
 * MuestraResource.visitado}, que dice <b>si</b> un predio de la muestra ya tiene acta y nada más.
 * Es un hueco real, y el issue de esa lectura es propio.
 *
 * <p>Lo que sí queda medido aquí es que <b>ese {@code GET} no es lo que le falta a la pantalla</b>.
 * El destino {@code actas} del diseño es el acta en cuatro pasos con modo campo: dibuja 23
 * controles y siete filas de contraste declarado/verificado, y el cuerpo de este {@code POST} tiene
 * <b>nueve</b> campos —{@code observacion}, {@code programaId}, {@code contribuyenteId}, {@code
 * predioId}, {@code fechaVisita}, {@code fiscalizador}, {@code hallazgo}, {@code areaHallada},
 * {@code detalle}—. Un listado publicaría esos nueve, o sea la misma foto que ya no llena el
 * formulario: lo que falta no es por dónde leer, es <b>dónde guardar</b>.
 *
 * <p>Y lo que falta es sobre todo una columna. {@code acta_fiscalizacion} (V4, V24) guarda {@code
 * area_hallada} y <b>ninguna de uso</b>, así que el «uso observado» —el sexto de los siete
 * contrastes, y el valor «USO DISTINTO AL DECLARADO» que el desplegable del manual ofrece— no cabe:
 * hoy lo teclea quien liquida, como argumento de {@code LiquidarFiscalizacion.liquidar}, y quien
 * visitó no puede dejarlo escrito. Es lo que impide que {@link
 * pe.gob.sgtm.fiscalizacion.dominio.Hallazgo} gane el quinto valor que {@code CondicionFiscalizada}
 * sí tiene, y por eso está anotado ahí y no aquí.
 *
 * <p>Las otras seis filas de contraste son estructura del predio —frente, fondo, número de pisos,
 * material, estado de conservación— y ninguna existe todavía en ninguna tabla del acta; declararlas
 * en el cuerpo sin tabla dejaría la petición aceptando datos que se pierden al guardar, que es peor
 * que no aceptarlos.
 *
 * <p><b>Y es la misma lectura que le falta al embudo del programa</b> (#546, AC 10). Sus cuatro
 * etapas son «Programados», «Inspeccionados», «Con liquidación» y «Notificadas»; la primera la da
 * el total de {@code GET /programas/{id}/muestra} y las dos últimas los dos totales de {@code GET
 * /fiscalizacion/resultados}, cada uno de su propia consulta. La única que no tiene de dónde salir
 * es <b>«Inspeccionados»</b>, que es cuántas actas tiene el programa: {@code visitado} viaja fila a
 * fila en la muestra y ninguna operación publica el recuento. No se compone en la interfaz —y no
 * podría: sin las dos cifras no hay proporción que pintar—, así que el embudo dice «—» en esa
 * etapa. El día que exista el {@code GET} de actas, esa etapa se llena con su {@code
 * totalElementos} y no con una suma.
 */
@RestController
@RequestMapping(Api.RAIZ + "/fiscalizacion/predial/actas")
@RequiereAcceso(acceso = "fisc_predial", privilegio = Privilegio.REGISTRO)
public class ActaPredialController {

    private final RegistrarActaFiscalizacion actas;

    public ActaPredialController(RegistrarActaFiscalizacion actas) {
        this.actas = actas;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActaFiscalizacionResource registrar(@RequestBody PeticionDeActaPredial peticion) {
        Observacion observacion = observacionDe(peticion.observacion());

        try {
            return ActaFiscalizacionResource.de(
                    actas.registrarPredial(
                            exigirId(peticion.programaId(), "programaId"),
                            exigirId(peticion.contribuyenteId(), "contribuyenteId"),
                            exigirId(peticion.predioId(), "predioId"),
                            fechaDe(peticion.fechaVisita()),
                            exigir(peticion.fiscalizador(), "fiscalizador"),
                            hallazgoDe(peticion.hallazgo()),
                            areaDe(peticion.areaHallada()),
                            peticion.detalle(),
                            observacion));
        } catch (RegistrarActaFiscalizacion.ProgramaInexistente
                | RegistrarActaFiscalizacion.ProgramaDeOtroTipo problema) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(problema));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    // ------------------------------------------------------------------

    private static @Nullable Hallazgo hallazgoDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return Hallazgo.valueOf(texto.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Hallazgo desconocido: '" + texto + "'");
        }
    }

    private static @Nullable BigDecimal areaDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(texto.strip());
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El area hallada no es un numero valido");
        }
    }

    private static Observacion observacionDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Toda modificacion exige la observacion del usuario: sin ella no se guarda");
        }
        try {
            return Observacion.de(texto);
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalida));
        }
    }

    private static LocalDate fechaDe(@Nullable String texto) {
        try {
            return LocalDate.parse(exigir(texto, "fechaVisita").strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + texto + "'");
        }
    }

    private static long exigirId(@Nullable Long valor, String campo) {
        if (valor == null || valor < 1) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor;
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /** El cuerpo de un acta predial. <b>Lista blanca</b>: lo que no está aquí no entra. */
    public record PeticionDeActaPredial(
            @Nullable String observacion,
            @Nullable Long programaId,
            @Nullable Long contribuyenteId,
            @Nullable Long predioId,
            @Nullable String fechaVisita,
            @Nullable String fiscalizador,
            @Nullable String hallazgo,
            @Nullable String areaHallada,
            @Nullable String detalle) {}
}
