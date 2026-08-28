package pe.gob.sgtm.parametros.aplicacion;

import java.io.IOException;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Component;
import pe.gob.sgtm.carga.InformeDeImportacion;
import pe.gob.sgtm.carga.InformeDeImportacion.FilaRechazada;
import pe.gob.sgtm.carga.LectorDeFilasCsv;
import pe.gob.sgtm.carga.LectorDeFilasCsv.FilaCsv;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.parametros.dominio.PublicacionDeCuadros;
import pe.gob.sgtm.parametros.dominio.PublicacionDeCuadros.Edicion;

/**
 * Publica un cuadro normativo nacional desde el corpus (D-13, ADR-0017, #188).
 *
 * <p>Es el hermano de {@link PublicarParametros} para lo que no cabe en una fila. {@code
 * PublicarParametros} publica la UIT y los tramos: once filas, cada una con su cifra en el
 * derivado. Un cuadro tiene miles, y su derivado es el archivo mecanico de la fuente —para la tabla
 * vehicular del ejercicio 2026, las 18 043 filas del anexo de la R.M. N.° 008-2026-EF/15 extraidas
 * con {@code extraer_tvr.py}—.
 *
 * <h2>Como se sabe que las cifras son las de la norma</h2>
 *
 * <p>De dos maneras encadenadas, y ninguna es «alguien las tecleo bien»:
 *
 * <ol>
 *   <li>El <b>manifiesto</b> declara la edicion y nombra su archivo del corpus. {@code
 *       docs/10-negocio/verificar-cuadros.mjs} comprueba en cada PR que ese archivo exista, este
 *       {@code VERIFICADO}, y que el documento fuente y las dos firmas del manifiesto sean
 *       exactamente los de su cabecera.
 *   <li>El manifiesto declara ademas el <b>sha256</b> del archivo de filas, y ese sha256 esta
 *       escrito en el propio archivo del corpus. <b>Este proceso lo vuelve a calcular antes de
 *       publicar una sola fila</b> y rechaza la edicion entera si no coincide. Un byte distinto en
 *       el derivado no entra: se investiga.
 * </ol>
 *
 * <p>Por eso este proceso <b>no lleva ninguna cifra dentro</b> (regla 5) y tampoco reproduce
 * ninguna: transporta un archivo cuya huella esta firmada en el corpus.
 *
 * <h2>La credencial y la transaccion</h2>
 *
 * <p>Corre como {@code rol_carga_parametros}, la unica que V55 deja escribir estas tablas, y sin
 * contexto de tenant porque el dato no es de ninguna municipalidad. No hay ningun
 * {@code @Transactional} en este camino: en autocommit cada {@code INSERT} ya es su propia
 * transaccion. Envolver el bucle es el defecto de #328 y de #247 §2 —la fila que revienta se lleva
 * por delante a la valida que la seguia, y con una transaccion envolvente se lleva por delante la
 * corrida entera—. Lo que si hay es un informe.
 *
 * <h2>Abrir, poblar, cerrar</h2>
 *
 * <p>La edicion se abre —una fila de {@code parametro_tributario} con las dos firmas del corpus—,
 * se puebla, y se <b>cierra</b>. Cerrada, el disparador de V55 no admite una fila mas: es lo que
 * hace que componerla en un conjunto sellado congele el cuadro entero y no solo su nombre.
 *
 * <p><b>Volver a correr el mismo manifiesto no duplica.</b> Si la edicion ya esta cerrada, se
 * informa y no se toca. Si quedo abierta —una corrida interrumpida—, se reanuda: las filas que ya
 * estaban las rechaza {@code valor_referencial_uq} una por una y las que faltaban entran.
 *
 * <p>Perfil {@code batch} por lo mismo que los demas procesos de arranque (#202).
 */
@Component
@Profile("batch")
@ConditionalOnProperty("sgtm.publicacion-cuadros.archivo")
@EnableConfigurationProperties(DatosDelCuadro.class)
public class PublicarCuadros implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PublicarCuadros.class);

    private final PublicacionDeCuadros publicacion;
    private final DatosDelCuadro datos;

    public PublicarCuadros(PublicacionDeCuadros publicacion, DatosDelCuadro datos) {
        this.publicacion = publicacion;
        this.datos = datos;
    }

    @Override
    public void run(ApplicationArguments argumentos) throws IOException {
        Path manifiesto = Path.of(datos.archivo());
        InformeDeImportacion informe = publicar(manifiesto);

        for (FilaRechazada rechazada : informe.rechazadas()) {
            log.warn("Fila {} no publicada: {}", rechazada.fila(), rechazada.motivo());
        }
        log.info(
                "Publicacion de cuadros desde {} por {}: {} fila(s) leidas, {} publicada(s), {}"
                        + " rechazada(s)",
                datos.archivo(),
                datos.usuarioDelProceso(),
                informe.totalFilas(),
                informe.nuevas(),
                informe.rechazadas().size());
        log.info("PUBLICADAS={} RECHAZADAS={}", informe.nuevas(), informe.rechazadas().size());
    }

    /**
     * Publica todas las ediciones del manifiesto.
     *
     * <p>El informe cuenta <b>filas del cuadro</b>, no ediciones: es la cifra que interesa a quien
     * corre esto, y la unica que revela una carga a medias.
     */
    InformeDeImportacion publicar(Path manifiesto) throws IOException {
        List<FilaRechazada> rechazadas = new ArrayList<>();
        int publicadas = 0;
        int leidas = 0;

        List<FilaCsv> ediciones;
        try (Reader lectura = Files.newBufferedReader(manifiesto, StandardCharsets.UTF_8)) {
            ediciones = LectorDeFilasCsv.leer(lectura);
        }

        for (FilaCsv fila : ediciones) {
            FilaDelManifiesto edicion;
            try {
                edicion = FilaDelManifiesto.de(fila.campos());
            } catch (IllegalArgumentException e) {
                rechazadas.add(FilaRechazada.de(fila.numeroDeLinea(), e));
                continue;
            }

            Path archivoDeFilas = manifiesto.resolveSibling(edicion.archivoDeFilas());
            try {
                comprobarHuella(archivoDeFilas, edicion.sha256());
            } catch (IOException | IllegalStateException e) {
                rechazadas.add(
                        new FilaRechazada(fila.numeroDeLinea(), String.valueOf(e.getMessage())));
                continue;
            }

            long identificador;
            Edicion yaPublicada = publicacion.edicionPublicada(edicion.llave()).orElse(null);
            if (yaPublicada != null && yaPublicada.cerrada()) {
                rechazadas.add(
                        new FilaRechazada(
                                fila.numeroDeLinea(),
                                "La edicion "
                                        + edicion.llave()
                                        + " ya esta publicada y cerrada; corregirla es publicar"
                                        + " otra edicion, no volver a cargar esta (ADR-0007)"));
                continue;
            } else if (yaPublicada != null) {
                identificador = yaPublicada.id();
                log.info("Se reanuda la edicion abierta {} ({})", identificador, edicion.llave());
            } else {
                identificador =
                        publicacion.abrirEdicion(
                                edicion.cabecera(), edicion.transcribio(), edicion.verifico());
                log.info("Abierta la edicion {} para {}", identificador, edicion.llave());
            }

            Recuento recuento = poblar(identificador, edicion, archivoDeFilas, rechazadas);
            leidas += recuento.leidas();
            publicadas += recuento.publicadas();

            publicacion.cerrar(identificador);
            log.info(
                    "Cerrada la edicion {}: {} fila(s) publicada(s)",
                    identificador,
                    recuento.publicadas());
        }

        return new InformeDeImportacion(leidas, publicadas, rechazadas);
    }

    private Recuento poblar(
            long edicion,
            FilaDelManifiesto manifiesto,
            Path archivoDeFilas,
            List<FilaRechazada> rechazadas)
            throws IOException {
        List<FilaCsv> filas;
        try (Reader lectura = Files.newBufferedReader(archivoDeFilas, StandardCharsets.UTF_8)) {
            filas = LectorDeFilasCsv.leer(lectura);
        }

        int publicadas = 0;
        int leidas = 0;
        for (FilaCsv fila : filas) {
            List<FilaDelCuadroVehicular> delCuadro;
            try {
                delCuadro = FilaDelCuadroVehicular.de(fila.campos(), manifiesto.ejercicio());
            } catch (IllegalArgumentException e) {
                rechazadas.add(FilaRechazada.de(fila.numeroDeLinea(), e));
                continue;
            }
            for (FilaDelCuadroVehicular unaFila : delCuadro) {
                leidas++;
                try {
                    publicacion.agregarValorReferencial(
                            edicion,
                            manifiesto.ejercicio(),
                            unaFila.categoria(),
                            unaFila.marca(),
                            unaFila.modelo(),
                            unaFila.anioFabricacion(),
                            unaFila.valor(),
                            manifiesto.documentoFuente());
                    publicadas++;
                } catch (DuplicateKeyException e) {
                    rechazadas.add(
                            new FilaRechazada(
                                    fila.numeroDeLinea(),
                                    "Ya estaba publicada en esta edicion: "
                                            + unaFila.marca()
                                            + " / "
                                            + unaFila.modelo()
                                            + " / "
                                            + unaFila.anioFabricacion()));
                } catch (DataAccessException e) {
                    // Sin repetir el mensaje crudo de la base (ARQ-04 §5). La causa mas probable es
                    // que la edicion ya este cerrada, o que la credencial no sea la que puede
                    // escribir esta tabla.
                    rechazadas.add(
                            new FilaRechazada(
                                    fila.numeroDeLinea(),
                                    "La base rechazo la fila "
                                            + unaFila.marca()
                                            + " / "
                                            + unaFila.modelo()
                                            + ": revise que la edicion siga abierta y que este"
                                            + " proceso corra como rol_carga_parametros"));
                }
            }
        }
        return new Recuento(leidas, publicadas);
    }

    /**
     * La huella del archivo de filas, recalculada.
     *
     * <p>Es lo unico que separa «las cifras de la norma» de «un CSV que alguien edito»: el sha256
     * esta escrito en el archivo del corpus que la edicion nombra, firmado por dos personas.
     */
    private static void comprobarHuella(Path archivo, String esperado) throws IOException {
        byte[] contenido = Files.readAllBytes(archivo);
        MessageDigest sha256;
        try {
            sha256 = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Esta JVM no trae SHA-256", e);
        }
        String calculado = HexFormat.of().formatHex(sha256.digest(contenido));
        if (!calculado.equals(esperado)) {
            throw new IllegalStateException(
                    "El archivo de filas "
                            + archivo.getFileName()
                            + " no es el que el corpus firmo: se esperaba sha256 "
                            + esperado
                            + " y es "
                            + calculado
                            + ". Un byte distinto en un cuadro normativo se investiga, no se"
                            + " publica");
        }
    }

    private record Recuento(int leidas, int publicadas) {}

    /** Una fila del cuadro, ya analizada: marca, modelo, ano de fabricacion y su valor. */
    record FilaDelCuadroVehicular(
            String categoria, String marca, String modelo, int anioFabricacion, Dinero valor) {

        /** Columnas del anexo: categoria, marca, modelo anterior, modelo, y tres de valor. */
        private static final int COLUMNAS = 7;

        private static final int PRIMERA_COLUMNA_DE_VALOR = 4;

        /** Cuantos anos de fabricacion publica el anexo, uno por columna de valor. */
        private static final int ANIOS_DEL_ANEXO = COLUMNAS - PRIMERA_COLUMNA_DE_VALOR;

        /**
         * Analiza una linea del anexo extraido, que trae <b>tres</b> filas del cuadro.
         *
         * <p>Sus columnas son las del anexo, sin reordenar: {@code categoria, marca, modelo_2025,
         * modelo_2026, valor_2025, valor_2024, valor_2023}. Las tres ultimas son el valor por ano
         * de fabricacion, y el encabezado del anexo las rotula {@code 2025 2024 2023} en ese orden
         * descendente.
         *
         * <p>El modelo que vale es el <b>publicado para el ejercicio del cuadro</b>: la columna del
         * ejercicio anterior puede venir vacia —hay modelos publicados por primera vez— y es el
         * nombre anterior del mismo vehiculo, no otro.
         *
         * <p>Los tres anos <b>no se escriben aqui</b>: se derivan del ejercicio de la edicion. El
         * anexo del ejercicio N publica los anos de fabricacion N-1, N-2 y N-3, que es la forma de
         * la regla del art. 30 del TUO LTM —«antiguedad no mayor de tres anos»— y lo que confirma
         * el propio encabezado del anexo 2026, rotulado {@code 2025 2024 2023}. Escribirlos como
         * literales seria meter en el codigo una cifra que sale de la norma (regla 5).
         */
        static List<FilaDelCuadroVehicular> de(List<String> campos, int ejercicio) {
            if (campos.size() < COLUMNAS) {
                throw new IllegalArgumentException(
                        "La fila del anexo trae "
                                + campos.size()
                                + " columna(s) y hacen falta "
                                + COLUMNAS
                                + ": categoria, marca, el modelo del ejercicio anterior, el modelo"
                                + " del ejercicio, y un valor por cada ano de fabricacion");
            }
            String categoria = campos.get(0).strip();
            String marca = campos.get(1).strip();
            String modelo = campos.get(3).strip();
            if (categoria.isEmpty() || marca.isEmpty() || modelo.isEmpty()) {
                throw new IllegalArgumentException(
                        "La fila del anexo no trae categoria, marca o el modelo publicado para el"
                                + " ejercicio; sin los tres no se puede identificar la fila: el"
                                + " anexo publica «OTROS MODELOS» en cada categoria con un valor"
                                + " distinto");
            }
            List<FilaDelCuadroVehicular> filas = new ArrayList<>(ANIOS_DEL_ANEXO);
            for (int desplazamiento = 1; desplazamiento <= ANIOS_DEL_ANEXO; desplazamiento++) {
                filas.add(
                        new FilaDelCuadroVehicular(
                                categoria,
                                marca,
                                modelo,
                                ejercicio - desplazamiento,
                                importe(
                                        campos.get(
                                                PRIMERA_COLUMNA_DE_VALOR + desplazamiento - 1))));
            }
            return List.copyOf(filas);
        }

        /**
         * El importe tal como lo imprime la norma, con coma de miles y sin decimales.
         *
         * <p>Se le quita la coma y nada mas: no se redondea, no se escala y no se convierte de
         * unidad. Convertir unidades es exactamente lo que la transcripcion prohibe.
         */
        private static Dinero importe(String celda) {
            String limpio = celda.strip().replace(",", "");
            if (limpio.isEmpty()) {
                throw new IllegalArgumentException(
                        "La fila del anexo trae una celda de valor vacia; una celda que falta no"
                                + " vale cero (#48)");
            }
            try {
                return new Dinero(new BigDecimal(limpio));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("«" + celda + "» no es un importe del anexo", e);
            }
        }
    }
}
