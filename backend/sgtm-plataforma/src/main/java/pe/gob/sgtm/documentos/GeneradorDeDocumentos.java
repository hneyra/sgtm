package pe.gob.sgtm.documentos;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Convierte un modelo en el documento del formato que se pida.
 *
 * <p>Un solo sitio elige el renderizador, para que ningun caso de uso conozca ninguno. Anadir un
 * formato es anadir un {@link Renderizador} al contexto de Spring; no hay que tocar esta clase ni
 * ninguna de las que generan documentos.
 *
 * <p><b>Ninguna dependencia externa.</b> RTF y SpreadsheetML son texto plano, y el PDF se escribe a
 * mano por una razon concreta: los bytes tienen que ser deterministas para que reimprimir de aqui a
 * diez anos devuelva <i>exactamente</i> el mismo archivo, y las bibliotecas de PDF escriben la
 * fecha de creacion dentro. Ver {@link RenderizadorPdf}.
 */
@Component
public class GeneradorDeDocumentos {

    private final Map<FormatoDeDocumento, Renderizador> renderizadores =
            new EnumMap<>(FormatoDeDocumento.class);
    private final PuntoDeFirma firma;

    public GeneradorDeDocumentos(List<Renderizador> disponibles) {
        this(disponibles, PuntoDeFirma.SIN_FIRMA);
    }

    public GeneradorDeDocumentos(List<Renderizador> disponibles, PuntoDeFirma firma) {
        this.firma = firma;
        for (Renderizador renderizador : disponibles) {
            Renderizador anterior = renderizadores.put(renderizador.formato(), renderizador);
            if (anterior != null) {
                throw new IllegalStateException(
                        "Hay dos renderizadores para "
                                + renderizador.formato()
                                + ": el documento saldria de uno u otro segun el orden en que"
                                + " Spring los descubra, que no es estable");
            }
        }
        for (FormatoDeDocumento formato : FormatoDeDocumento.values()) {
            if (!renderizadores.containsKey(formato)) {
                throw new FormatoSinRenderizador(formato);
            }
        }
    }

    /**
     * El documento completo en memoria.
     *
     * <p>Para uno solo, que es lo que pide una pantalla. Para miles, {@link #escribir}.
     */
    public byte[] generar(ModeloDeDocumento modelo, FormatoDeDocumento formato) {
        ByteArrayOutputStream memoria = new ByteArrayOutputStream();
        escribir(modelo, formato, memoria);
        return memoria.toByteArray();
    }

    /**
     * El documento directamente sobre un flujo.
     *
     * <p>Es el camino de la emision masiva: cada documento se escribe y se olvida. Con {@link
     * #generar} en un bucle, emitir el padron entero significaria tenerlo entero en memoria.
     *
     * <p>La firma no pasa por aqui, y es una consecuencia que conviene ver: firmar exige el
     * documento completo, asi que un documento firmado no se puede transmitir mientras se genera.
     * Mientras D-05 siga abierta no importa; cuando se cierre, sera una decision con nombre.
     */
    public void escribir(
            ModeloDeDocumento modelo, FormatoDeDocumento formato, OutputStream salida) {
        try {
            renderizador(formato).escribir(modelo, salida);
        } catch (IOException fallo) {
            throw new UncheckedIOException(fallo);
        }
    }

    /** El documento firmado, cuando D-05 se cierre; hoy, el mismo documento. */
    public byte[] generarFirmado(ModeloDeDocumento modelo, FormatoDeDocumento formato) {
        return firma.firmar(generar(modelo, formato), formato);
    }

    /**
     * El resumen del documento generado.
     *
     * <p>Es lo que convierte «reimprimir devuelve lo mismo» en algo que se puede comprobar, en vez
     * de en algo que se afirma.
     */
    public String resumenDe(ModeloDeDocumento modelo, FormatoDeDocumento formato) {
        return resumenDe(generar(modelo, formato));
    }

    public static String resumenDe(byte[] documento) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(documento));
        } catch (NoSuchAlgorithmException imposible) {
            throw new IllegalStateException("Toda JVM trae SHA-256", imposible);
        }
    }

    private Renderizador renderizador(FormatoDeDocumento formato) {
        Renderizador renderizador = renderizadores.get(formato);
        if (renderizador == null) {
            throw new FormatoSinRenderizador(formato);
        }
        return renderizador;
    }

    /**
     * Falta el renderizador de un formato que el manual promete.
     *
     * <p>Se comprueba al arrancar y no al pedir el documento: el manual promete los tres en las 231
     * figuras, asi que descubrir que falta uno cuando un usuario lo pide es descubrirlo tarde.
     */
    public static final class FormatoSinRenderizador extends IllegalStateException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        FormatoSinRenderizador(FormatoDeDocumento formato) {
            super(
                    "No hay renderizador para "
                            + formato
                            + ", y el manual promete los tres formatos en todo reporte (RF-132)");
        }
    }
}
