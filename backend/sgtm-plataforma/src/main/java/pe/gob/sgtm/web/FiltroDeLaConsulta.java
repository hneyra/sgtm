package pe.gob.sgtm.web;

import org.jspecify.annotations.Nullable;

/**
 * Un dato que el contrato declara {@code in: query} y que el controlador tambien acepta en el
 * cuerpo (#399, #425).
 *
 * <h2>Por que existe una sola vez</h2>
 *
 * <p>El contrato esta <b>derivado del prototipo</b> ({@code docs/50-api/generar-openapi.mjs},
 * #312): lo que una pantalla dibuja como {@code filtros} viaja por la URL, en las 134. Un
 * controlador que lea ese mismo dato <b>solo</b> del cuerpo deja a la operacion publicada y a la
 * pantalla sin poder llamarla —la peticion que la interfaz sabe construir llega con el dato nulo, y
 * el backend contesta «falta el objetivo» o, peor, calcula sobre lo que no se le pidio—. Eso es lo
 * que {@code ParametrosDeLaConsultaTest} mide, y lo que #399 corrigio primero en {@code
 * VehicularController} y #425 en las ocho que quedaban.
 *
 * <p>Aceptar el dato <b>ademas</b> en el cuerpo no es un incumplimiento: es lo que deja funcionar
 * al cliente que ya lo mandaba ahi. Lo que no puede es leerse solo de ahi.
 *
 * <p>La regla se escribe aqui y no en cada controlador porque son <b>nueve</b> operaciones las que
 * la aplican, y nueve copias de seis lineas son nueve sitios donde puede divergir —las dos primeras
 * ya divergian: la de {@code PredialController} no recortaba los espacios y la de {@code
 * VehicularController} si—.
 */
public final class FiltroDeLaConsulta {

    private FiltroDeLaConsulta() {}

    /**
     * El valor del cuerpo si lo trae; si no, el de la consulta. Vacio cuenta como que no viene.
     *
     * <p><b>Gana el cuerpo</b>, y no al reves, por compatibilidad: un cliente escrito contra la
     * forma anterior sigue mandandolo ahi y sigue obteniendo lo mismo. La interfaz manda la URL, y
     * cuando manda las dos cosas son el mismo valor.
     *
     * @param delCuerpo lo que trae el {@code @RequestBody}
     * @param deLaConsulta lo que trae el {@code @RequestParam}
     * @return el valor ya recortado, o {@code null} si ninguno de los dos dice nada
     */
    public static @Nullable String primeroNoVacio(
            @Nullable String delCuerpo, @Nullable String deLaConsulta) {
        String cuerpo = recortado(delCuerpo);
        return cuerpo != null ? cuerpo : recortado(deLaConsulta);
    }

    private static @Nullable String recortado(@Nullable String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.strip();
        return limpio.isEmpty() ? null : limpio;
    }
}
