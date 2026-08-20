package pe.gob.sgtm.catastro.dominio;

import org.jspecify.annotations.Nullable;

/**
 * Las siete categorias constructivas de una construccion: muros, techos, pisos, puertas,
 * revestimientos, banios e instalaciones.
 *
 * <p><b>Son letras, no importes.</b> La categoria dice a que fila del cuadro de valores unitarios
 * pertenece la partida; cuanto vale esa fila es un valor normativo que cambia cada ejercicio y vive
 * en datos versionados (regla 5). Copiar aqui el importe convertiria la ficha en una foto de los
 * valores del dia en que se registro, y recalcular el pasado dejaria de ser posible.
 *
 * <p>Las letras van de la A a la I. Cuales existen y que valen es D-02a; que sean letras y no
 * cifras es estructura, y eso si esta decidido.
 */
public record CategoriasConstructivas(
        @Nullable Character muros,
        @Nullable Character techos,
        @Nullable Character pisos,
        @Nullable Character puertas,
        @Nullable Character revestimientos,
        @Nullable Character banios,
        @Nullable Character instalaciones) {

    private static final char PRIMERA = 'A';
    private static final char ULTIMA = 'I';

    public CategoriasConstructivas {
        validar("muros", muros);
        validar("techos", techos);
        validar("pisos", pisos);
        validar("puertas", puertas);
        validar("revestimientos", revestimientos);
        validar("banios", banios);
        validar("instalaciones", instalaciones);
    }

    /** Ninguna categoria declarada. Es lo normal en un terreno sin construir. */
    public static CategoriasConstructivas ninguna() {
        return new CategoriasConstructivas(null, null, null, null, null, null, null);
    }

    /** Las siete iguales: el caso de una construccion homogenea, y el mas comodo de probar. */
    public static CategoriasConstructivas todas(char categoria) {
        return new CategoriasConstructivas(
                categoria, categoria, categoria, categoria, categoria, categoria, categoria);
    }

    private static void validar(String partida, @Nullable Character categoria) {
        if (categoria == null) {
            return;
        }
        if (categoria < PRIMERA || categoria > ULTIMA) {
            throw new IllegalArgumentException(
                    "La categoria de "
                            + partida
                            + " va de "
                            + PRIMERA
                            + " a "
                            + ULTIMA
                            + ": '"
                            + categoria
                            + "'");
        }
    }

    /** Cuantas partidas se declararon. Una construccion sin ninguna no se puede valorizar. */
    public int declaradas() {
        int cuantas = 0;
        for (Character categoria :
                new Character[] {
                    muros, techos, pisos, puertas, revestimientos, banios, instalaciones
                }) {
            if (categoria != null) {
                cuantas++;
            }
        }
        return cuantas;
    }

    @Override
    public String toString() {
        return "["
                + texto(muros)
                + texto(techos)
                + texto(pisos)
                + texto(puertas)
                + texto(revestimientos)
                + texto(banios)
                + texto(instalaciones)
                + "]";
    }

    private static String texto(@Nullable Character categoria) {
        return categoria == null ? "-" : String.valueOf(categoria);
    }
}
