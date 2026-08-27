package pe.gob.sgtm.valores.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.documentos.ModeloDeDocumento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.valores.dominio.CriterioDeValor;
import pe.gob.sgtm.valores.dominio.EstadoDeValor;
import pe.gob.sgtm.valores.dominio.TipoValor;
import pe.gob.sgtm.valores.dominio.Valor;
import pe.gob.sgtm.valores.dominio.ValorDetalle;
import pe.gob.sgtm.valores.dominio.ValorRepository;

/**
 * #38 — el modelo impreso de un valor, sin base de datos: lo que se verifica es que no se recalcula
 * nada -{@code aLaFecha} es {@code proyectadoA}, no la fecha en que se imprime- y que cada tipo
 * trae su propio titulo.
 */
@DisplayName("#38 — ConstruirModeloDeValor")
class ConstruirModeloDeValorTest {

    private static final LocalDate PROYECTADO_A = LocalDate.of(2026, 3, 15);
    private static final Observacion OBSERVACION = Observacion.de("Se emite para la prueba");

    @Test
    @DisplayName("el titulo nombra el tipo y el numero; aLaFecha es la fecha congelada, no hoy")
    void elModeloNoRecalculaNada() {
        Valor valor = valorDe(TipoValor.ORDEN_DE_PAGO, "OP-2026-000001");
        RepositorioDeMentira repositorio = new RepositorioDeMentira(valor);
        ContribuyentesDeMentira contribuyentes = new ContribuyentesDeMentira();
        contribuyentes.con(7L, "C-0007", "TITULAR, PRUEBA");

        ModeloDeDocumento modelo = new ConstruirModeloDeValor(repositorio, contribuyentes).de(1L);

        assertThat(modelo.titulo()).contains("ORDEN DE PAGO").contains("OP-2026-000001");
        assertThat(modelo.aLaFecha()).isEqualTo(PROYECTADO_A);
        assertThat(modelo.cabecera())
                .anyMatch(
                        c ->
                                c.etiqueta().equals("Contribuyente")
                                        && c.valor().equals("TITULAR, PRUEBA"));
    }

    @Test
    @DisplayName("la tabla de deuda formalizada trae exactamente el detalle congelado")
    void laTablaTraeElDetalleCongelado() {
        Valor valor = valorDe(TipoValor.RESOLUCION_DE_DETERMINACION, "RD-2026-000001");
        RepositorioDeMentira repositorio =
                new RepositorioDeMentira(
                        valor,
                        ValorDetalle.nuevo(
                                "PREDIAL",
                                new Ejercicio(2025),
                                null,
                                55L,
                                null,
                                null,
                                Dinero.de("1000.00"),
                                Dinero.de("200.00"),
                                Dinero.de("34.56"),
                                Dinero.CERO));
        ContribuyentesDeMentira contribuyentes = new ContribuyentesDeMentira();
        contribuyentes.con(7L, "C-0007", "TITULAR, PRUEBA");

        ModeloDeDocumento modelo = new ConstruirModeloDeValor(repositorio, contribuyentes).de(1L);

        assertThat(modelo.tablas()).hasSize(1);
        assertThat(modelo.tablas().get(0).filas())
                .containsExactly(List.of("PREDIAL", "2025", "1000.00", "200.00", "34.56", "0"));
    }

    private static Valor valorDe(TipoValor tipo, String numero) {
        return new Valor(
                1L,
                tipo,
                numero,
                new Ejercicio(2026),
                7L,
                tipo.baseLegal(),
                Dinero.de("1000.00"),
                Dinero.de("200.00"),
                Dinero.de("34.56"),
                Dinero.CERO,
                PROYECTADO_A,
                EstadoDeValor.EMITIDO,
                PROYECTADO_A,
                "prueba",
                OBSERVACION);
    }

    // ------------------------------------------------------------------

    private static final class RepositorioDeMentira implements ValorRepository {

        private final Valor valor;
        private final List<ValorDetalle> detalle;

        RepositorioDeMentira(Valor valor, ValorDetalle... detalle) {
            this.valor = valor;
            this.detalle = List.of(detalle);
        }

        @Override
        public Valor insertar(Valor valor, List<ValorDetalle> detalle) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Optional<Valor> porNumero(TipoValor tipo, Ejercicio ejercicio, String numero) {
            return Optional.of(valor);
        }

        @Override
        public Optional<Valor> porId(long id) {
            return id == valor.id() ? Optional.of(valor) : Optional.empty();
        }

        @Override
        public List<ValorDetalle> detalleDe(long valorId) {
            return detalle;
        }

        @Override
        public Pagina<Valor> buscar(CriterioDeValor criterio, Paginacion paginacion) {
            throw new UnsupportedOperationException();
        }

        @Override
        public long siguienteCorrelativo(TipoValor tipo, Ejercicio ejercicio) {
            throw new UnsupportedOperationException();
        }
    }

    private static final class ContribuyentesDeMentira implements DirectorioDeContribuyentes {

        private final Map<Long, ResumenDeContribuyente> porId = new HashMap<>();

        void con(long id, String codigo, String nombre) {
            porId.put(id, new ResumenDeContribuyente(id, codigo, nombre, ""));
        }

        @Override
        public List<ResumenDeContribuyente> buscar(String texto, int maximo) {
            return List.copyOf(porId.values());
        }

        @Override
        public Optional<ResumenDeContribuyente> porCodigo(String codigo) {
            return porId.values().stream().filter(c -> c.codigo().equals(codigo)).findFirst();
        }

        @Override
        public Map<Long, ResumenDeContribuyente> porIds(Set<Long> ids) {
            Map<Long, ResumenDeContribuyente> resultado = new HashMap<>();
            for (Long id : ids) {
                if (porId.containsKey(id)) {
                    resultado.put(id, porId.get(id));
                }
            }
            return resultado;
        }

        @Override
        public Optional<String> domicilioFiscalDe(long contribuyenteId, LocalDate fecha) {
            return Optional.empty();
        }
    }
}
