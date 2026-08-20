package pe.gob.sgtm.catastro.aplicacion;

import java.util.ArrayList;
import java.util.List;
import pe.gob.sgtm.catastro.aplicacion.ReporteDeFichaDelContribuyente.Reporte;
import pe.gob.sgtm.catastro.aplicacion.ReporteDeFichaDelContribuyente.UnidadAfecta;
import pe.gob.sgtm.documentos.Campo;
import pe.gob.sgtm.documentos.ModeloDeDocumento;
import pe.gob.sgtm.documentos.Tabla;

/**
 * Convierte la ficha del contribuyente (RF-010) en el modelo neutral de documento.
 *
 * <p>Se escribe <b>una vez</b> y salen los tres formatos. Ese es el trato de RF-132: un reporte
 * nuevo cuesta esta clase, no tres renderizadores.
 *
 * <p><b>Aqui se formatea, y solo aqui.</b> El paquete de documentos recibe texto ya hecho porque no
 * tiene por que saber cuantos decimales lleva un porcentaje —decidirlo alli seria decidir D-03 por
 * la puerta de atras—.
 */
public final class ModeloDeLaFichaDelContribuyente {

    private ModeloDeLaFichaDelContribuyente() {}

    public static ModeloDeDocumento de(Reporte reporte) {
        List<Campo> cabecera =
                List.of(
                        Campo.de("Código de contribuyente", reporte.contribuyente().codigo()),
                        Campo.de("Nombre o razón social", reporte.contribuyente().nombre()),
                        Campo.de("Documento", reporte.contribuyente().documento()),
                        Campo.de(
                                "Domicilio fiscal",
                                reporte.domicilioFiscal() == null
                                        ? "No registrado"
                                        : reporte.domicilioFiscal()));

        List<List<String>> filas = new ArrayList<>();
        for (UnidadAfecta unidad : reporte.unidades()) {
            filas.add(
                    List.of(
                            unidad.codigo(),
                            unidad.direccion(),
                            unidad.condicion(),
                            unidad.porcentaje().toString(),
                            // Un predio registrado y todavia sin ficha sale asi, no en cero: un
                            // cero se leeria como un terreno de cero metros, que es una cifra.
                            unidad.area() == null ? "Sin ficha" : unidad.area().toString(),
                            unidad.uso() == null ? "—" : unidad.uso()));
        }

        Tabla unidades =
                Tabla.de(
                        "Unidades afectas",
                        List.of(
                                "Cód. referencia catastral",
                                "Dirección",
                                "Condición",
                                "% propiedad",
                                "Área de terreno",
                                "Uso"),
                        filas);

        return new ModeloDeDocumento(
                "Ficha del contribuyente",
                null,
                reporte.aLaFecha(),
                cabecera,
                List.of(unidades),
                // El pie dice lo que el documento NO trae, porque quien lo recibe en ventanilla
                // pregunta justamente por eso.
                List.of(
                        "Este documento no consigna importes: el autovalúo y la deuda se emiten"
                                + " en sus propios valores.",
                        "Los datos corresponden a la fecha indicada arriba."),
                // Duplicado y marca de demostracion, los dos nulos y los dos a proposito:
                // ninguno lo pone quien construye el modelo. El duplicado lo pone
                // EmitirDocumento al reimprimir, y la marca la pone GeneradorDeDocumentos
                // leyendo el regimen de la instalacion (#122).
                null,
                null);
    }
}
