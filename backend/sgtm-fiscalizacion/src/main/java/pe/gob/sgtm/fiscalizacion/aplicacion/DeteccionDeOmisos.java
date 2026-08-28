package pe.gob.sgtm.fiscalizacion.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.LectorDeFichas;
import pe.gob.sgtm.catastro.PadronDePredios;
import pe.gob.sgtm.catastro.PredioDelPadron;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.fiscalizacion.dominio.ComparacionHalladoDeclarado;
import pe.gob.sgtm.fiscalizacion.dominio.CondicionFiscalizada;
import pe.gob.sgtm.fiscalizacion.dominio.FilaDeOmisos;
import pe.gob.sgtm.rentas.DeclaracionDelEjercicio;
import pe.gob.sgtm.rentas.DeclaracionesDelEjercicio;

/**
 * Omisos y subvaluadores: el cruce del padrón de predios contra las declaraciones juradas de un
 * ejercicio ({@code fisc_omisos}, RF-055).
 *
 * <h2>El cruce va por puertos públicos, y solo por ellos</h2>
 *
 * <p>{@link PadronDePredios} de {@code catastro} y {@link DeclaracionesDelEjercicio} de {@code
 * rentas}. Este contexto no lee ni una tabla ajena (ARQ-01 §4), y los dos puertos son de <b>solo
 * lectura</b>: detectar omisos no escribe nada, ni siquiera una marca en el padrón. Lo que sale de
 * aquí es una lista; convertirla en un programa de fiscalización es la acción «Programar
 * fiscalización» de la pantalla, que ya existe desde #45.
 *
 * <h2>Omiso no es extemporáneo, y ése es el AC 3</h2>
 *
 * <p>Quien presentó su declaración fuera de plazo <b>declaró</b>: su condición sale de comparar lo
 * declarado con lo verificado como la de cualquiera, y lo que le corresponde por el retraso es la
 * multa del art. 176 —otra consecuencia, otro procedimiento—. Confundirlas produce determinaciones
 * de oficio sobre contribuyentes que sí presentaron su declaración, y ésas se anulan en
 * reclamación.
 *
 * <p>La distinción no se escribe aquí: la hace {@link ComparacionHalladoDeclarado}, que es una
 * función pura y se puede probar sin base de datos. Esta clase resuelve los dos lados y los pasa.
 *
 * <h2>El «valor catastral verificado» no existe todavía</h2>
 *
 * <p>La pantalla pide cuatro importes —valor catastral, valor declarado, diferencia e impuesto
 * omitido— y los cuatro salen del cuadro de valores unitarios, la tabla de depreciación y el
 * arancel: <b>D-02a</b>, sin firmar (#198). Salen en {@code null}, con su nombre.
 *
 * <p>Lo que sí se compara es la <b>superficie</b>, y de la única forma que es reproducible: el área
 * de la versión de ficha que la declaración jurada <b>referencia</b> —{@code
 * declaracion_jurada.ficha_catastral_id}, desde #28— frente al área de la ficha que el catastro
 * tiene vigente hoy. Si entre una y otra el catastro inscribió una ampliación que el contribuyente
 * nunca declaró, la diferencia sale sola. Es estructura, no depende de ninguna norma, y es
 * exactamente lo que la subvaluación por ampliación no declarada produce.
 *
 * <p>Comparar contra «el área declarada» de un campo suelto no serviría: la declaración jurada no
 * guarda superficies, guarda la ficha que la sustenta. Y comparar la ficha vigente contra sí misma
 * daría {@code CONFORME} siempre.
 */
@Service
public class DeteccionDeOmisos {

    private final PadronDePredios padron;
    private final LectorDeFichas fichas;
    private final DeclaracionesDelEjercicio declaraciones;

    public DeteccionDeOmisos(
            PadronDePredios padron,
            LectorDeFichas fichas,
            DeclaracionesDelEjercicio declaraciones) {
        this.padron = padron;
        this.fichas = fichas;
        this.declaraciones = declaraciones;
    }

    /**
     * La página de contribuyentes detectados.
     *
     * @param ejercicio qué ejercicio se examina
     * @param sectorCodigo filtro opcional de sector
     * @param condicion filtro opcional de condición; {@code null} trae todas las filas, también las
     *     conformes, porque la pantalla ofrece «Todas»
     * @param aLaFecha a qué día se resuelven la titularidad y la ficha vigentes (regla 9)
     */
    @Transactional(readOnly = true)
    public Pagina<FilaDeOmisos> detectar(
            Ejercicio ejercicio,
            @Nullable String sectorCodigo,
            @Nullable CondicionFiscalizada condicion,
            LocalDate aLaFecha,
            Paginacion paginacion) {

        Objects.requireNonNull(ejercicio, "La deteccion necesita el ejercicio que examina");
        Objects.requireNonNull(aLaFecha, "Toda lectura del padron indica a que fecha (regla 9)");

        Pagina<PredioDelPadron> pagina = padron.porSector(sectorCodigo, aLaFecha, paginacion);
        if (pagina.estaVacia()) {
            return new Pagina<>(
                    List.of(), pagina.pagina(), pagina.tamano(), pagina.totalElementos());
        }

        // Una sola lectura de rentas por pagina, no una por fila.
        List<Long> predios = pagina.contenido().stream().map(PredioDelPadron::predioId).toList();
        Map<Long, DeclaracionDelEjercicio> declaradas = declaraciones.dePredios(predios, ejercicio);

        List<FilaDeOmisos> filas = new ArrayList<>();
        for (PredioDelPadron predio : pagina.contenido()) {
            FilaDeOmisos fila =
                    clasificar(
                            predio,
                            ejercicio,
                            Optional.ofNullable(declaradas.get(predio.predioId())));
            if (condicion == null || fila.condicion() == condicion) {
                filas.add(fila);
            }
        }

        // El total es el del padron filtrado por sector, no el de las filas que sobreviven al
        // filtro de condicion: filtrar despues de paginar y ademas recalcular el total daria
        // «pagina 1 de 1» sobre un padron de treinta mil predios.
        return new Pagina<>(filas, pagina.pagina(), pagina.tamano(), pagina.totalElementos());
    }

    // ------------------------------------------------------------------

    private FilaDeOmisos clasificar(
            PredioDelPadron predio,
            Ejercicio ejercicio,
            Optional<DeclaracionDelEjercicio> declarada) {

        ComparacionHalladoDeclarado.LoDeclarado loDeclarado =
                declarada.isEmpty()
                        ? ComparacionHalladoDeclarado.LoDeclarado.nada()
                        : new ComparacionHalladoDeclarado.LoDeclarado(
                                true,
                                declarada.get().fueraDePlazo(),
                                areaQueSustentaLaDeclaracion(declarada.get()),
                                null);

        // Lo «hallado» en un cruce de gabinete es lo que el catastro tiene inscrito: no hay visita.
        ComparacionHalladoDeclarado.LoHallado loHallado =
                ComparacionHalladoDeclarado.LoHallado.de(predio.areaTerreno(), null);

        return new FilaDeOmisos(
                predio.predioId(),
                predio.codigoReferenciaCatastral(),
                predio.sectorCodigo(),
                predio.contribuyenteId(),
                ejercicio,
                ComparacionHalladoDeclarado.condicion(loDeclarado, loHallado),
                declarada.map(DeclaracionDelEjercicio::fueraDePlazo).orElse(false),
                predio.areaTerreno(),
                loDeclarado.area(),
                null,
                null,
                null);
    }

    /**
     * El area de la version de ficha que la declaracion referencia.
     *
     * <p>{@code null} si la declaracion no referencia ninguna: una declaracion sin ficha no se
     * puede contrastar por superficie, y suponer que declaro el area vigente la daria por conforme
     * sin haberla comparado.
     */
    private @Nullable AreaM2 areaQueSustentaLaDeclaracion(DeclaracionDelEjercicio declaracion) {
        Long fichaId = declaracion.fichaCatastralId();
        return fichaId == null ? null : fichas.areaDeLaVersion(fichaId).orElse(null);
    }
}
