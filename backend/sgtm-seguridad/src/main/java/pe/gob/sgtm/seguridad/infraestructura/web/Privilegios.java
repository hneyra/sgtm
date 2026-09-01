package pe.gob.sgtm.seguridad.infraestructura.web;

import java.util.Arrays;
import java.util.Locale;
import pe.gob.sgtm.autorizacion.Privilegio;

/**
 * El vocabulario cerrado de los siete privilegios, leido en un solo sitio (#583).
 *
 * <p>Entra por dos conductos —el cuerpo del {@code PUT} que fija los niveles de un grupo y el
 * filtro {@code privilegio} de «quien tiene X sobre Y»— y en los dos tiene que decir lo mismo. Con
 * dos lecturas separadas, una acabaria admitiendo una palabra que la otra rechaza; peor aun, la
 * salida comoda ante una discrepancia es normalizar —quitar tildes, cambiar guiones por
 * subrayados—, y eso convierte «parecerse» en «serlo», que es lo que #427 se nego a hacer con
 * «ACTIVA» y VIGENTE y #542 con los tipos de transferencia.
 *
 * <p>El mensaje enumera los siete a proposito: quien mando un nombre que no existe necesita saber
 * cuales hay, no que fallo. Y no se contesta la lista vacia, que es lo que devolveria un filtro que
 * no case con nada y se leeria como «nadie tiene ese privilegio».
 */
final class Privilegios {

    private Privilegios() {}

    /**
     * El privilegio con ese nombre.
     *
     * @throws IllegalArgumentException si no es ninguno de los siete; el borde lo traduce a 422
     */
    static Privilegio de(String nombre) {
        try {
            return Privilegio.valueOf(nombre.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Privilegio desconocido: '"
                            + nombre
                            + "'. Los siete son "
                            + Arrays.toString(Privilegio.values()));
        }
    }
}
