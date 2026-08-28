package pe.gob.sgtm.licencias.dobles;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.licencias.dominio.CriterioDeLicencias;
import pe.gob.sgtm.licencias.dominio.LicenciaDeFuncionamiento;
import pe.gob.sgtm.licencias.dominio.LicenciaRepository;

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

    @Override
    public long siguienteCorrelativo(Ejercicio ejercicio) {
        long siguiente = correlativos.getOrDefault(ejercicio.valor(), 0L) + 1;
        correlativos.put(ejercicio.valor(), siguiente);
        return siguiente;
    }

    @Override
    public LicenciaDeFuncionamiento emitir(LicenciaDeFuncionamiento licencia) {
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
}
