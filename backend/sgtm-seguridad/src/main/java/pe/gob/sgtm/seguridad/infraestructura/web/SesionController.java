package pe.gob.sgtm.seguridad.infraestructura.web;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarSesion;
import pe.gob.sgtm.seguridad.aplicacion.PermisosDeLaSesion;
import pe.gob.sgtm.seguridad.dominio.ConsultaDeAuditoria;
import pe.gob.sgtm.seguridad.dominio.RegistroAuditado;
import pe.gob.sgtm.seguridad.dominio.Respaldo;
import pe.gob.sgtm.seguridad.dominio.Sesion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Sesion, auditoria y respaldos: las cuatro operaciones que cierran el modulo de seguridad (RF-124
 * a RF-126).
 */
@RestController
public class SesionController {

    private final AdministrarSesion administrar;
    private final PermisosDeLaSesion permisos;

    public SesionController(AdministrarSesion administrar, PermisosDeLaSesion permisos) {
        this.administrar = administrar;
        this.permisos = permisos;
    }

    /**
     * La matriz de permisos efectivos del usuario en curso: por cada opcion del catalogo sobre la
     * que tiene algun privilegio, la lista de privilegios (RF-121, ADR-0013). La interfaz la usa
     * para dibujar el menu.
     *
     * <p><b>No es una opcion del catalogo</b>: leer los permisos propios no revela nada que no se
     * pueda enumerar probando cada endpoint (REQ-03 §5). Por eso declara el centinela {@link
     * RequiereAcceso#SESION_PROPIA}, que el guardia deja pasar con solo un token valido. Un usuario
     * sin ningun permiso recibe {@code {}}, no un 403.
     */
    @GetMapping(Api.RAIZ + "/seguridad/sesion/permisos")
    @RequiereAcceso(acceso = RequiereAcceso.SESION_PROPIA, privilegio = Privilegio.LECTURA)
    public Map<String, List<String>> permisosDeLaSesion() {
        Map<String, List<String>> salida = new LinkedHashMap<>();
        permisos.efectivos()
                .forEach(
                        (opcion, privilegios) ->
                                salida.put(
                                        opcion,
                                        privilegios.stream()
                                                .sorted()
                                                .map(Privilegio::columna)
                                                .toList()));
        return salida;
    }

    /**
     * Cambia el ejercicio de trabajo de la sesion.
     *
     * <p>El cuerpo lleva el ejercicio y la observacion, y nada mas. En particular <b>no lleva
     * municipalidad</b>, ni la lleva la ruta: el contexto sale del token (ADR-0005) y esta pantalla
     * no puede cambiarlo. Hay una regla de ArchUnit que lo verifica sobre todos los controladores.
     */
    @PutMapping(Api.RAIZ + "/seguridad/sesion/ejercicio")
    @RequiereAcceso(acceso = "cambiar_anio", privilegio = Privilegio.ESPECIAL)
    public SesionResource cambiarEjercicio(@RequestBody CambioDeEjercicio cambio) {
        Sesion sesion =
                administrar.cambiarEjercicioDeTrabajo(
                        new Ejercicio(cambio.ejercicio()), Observacion.de(cambio.observacion()));
        return SesionResource.de(sesion);
    }

    /**
     * Inicia el cambio de contrasena.
     *
     * <p><b>No recibe ninguna contrasena, ni la vieja ni la nueva</b>, y esa ausencia es la
     * garantia: no hay forma de que llegue al servidor porque no hay donde ponerla. Lo que devuelve
     * es a donde tiene que ir la interfaz, que es el proveedor de identidad (ADR-0005).
     */
    @PutMapping(Api.RAIZ + "/seguridad/usuarios/{id}/clave")
    @RequiereAcceso(acceso = "cambiar_clave", privilegio = Privilegio.MODIFICACION)
    public CambioDeClaveIniciado cambiarClave(
            @PathVariable("id") long usuario, @RequestBody SolicitudDeCambioDeClave solicitud) {

        String destino =
                administrar.iniciarCambioDeClave(usuario, Observacion.de(solicitud.observacion()));
        return new CambioDeClaveIniciado("PROVEEDOR_DE_IDENTIDAD", destino);
    }

    /**
     * Consulta de auditoria (RF-124).
     *
     * <p>El ejercicio es obligatorio: es la clave de particion, y sin el la consulta recorre todas.
     * Con el volumen que alcanza esta tabla eso es la diferencia entre una pantalla que responde y
     * una que hay que cancelar.
     */
    @GetMapping(Api.RAIZ + "/seguridad/auditoria")
    @RequiereAcceso(acceso = "auditoria", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<AuditoriaResource> auditoria(
            @RequestParam("ejercicio") int ejercicio,
            @RequestParam(name = "usuario", required = false) @Nullable String usuario,
            @RequestParam(name = "tabla", required = false) @Nullable String tabla,
            @RequestParam(name = "operacion", required = false) @Nullable String operacion,
            @RequestParam(name = "desde", required = false) @Nullable LocalDate desde,
            @RequestParam(name = "hasta", required = false) @Nullable LocalDate hasta,
            ParametrosDePaginacion paginacion) {

        ConsultaDeAuditoria consulta =
                new ConsultaDeAuditoria(
                        new Ejercicio(ejercicio), usuario, tabla, operacion, desde, hasta);

        return RespuestaPaginada.de(
                administrar.auditoria(consulta, paginacion.aPaginacion("fecha")),
                AuditoriaResource::de);
    }

    /**
     * Estado de las copias de seguridad (RF-126).
     *
     * <p>Es un {@code POST} porque asi lo declara el contrato, derivado de la pantalla del
     * prototipo; lo que hace es <b>consultar</b>. La aplicacion no ejecuta respaldos: quien los
     * hace es el proceso de despliegue, y darle a {@code sgtm_app} lo que haria falta para
     * respaldar seria deshacer la separacion de privilegios de ARQ-03 §4.
     */
    @PostMapping(Api.RAIZ + "/seguridad/respaldos")
    @RequiereAcceso(acceso = "respaldo", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<RespaldoResource> respaldos(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                administrar.respaldos(paginacion.aPaginacion("inicio")), RespaldoResource::de);
    }

    // ------------------------------------------------------------------

    /** Cuerpo del cambio de ejercicio. Sin municipalidad: no la acepta y no la necesita. */
    public record CambioDeEjercicio(int ejercicio, String observacion) {}

    /** Cuerpo del cambio de clave. <b>Sin ningun campo de contrasena</b>, a proposito. */
    public record SolicitudDeCambioDeClave(String observacion) {}

    public record CambioDeClaveIniciado(String gestionadaPor, String destino) {}

    public record SesionResource(
            long id, long usuarioId, Instant inicio, @Nullable Integer ejercicioDeTrabajo) {

        static SesionResource de(Sesion sesion) {
            return new SesionResource(
                    sesion.id(),
                    sesion.usuarioId(),
                    sesion.inicio(),
                    sesion.ejercicioDeTrabajo() == null
                            ? null
                            : sesion.ejercicioDeTrabajo().valor());
        }
    }

    /** Lo que el manual pide ver: quien, desde que maquina e IP, cuando, sobre que y por que. */
    public record AuditoriaResource(
            long id,
            int ejercicio,
            String tabla,
            String clave,
            String operacion,
            String usuario,
            @Nullable String origenEquipo,
            @Nullable String origenIp,
            Instant fecha,
            String observacion,
            @Nullable String datosAnteriores,
            @Nullable String datosNuevos) {

        static AuditoriaResource de(RegistroAuditado registro) {
            return new AuditoriaResource(
                    registro.id(),
                    registro.ejercicio().valor(),
                    registro.tabla(),
                    registro.clave(),
                    registro.operacion(),
                    registro.usuario(),
                    registro.origenEquipo(),
                    registro.origenIp(),
                    registro.fecha(),
                    registro.observacion(),
                    registro.datosAnteriores(),
                    registro.datosNuevos());
        }
    }

    public record RespaldoResource(
            long id,
            Instant inicio,
            @Nullable Instant fin,
            String resultado,
            String destino,
            @Nullable Long tamanoBytes,
            @Nullable String detalle) {

        static RespaldoResource de(Respaldo respaldo) {
            return new RespaldoResource(
                    respaldo.id(),
                    respaldo.inicio(),
                    respaldo.fin(),
                    respaldo.resultado(),
                    respaldo.destino(),
                    respaldo.tamanoBytes(),
                    respaldo.detalle());
        }
    }
}
