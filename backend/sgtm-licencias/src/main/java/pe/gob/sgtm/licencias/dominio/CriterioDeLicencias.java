package pe.gob.sgtm.licencias.dominio;

import java.util.Set;
import org.jspecify.annotations.Nullable;

/**
 * Por que se busca en la grilla de licencias (#44, RF-110).
 *
 * <p>Son los cinco filtros que la pantalla {@code licencia_funcionamiento} declara. Tres son del
 * propio contexto —numero, expediente, denominacion comercial— y uno mas es la direccion; el quinto
 * es el <b>nombre del titular</b>, que no vive aqui: lo resuelve {@code contribuyentes} y llega ya
 * traducido a identificadores.
 *
 * <h2>Nulo y vacio no significan lo mismo en {@link #contribuyentes}</h2>
 *
 * <p>{@code null} es «no se filtro por titular». Un conjunto <b>vacio</b> es «se filtro y no hay
 * ningun contribuyente que se parezca», y entonces el resultado tiene que ser <b>ninguna
 * licencia</b>. Confundirlos es el defecto que la consulta de fichas ya cometio una vez y que su
 * prueba caza: buscar un nombre inexistente devolvia el padron entero.
 *
 * @param numero el numero de la licencia, exacto
 * @param expediente el numero de expediente del tramite, exacto
 * @param nombreComercial prefijo de la denominacion comercial
 * @param direccion prefijo de la direccion del establecimiento
 * @param contribuyentes los titulares que el nombre buscado resolvio; ver arriba
 */
public record CriterioDeLicencias(
        @Nullable String numero,
        @Nullable String expediente,
        @Nullable String nombreComercial,
        @Nullable String direccion,
        @Nullable Set<Long> contribuyentes) {

    public CriterioDeLicencias {
        numero = limpiar(numero);
        expediente = limpiar(expediente);
        nombreComercial = limpiar(nombreComercial);
        direccion = limpiar(direccion);
        if (contribuyentes != null) {
            contribuyentes = Set.copyOf(contribuyentes);
        }
    }

    /** Sin ningun filtro: la grilla recien abierta. */
    public static CriterioDeLicencias ninguno() {
        return new CriterioDeLicencias(null, null, null, null, null);
    }

    /** Se filtro por titular y no hay ninguno: no hay nada que consultar. */
    public boolean sinTitularPosible() {
        Set<Long> ids = contribuyentes;
        return ids != null && ids.isEmpty();
    }

    private static @Nullable String limpiar(@Nullable String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.strip();
        return limpio.isEmpty() ? null : limpio;
    }
}
