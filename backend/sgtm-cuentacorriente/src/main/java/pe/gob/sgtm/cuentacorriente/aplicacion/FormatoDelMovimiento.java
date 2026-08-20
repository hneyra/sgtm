package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.util.ArrayList;
import java.util.List;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.SentidoDelMovimiento;
import pe.gob.sgtm.documentos.Campo;
import pe.gob.sgtm.documentos.ModeloDeDocumento;
import pe.gob.sgtm.documentos.Tabla;

/**
 * El formato impreso de un alta o una baja de deuda: la nota de abono y la nota de cargo del manual
 * (RF-045, #24).
 *
 * <p>Construye el {@link ModeloDeDocumento} y nada mas. Los tres formatos —PDF, hoja de calculo y
 * RTF— salen de ese modelo sin escribir nada para cada uno (#15), y la reimpresion identica meses
 * despues es del propio {@code EmitirDocumento}: guarda el modelo con que se dibujo y comprueba el
 * resumen al reimprimir.
 *
 * <p><b>Aqui no se redondea nada.</b> Los importes se imprimen tal como se asentaron, con {@code
 * toPlainString}: decidir con cuantos decimales sale un papel oficial es D-03, y este formateador
 * no tiene por que decidirlo por la puerta de atras. El modelo de documento pide texto ya
 * formateado justamente para que la decision se vea donde se toma.
 */
public final class FormatoDelMovimiento {

    private FormatoDelMovimiento() {}

    /** El tipo con que se numera el documento: {@code NA-2026-000001} o {@code NC-2026-000001}. */
    public static String tipoDe(SentidoDelMovimiento sentido) {
        // Los nombres del manual: el alta de deuda es la «nota de abono» y la baja la
        // «nota de cargo». Ver SentidoDelMovimiento para por que no se corrigen.
        return sentido == SentidoDelMovimiento.ALTA ? "NA" : "NC";
    }

    public static ModeloDeDocumento de(
            MovimientoDeDeuda movimiento, List<Asiento> asentados, String codigoContribuyente) {

        List<Campo> cabecera =
                List.of(
                        Campo.de("Contribuyente", codigoContribuyente),
                        Campo.de("Tributo", movimiento.clave().tributo()),
                        Campo.de("Ejercicio", movimiento.clave().ejercicio().toString()),
                        Campo.de("Cuota", Integer.toString(movimiento.clave().periodo())),
                        Campo.de("Fase", movimiento.fase().name()),
                        Campo.de("Documento de origen", movimiento.documentoOrigen()));

        List<List<String>> filas = new ArrayList<>();
        for (Asiento asiento : asentados) {
            filas.add(
                    List.of(
                            asiento.concepto().name(),
                            asiento.tipo().name(),
                            asiento.monto().valor().toPlainString(),
                            asiento.id() == null ? "" : asiento.id().toString()));
        }

        Tabla detalle =
                Tabla.de(
                        "Detalle del movimiento",
                        List.of("Concepto", "Tipo", "Importe", "Asiento"),
                        filas);

        return new ModeloDeDocumento(
                movimiento.sentido() == SentidoDelMovimiento.ALTA
                        ? "Nota de abono — alta de deuda"
                        : "Nota de cargo — baja de deuda",
                "Total: " + movimiento.total().valor().toPlainString(),
                // La fecha valor del movimiento, no la de impresion: es el dia con efecto
                // tributario, y es lo que el papel tiene que poder defender (regla 9).
                movimiento.fechaValor(),
                cabecera,
                List.of(detalle),
                List.of(
                        "Emitido conforme al documento de origen indicado en la cabecera.",
                        "Los importes son los asentados en la cuenta corriente a la fecha valor."),
                null,
                null);
    }
}
