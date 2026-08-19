package pe.gob.sgtm.catastro.infraestructura.web;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.ActualizarFichaCatastral;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.CategoriasConstructivas;
import pe.gob.sgtm.catastro.dominio.Construccion;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.OrigenDeLaFicha;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Actualizacion del catastro: {@code PUT /api/v1/catastro/fichas/{codigo}/actualizacion}.
 *
 * <p><b>El primer endpoint de escritura del sistema.</b> Tres cosas que conviene mirar:
 *
 * <ol>
 *   <li><b>La observacion viene en el cuerpo y es obligatoria.</b> Sin ella no se guarda (regla 10,
 *       RNF-052). No es una validacion de cortesia: {@link Observacion} exige que diga algo, y la
 *       columna es {@code NOT NULL}.
 *   <li><b>{@code PUT} no significa sobrescribir.</b> El verbo lo fija el contrato; lo que hace por
 *       debajo es crear la version siguiente y cerrar la anterior. La ficha de ayer sigue entera.
 *   <li><b>El cuerpo solo lleva lo que la opcion declara.</b> Nada de aceptar un mapa y volcarlo:
 *       un campo que la pantalla no pide no entra por aqui.
 * </ol>
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/fichas")
@RequiereAcceso(acceso = "actualizacion_catastro", privilegio = Privilegio.MODIFICACION)
public class ActualizacionController {

    private final ActualizarFichaCatastral fichas;
    private final CatastroRepository catastro;
    private final Clock reloj;

    public ActualizacionController(
            ActualizarFichaCatastral fichas, CatastroRepository catastro, Clock reloj) {
        this.fichas = fichas;
        this.catastro = catastro;
        this.reloj = reloj;
    }

    @PutMapping("/{codigo}/actualizacion")
    public FichaResource actualizar(
            @PathVariable String codigo, @RequestBody PeticionDeActualizacion peticion) {

        Observacion observacion = observacionDe(peticion.observacion());
        Predio predio = predioDe(codigo);
        long predioId = Objects.requireNonNull(predio.id(), "El predio leido tiene identificador");

        LocalDate desde =
                peticion.vigenciaDesde() == null
                        ? LocalDate.now(reloj)
                        : parsear(peticion.vigenciaDesde());

        FichaCatastral nueva =
                fichas.actualizar(
                        predioId,
                        TipoFicha.UNICA,
                        desde,
                        origenDe(peticion.origen()),
                        exigir(peticion.documentoOrigen(), "documentoOrigen"),
                        construccionesDe(peticion.construcciones()),
                        null,
                        observacion);

        return FichaResource.de(nueva);
    }

    // ------------------------------------------------------------------

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

    private Predio predioDe(String codigo) {
        CodigoReferenciaCatastral referencia;
        try {
            referencia = CodigoReferenciaCatastral.de(codigo);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
        return catastro.predioPorCodigo(referencia)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun predio con ese codigo de referencia"
                                                + " catastral"));
    }

    private static @Nullable List<Construccion> construccionesDe(
            @Nullable List<ConstruccionDeclarada> declaradas) {
        // Nulo significa «lo mismo que tenia»: la copia es el comportamiento por omision.
        if (declaradas == null) {
            return null;
        }
        List<Construccion> construcciones = new ArrayList<>();
        for (ConstruccionDeclarada declarada : declaradas) {
            construcciones.add(
                    Construccion.en(
                            exigir(declarada.piso(), "piso"),
                            areaDe(declarada.areaConstruida()),
                            categoriasDe(declarada)));
        }
        return List.copyOf(construcciones);
    }

    private static CategoriasConstructivas categoriasDe(ConstruccionDeclarada declarada) {
        try {
            return new CategoriasConstructivas(
                    letra(declarada.categoriaMuros()),
                    letra(declarada.categoriaTechos()),
                    letra(declarada.categoriaPisos()),
                    letra(declarada.categoriaPuertas()),
                    letra(declarada.categoriaRevestimientos()),
                    letra(declarada.categoriaBanios()),
                    letra(declarada.categoriaInstalaciones()));
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalida));
        }
    }

    private static @Nullable Character letra(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        String limpio = texto.strip();
        if (limpio.length() != 1) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Una categoria es una sola letra: '" + texto + "'");
        }
        return Character.toUpperCase(limpio.charAt(0));
    }

    private static AreaM2 areaDe(@Nullable String texto) {
        try {
            return new AreaM2(new BigDecimal(exigir(texto, "areaConstruida")));
            // NumberFormatException es una IllegalArgumentException, asi que un multi-catch
            // con las dos no compila: la segunda ya cubre a la primera.
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El area construida no es un numero valido");
        }
    }

    private static OrigenDeLaFicha origenDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            // El caso normal de esta pantalla: el contribuyente declara.
            return OrigenDeLaFicha.DECLARACION_JURADA;
        }
        try {
            return OrigenDeLaFicha.valueOf(texto.strip().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Origen de ficha desconocido: '" + texto + "'");
        }
    }

    private static LocalDate parsear(String fecha) {
        try {
            return LocalDate.parse(fecha);
        } catch (java.time.format.DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + fecha + "'");
        }
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    /**
     * El mensaje de una excepcion es {@code @Nullable} para el verificador. Aqui nunca lo es —los
     * objetos de valor siempre explican por que rechazan—, pero decirlo con un texto de reserva
     * cuesta menos que discutirlo.
     */
    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /**
     * El cuerpo de la actualizacion. <b>Lista blanca</b>: lo que no esta aqui no entra, aunque
     * llegue en el JSON.
     */
    public record PeticionDeActualizacion(
            @Nullable String observacion,
            @Nullable String documentoOrigen,
            @Nullable String origen,
            @Nullable String vigenciaDesde,
            @Nullable List<ConstruccionDeclarada> construcciones) {}

    /** Una construccion declarada: medidas y categorias. Ningun importe (regla 5). */
    public record ConstruccionDeclarada(
            @Nullable String piso,
            @Nullable String areaConstruida,
            @Nullable String categoriaMuros,
            @Nullable String categoriaTechos,
            @Nullable String categoriaPisos,
            @Nullable String categoriaPuertas,
            @Nullable String categoriaRevestimientos,
            @Nullable String categoriaBanios,
            @Nullable String categoriaInstalaciones) {}
}
