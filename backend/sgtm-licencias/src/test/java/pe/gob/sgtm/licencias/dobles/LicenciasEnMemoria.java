package pe.gob.sgtm.licencias.dobles;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.licencias.dominio.CriterioDeLicencias;
import pe.gob.sgtm.licencias.dominio.EstadoDeLicencia;
import pe.gob.sgtm.licencias.dominio.LicenciaDeFuncionamiento;
import pe.gob.sgtm.licencias.dominio.LicenciaRepository;
import pe.gob.sgtm.licencias.dominio.ResumenDelPadronDeLicencias;
import pe.gob.sgtm.licencias.dominio.TipoDeLicencia;

/**
 * Un {@link LicenciaRepository} en memoria.
 *
 * <p><b>Impone la unicidad del numero</b> y lleva su propio correlativo, que es lo que permite
 * probar la traduccion del 409 y que dos emisiones seguidas no compartan numero. Lo que no imita es
 * el {@code REVOKE UPDATE} de V37 —eso solo lo puede demostrar PostgreSQL— ni la serializacion real
 * del contador bajo concurrencia.
 */
public final class LicenciasEnMemoria implements LicenciaRepository {

    private final List<LicenciaDeFuncionamiento> licencias = new ArrayList<>();
    private final Map<Integer, Long> correlativos = new HashMap<>();
    private long siguienteId = 1;

    private boolean revienta;

    /**
     * Un defecto de verdad del servidor, para el contraste de #562.
     *
     * <p>Traducir «falta publicar una cifra» a 422 no puede convertir <b>todo</b> en 422: un fallo
     * del servidor tiene que seguir diciendo que lo es y dejando su incidencia en el registro. Sin
     * este interruptor, una traduccion demasiado ancha pasaria en verde.
     */
    public void reventarAlInsertar() {
        this.revienta = true;
    }

    @Override
    public long siguienteCorrelativo(Ejercicio ejercicio) {
        long siguiente = correlativos.getOrDefault(ejercicio.valor(), 0L) + 1;
        correlativos.put(ejercicio.valor(), siguiente);
        return siguiente;
    }

    @Override
    public LicenciaDeFuncionamiento emitir(LicenciaDeFuncionamiento licencia) {
        if (revienta) {
            throw new IllegalStateException("un defecto de verdad, con su rastro");
        }
        if (porNumero(licencia.numero()).isPresent()) {
            throw new NumeroDuplicado(
                    "Ya existe la licencia " + licencia.numero(),
                    new IllegalStateException("licencia_numero_uq"));
        }
        LicenciaDeFuncionamiento conId =
                new LicenciaDeFuncionamiento(
                        siguienteId++,
                        licencia.numero(),
                        licencia.contribuyenteId(),
                        licencia.predioId(),
                        licencia.fichaId(),
                        licencia.nombreComercial(),
                        licencia.direccion(),
                        licencia.areaSolicitada(),
                        licencia.tipoLicencia(),
                        licencia.zonificacion(),
                        licencia.aforo(),
                        licencia.fechaEmision(),
                        licencia.vigenciaHasta(),
                        licencia.reciboId(),
                        licencia.documentoId(),
                        licencia.expediente(),
                        licencia.fechaExpediente(),
                        licencia.registradoEn(),
                        "prueba",
                        licencia.observacion(),
                        licencia.giros());
        licencias.add(conId);
        return conId;
    }

    @Override
    public Optional<LicenciaDeFuncionamiento> porNumero(String numero) {
        String buscado = numero == null ? "" : numero.strip();
        return licencias.stream().filter(l -> l.numero().equals(buscado)).findFirst();
    }

    @Override
    public Pagina<LicenciaDeFuncionamiento> buscar(
            CriterioDeLicencias criterio, Paginacion paginacion) {
        List<LicenciaDeFuncionamiento> filtradas =
                licencias.stream()
                        .filter(
                                l ->
                                        criterio.numero() == null
                                                || l.numero().equals(criterio.numero()))
                        .filter(
                                l ->
                                        criterio.expediente() == null
                                                || criterio.expediente().equals(l.expediente()))
                        .filter(
                                l ->
                                        criterio.nombreComercial() == null
                                                || l.nombreComercial()
                                                        .startsWith(criterio.nombreComercial()))
                        .filter(
                                l ->
                                        criterio.direccion() == null
                                                || l.direccion().startsWith(criterio.direccion()))
                        .filter(
                                l ->
                                        criterio.contribuyentes() == null
                                                || criterio.contribuyentes()
                                                        .contains(l.contribuyenteId()))
                        .toList();
        return Pagina.de(filtradas, paginacion, filtradas.size());
    }

    /**
     * El padron, sin derivar el estado.
     *
     * <p>El doble <b>no</b> filtra por estado y es deliberado: derivarlo aqui seria escribir por
     * segunda vez la regla que {@code EstadoDeLicencia} ya expresa, y entonces las pruebas que usan
     * este doble comprobarian que las dos copias coinciden en vez de comprobar la de verdad. El
     * padron a una fecha se prueba contra PostgreSQL, en {@code CertificadosYPadronesJdbcTest}.
     */
    @Override
    public Pagina<LicenciaDeFuncionamiento> padron(
            CriterioDeLicencias criterio,
            @Nullable EstadoDeLicencia estado,
            LocalDate aLaFecha,
            Paginacion paginacion) {
        return buscar(criterio, paginacion);
    }

    @Override
    public ResumenDelPadronDeLicencias resumen(
            CriterioDeLicencias criterio, @Nullable EstadoDeLicencia estado, LocalDate aLaFecha) {
        // El doble no pagina: `buscar` devuelve todo lo filtrado y el total es su tamanio. El
        // tamanio de pagina que se le pasa aqui solo tiene que ser uno valido.
        long total = buscar(criterio, Paginacion.de(0, 20, "numero")).totalElementos();
        return new ResumenDelPadronDeLicencias(total, total, 0, 0);
    }

    @Override
    public ConteosDelAno conteosDelAno(
            Ejercicio ejercicio, @Nullable TipoDeLicencia tipo, LocalDate alCierre) {
        List<LicenciaDeFuncionamiento> delAno =
                licencias.stream()
                        .filter(l -> l.fechaEmision().getYear() == ejercicio.valor())
                        .filter(l -> tipo == null || l.tipoLicencia() == tipo)
                        .toList();
        Set<Long> recibos =
                delAno.stream().map(LicenciaDeFuncionamiento::reciboId).collect(Collectors.toSet());
        return new ConteosDelAno(delAno.size(), 0, 0, delAno.size(), recibos);
    }
}
