package pe.gob.sgtm.valores.infraestructura.web;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
import pe.gob.sgtm.valores.aplicacion.RegistrarValor;
import pe.gob.sgtm.valores.dominio.CriterioDeValor;
import pe.gob.sgtm.valores.dominio.SelectorDeObligacion;
import pe.gob.sgtm.valores.dominio.TipoValor;
import pe.gob.sgtm.valores.dominio.Valor;
import pe.gob.sgtm.valores.dominio.ValorRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Generacion individual y busqueda de valores: {@code POST/GET /api/v1/valores} (RF-090, RF-092).
 *
 * <p>Un valor emitido no se corrige, se anula (regla 4): este controlador no tiene ningun {@code
 * PUT} ni {@code PATCH}.
 */
@RestController
@RequestMapping(Api.RAIZ + "/valores")
public class ValoresController {

    private static final String ORDEN_POR_OMISION = "fechaEmision";

    private final RegistrarValor registrar;
    private final ValorRepository repositorio;
    private final DirectorioDeContribuyentes contribuyentes;

    public ValoresController(
            RegistrarValor registrar,
            ValorRepository repositorio,
            DirectorioDeContribuyentes contribuyentes) {
        this.registrar = registrar;
        this.repositorio = repositorio;
        this.contribuyentes = contribuyentes;
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
