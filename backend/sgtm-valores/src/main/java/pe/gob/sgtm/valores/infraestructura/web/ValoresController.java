package pe.gob.sgtm.valores.infraestructura.web;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.valores.aplicacion.IniciarCorridaMasiva;
import pe.gob.sgtm.valores.aplicacion.RegistrarValor;
import pe.gob.sgtm.valores.dominio.CriterioDeValor;
import pe.gob.sgtm.valores.dominio.SelectorDeObligacion;
import pe.gob.sgtm.valores.dominio.TipoValor;
import pe.gob.sgtm.valores.dominio.Valor;
import pe.gob.sgtm.valores.dominio.ValorMasivo;
import pe.gob.sgtm.valores.dominio.ValorRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Generacion individual, masiva y busqueda de valores: {@code POST/GET /api/v1/valores} y {@code
 * POST /api/v1/valores/masivo} (RF-090, RF-091, RF-092).
 *
 * <p>Un valor emitido no se corrige, se anula (regla 4): este controlador no tiene ningun {@code
 * PUT} ni {@code PATCH}.
 *
 * <p>{@link #generarMasivo} solo registra la etapa "criterio" (#38): la generacion en si -leer la
 * deuda de cada candidato y emitir su valor- corre en el perfil batch (ADR-0003), aparte de esta
 * peticion web, para que una corrida de miles de contribuyentes no compita con la caja por el mismo
 * proceso.
 */
@RestController
@RequestMapping(Api.RAIZ + "/valores")
public class ValoresController {

    private static final String ORDEN_POR_OMISION = "fechaEmision";

    private final RegistrarValor registrar;
    private final ValorRepository repositorio;
    private final DirectorioDeContribuyentes contribuyentes;
    private final IniciarCorridaMasiva iniciarMasivo;

    public ValoresController(
            RegistrarValor registrar,
            ValorRepository repositorio,
            DirectorioDeContribuyentes contribuyentes,
            IniciarCorridaMasiva iniciarMasivo) {
        this.registrar = registrar;
        this.repositorio = repositorio;
        this.contribuyentes = contribuyentes;
        this.iniciarMasivo = iniciarMasivo;
    }

    @PostMapping
    @RequiereAcceso(acceso = "valores_individual", privilegio = Privilegio.REGISTRO)
    public ResponseEntity<ValorResource> emitir(@RequestBody PeticionDeValor peticion) {
        TipoValor tipo = tipoDe(peticion.tipo());
        ResumenDeContribuyente contribuyente = contribuyenteDe(peticion.codContribuyente());
        List<SelectorDeObligacion> obligaciones = obligacionesDe(peticion.obligaciones());
        Observacion observacion = observacionDe(peticion.observacion());

        try {
            Valor guardado = registrar.emitir(tipo, contribuyente.id(), obligaciones, observacion);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ValorResource.de(guardado, contribuyente));
        } catch (RegistrarValor.SinObligaciones | RegistrarValor.ObligacionSinDeuda invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    @PostMapping("/masivo")
    @RequiereAcceso(acceso = "valores_masivo", privilegio = Privilegio.REGISTRO)
    public ResponseEntity<ValorMasivoResource> generarMasivo(
            @RequestBody PeticionDeValorMasivo peticion) {
        TipoValor tipo = tipoDe(peticion.tipo());
        Ejercicio ejercicioDesde =
                ejercicioRequeridoDe(peticion.ejercicioDesde(), "ejercicioDesde");
        Ejercicio ejercicioHasta =
                ejercicioRequeridoDe(peticion.ejercicioHasta(), "ejercicioHasta");
        LocalDate fechaCriterio = fechaOpcionalDe(peticion.fechaCriterio());
        String tributo = vacioAnulo(peticion.tributo());
        Observacion observacion = observacionDe(peticion.observacion());

        List<String> contribuyentes = peticion.contribuyentes();
        String archivoCsv = peticion.archivoCsv();
        boolean tieneSeleccion = contribuyentes != null && !contribuyentes.isEmpty();
        boolean tieneArchivo = archivoCsv != null && !archivoCsv.isBlank();
        if (tieneSeleccion == tieneArchivo) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Se necesita 'contribuyentes' (seleccion) o 'archivoCsv' (importacion), y solo"
                            + " uno de los dos");
        }

        try {
            ValorMasivo corrida =
                    tieneSeleccion
                            ? iniciarMasivo.porSeleccion(
                                    tipo,
                                    tributo,
                                    ejercicioDesde,
                                    ejercicioHasta,
                                    fechaCriterio,
                                    Objects.requireNonNull(contribuyentes),
                                    observacion)
                            : porImportacion(
                                    tipo,
                                    tributo,
                                    ejercicioDesde,
                                    ejercicioHasta,
                                    fechaCriterio,
                                    Objects.requireNonNull(archivoCsv),
                                    observacion);
            return ResponseEntity.status(HttpStatus.CREATED).body(ValorMasivoResource.de(corrida));
        } catch (IniciarCorridaMasiva.SinCandidatos vacio) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(vacio));
        } catch (IniciarCorridaMasiva.CandidatosInvalidos invalidos) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, mensajeDe(invalidos), invalidos.motivos());
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    @GetMapping
    @RequiereAcceso(acceso = "valores_busqueda", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<ValorResource> buscar(
            @RequestParam(required = false) @Nullable String nroDeValor,
            @RequestParam(required = false) @Nullable String codContribuyente,
            @RequestParam(required = false) @Nullable String tipo,
            @RequestParam(required = false) @Nullable String ejercicio,
            ParametrosDePaginacion paginacion) {

        Long contribuyenteId = null;
        if (codContribuyente != null && !codContribuyente.isBlank()) {
            Optional<ResumenDeContribuyente> encontrado =
                    contribuyentes.porCodigo(codContribuyente.strip());
            if (encontrado.isEmpty()) {
                // Un codigo que no existe no es una peticion mal formada: es un padron sin ese
                // contribuyente, igual que consulta_deuda (#25).
                return RespuestaPaginada.de(
                        Pagina.vacia(paginacion.aPaginacion(ORDEN_POR_OMISION)));
            }
            contribuyenteId = encontrado.get().id();
        }

        CriterioDeValor criterio =
                new CriterioDeValor(
                        vacioAnulo(nroDeValor),
                        contribuyenteId,
                        tipoOpcionalDe(tipo),
                        ejercicioDe(ejercicio));

        Pagina<Valor> pagina =
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION));
        Map<Long, ResumenDeContribuyente> nombres =
                contribuyentes.porIds(
                        pagina.contenido().stream()
                                .map(Valor::contribuyenteId)
                                .collect(Collectors.toSet()));

        return RespuestaPaginada.de(
                pagina, v -> ValorResource.de(v, nombres.get(v.contribuyenteId())));
    }

    // ------------------------------------------------------------------

    private static TipoValor tipoDe(@Nullable String texto) {
        String valor = exigir(texto, "tipo");
        try {
            return TipoValor.porCodigo(valor);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    private static @Nullable TipoValor tipoOpcionalDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return TipoValor.porCodigo(texto);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    private static @Nullable Integer ejercicioDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(texto.strip());
        } catch (NumberFormatException invalido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo 'ejercicio' no es un numero: '" + texto + "'");
        }
    }

    private static Ejercicio ejercicioRequeridoDe(@Nullable Integer valor, String campo) {
        if (valor == null) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        try {
            return new Ejercicio(valor);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    private static @Nullable LocalDate fechaOpcionalDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException invalida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo 'fechaCriterio' no es una fecha ISO valida: '" + texto + "'");
        }
    }

    private ValorMasivo porImportacion(
            TipoValor tipo,
            @Nullable String tributo,
            Ejercicio ejercicioDesde,
            Ejercicio ejercicioHasta,
            @Nullable LocalDate fechaCriterio,
            String archivoCsvBase64,
            Observacion observacion) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(archivoCsvBase64.strip());
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El campo 'archivoCsv' no es base64 valido");
        }
        try (Reader lector =
                new InputStreamReader(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8)) {
            return iniciarMasivo.porImportacion(
                    tipo,
                    tributo,
                    ejercicioDesde,
                    ejercicioHasta,
                    fechaCriterio,
                    lector,
                    observacion);
        } catch (IOException fallo) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "No se pudo leer el archivo importado");
        }
    }

    private ResumenDeContribuyente contribuyenteDe(@Nullable String codigo) {
        String valor = exigir(codigo, "codContribuyente");
        return contribuyentes
                .porCodigo(valor)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun contribuyente con el codigo '"
                                                + valor
                                                + "'"));
    }

    private static List<SelectorDeObligacion> obligacionesDe(
            @Nullable List<PeticionDeValor.PeticionDeObligacion> obligaciones) {
        if (obligaciones == null || obligaciones.isEmpty()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El valor tiene que formalizar al menos una obligacion");
        }
        List<SelectorDeObligacion> selectores = new ArrayList<>(obligaciones.size());
        for (PeticionDeValor.PeticionDeObligacion obligacion : obligaciones) {
            String tributo = exigir(obligacion.tributo(), "obligaciones[].tributo");
            Integer ejercicio = obligacion.ejercicio();
            if (ejercicio == null) {
                throw new ProblemaDeNegocio(
                        CodigoDeError.VALIDACION, "Falta el campo 'obligaciones[].ejercicio'");
            }
            try {
                selectores.add(
                        new SelectorDeObligacion(
                                tributo,
                                new Ejercicio(ejercicio),
                                obligacion.predioId(),
                                obligacion.vehiculoId()));
            } catch (IllegalArgumentException invalido) {
                throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
            }
        }
        return selectores;
    }

    private static Observacion observacionDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Toda emision exige la observacion del usuario: sin ella no se guarda");
        }
        try {
            return Observacion.de(texto);
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalida));
        }
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    private static @Nullable String vacioAnulo(@Nullable String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.strip();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }
}
