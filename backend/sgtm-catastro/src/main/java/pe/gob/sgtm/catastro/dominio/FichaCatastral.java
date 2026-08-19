package pe.gob.sgtm.catastro.dominio;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Medida;
import pe.gob.sgtm.dominio.Observacion;

/**
 * Una version de la ficha catastral de un predio.
 *
 * <p>La invariante que el manual exige y que aqui es el modelo: <b>modificar una ficha no
 * sobrescribe</b> (cap. 2 §Actualizacion del Catastro). El sistema copia la vigente, crea una
 * version nueva con los datos modificados y registra autor, fecha, hora y observacion. La anterior
 * queda cerrada, entera, con todo lo que colgaba de ella.
 *
 * <p>No es formalismo documental. Una determinacion de 2027 se calculo sobre la ficha que estaba
 * vigente en 2027; si esa ficha se hubiera editado en el sitio, la determinacion ya no se podria
 * reproducir ni defender ante una reclamacion.
 *
 * <p><b>La observacion es obligatoria y esta en el tipo</b>, no en un campo opcional del cuerpo de
 * la peticion: la columna es {@code NOT NULL} y {@link Observacion} valida que diga algo (regla 10,
 * RNF-052).
 *
 * <p>Aqui no se calcula nada. El area se guarda, no se valoriza; el autovaluo es de rentas y esta
 * bloqueado por D-02.
 *
 * @param version empieza en 1 y sube de uno en uno por predio y tipo
 * @param vigenciaHasta nulo mientras la version es la vigente
 */
public record FichaCatastral(
        @Nullable Long id,
        long predioId,
        TipoFicha tipo,
        int version,
        AreaM2 areaTerreno,
        String uso,
        @Nullable Medida frontis,
        @Nullable String condicionPropiedad,
        @Nullable String tipoEdificacion,
        LocalDate vigenciaDesde,
        @Nullable LocalDate vigenciaHasta,
        OrigenDeLaFicha origen,
        String documentoOrigen,
        Observacion observacion,
        List<Construccion> construcciones,
        List<OtraInstalacion> instalaciones) {

    private static final int USO_MAXIMO = 60;
    private static final int DOCUMENTO_MAXIMO = 80;
    private static final int TEXTO_MAXIMO = 40;

    public FichaCatastral {
        Objects.requireNonNull(tipo, "La ficha necesita su tipo");
        Objects.requireNonNull(areaTerreno, "La ficha necesita el area del terreno");
        Objects.requireNonNull(uso, "La ficha necesita el uso del predio");
        Objects.requireNonNull(vigenciaDesde, "La ficha necesita desde cuando rige");
        Objects.requireNonNull(origen, "La ficha necesita decir de donde salio");
        Objects.requireNonNull(documentoOrigen, "La ficha necesita su documento de origen");
        Objects.requireNonNull(
                observacion,
                "Sin observacion no se guarda una version de la ficha (regla 10, RNF-052)");
        Objects.requireNonNull(construcciones, "La lista de construcciones es vacia, no nula");
        Objects.requireNonNull(instalaciones, "La lista de instalaciones es vacia, no nula");

        uso = uso.strip();
        documentoOrigen = documentoOrigen.strip();
        construcciones = List.copyOf(construcciones);
        instalaciones = List.copyOf(instalaciones);

        if (version < 1) {
            throw new IllegalArgumentException("La version de una ficha empieza en 1: " + version);
        }
        if (uso.isEmpty() || uso.length() > USO_MAXIMO) {
            throw new IllegalArgumentException("El uso va de 1 a " + USO_MAXIMO + " caracteres");
        }
        if (documentoOrigen.isEmpty() || documentoOrigen.length() > DOCUMENTO_MAXIMO) {
            throw new IllegalArgumentException(
                    "El documento de origen va de 1 a " + DOCUMENTO_MAXIMO + " caracteres");
        }
        if (condicionPropiedad != null && condicionPropiedad.strip().length() > TEXTO_MAXIMO) {
            throw new IllegalArgumentException(
                    "La condicion de propiedad excede " + TEXTO_MAXIMO + " caracteres");
        }
        if (tipoEdificacion != null && tipoEdificacion.strip().length() > TEXTO_MAXIMO) {
            throw new IllegalArgumentException(
                    "El tipo de edificacion excede " + TEXTO_MAXIMO + " caracteres");
        }
        if (vigenciaHasta != null && vigenciaHasta.isBefore(vigenciaDesde)) {
            throw new IllegalArgumentException(
                    "Una ficha no puede dejar de regir antes de empezar: "
                            + vigenciaDesde
                            + ".."
                            + vigenciaHasta);
        }
    }

    /** La primera version de la ficha de un predio. */
    public static FichaCatastral primera(
            long predioId,
            TipoFicha tipo,
            AreaM2 areaTerreno,
            String uso,
            LocalDate desde,
            OrigenDeLaFicha origen,
            String documentoOrigen,
            Observacion observacion) {
        return new FichaCatastral(
                null,
                predioId,
                tipo,
                1,
                areaTerreno,
                uso,
                null,
                null,
                null,
                desde,
                null,
                origen,
                documentoOrigen,
                observacion,
                List.of(),
                List.of());
    }

    public boolean esNueva() {
        return id == null;
    }

    public boolean estaVigente() {
        return vigenciaHasta == null;
    }

    /** Si rige en esa fecha. Los dos extremos entran (regla 9). */
    public boolean rigeEn(LocalDate fecha) {
        Objects.requireNonNull(fecha, "Preguntar por la vigencia exige la fecha");
        if (fecha.isBefore(vigenciaDesde)) {
            return false;
        }
        return vigenciaHasta == null || !fecha.isAfter(vigenciaHasta);
    }

    /**
     * La version siguiente: misma ficha, {@code version + 1}, con la observacion que justifica el
     * cambio y <b>una copia de lo que colgaba</b>.
     *
     * <p>Copiar las construcciones es la parte que se olvida. Sin ella, la version anterior se
     * quedaria con las suyas y la nueva nacería vacia, que en la practica seria borrar lo declarado
     * sin que ningun {@code DELETE} apareciera en el diff.
     */
    public FichaCatastral siguienteVersion(
            LocalDate desde,
            OrigenDeLaFicha origen,
            String documentoOrigen,
            Observacion observacion) {
        if (!estaVigente()) {
            throw new IllegalStateException(
                    "Se quiso versionar la version "
                            + version
                            + ", que ya se cerro el "
                            + vigenciaHasta
                            + ". Solo la vigente se versiona; si no, el historial se ramifica");
        }
        return new FichaCatastral(
                null,
                predioId,
                tipo,
                version + 1,
                areaTerreno,
                uso,
                frontis,
                condicionPropiedad,
                tipoEdificacion,
                desde,
                null,
                origen,
                documentoOrigen,
                observacion,
                construcciones,
                instalaciones);
    }

    /** Cierra la version. Sus datos no se tocan: lo unico que cambia es hasta cuando rigio. */
    public FichaCatastral cerradaEl(LocalDate fecha) {
        Objects.requireNonNull(fecha, "Cerrar una version exige la fecha");
        if (!estaVigente()) {
            throw new IllegalStateException(
                    "La version " + version + " ya se cerro el " + vigenciaHasta);
        }
        if (fecha.isBefore(vigenciaDesde)) {
            throw new IllegalArgumentException(
                    "No se puede cerrar el "
                            + fecha
                            + " una version que empezo a regir el "
                            + vigenciaDesde);
        }
        return conVigenciaHasta(fecha);
    }

    public FichaCatastral con(List<Construccion> otrasConstrucciones) {
        return new FichaCatastral(
                id,
                predioId,
                tipo,
                version,
                areaTerreno,
                uso,
                frontis,
                condicionPropiedad,
                tipoEdificacion,
                vigenciaDesde,
                vigenciaHasta,
                origen,
                documentoOrigen,
                observacion,
                otrasConstrucciones,
                instalaciones);
    }

    public FichaCatastral conInstalaciones(List<OtraInstalacion> otras) {
        return new FichaCatastral(
                id,
                predioId,
                tipo,
                version,
                areaTerreno,
                uso,
                frontis,
                condicionPropiedad,
                tipoEdificacion,
                vigenciaDesde,
                vigenciaHasta,
                origen,
                documentoOrigen,
                observacion,
                construcciones,
                otras);
    }

    public FichaCatastral conArea(AreaM2 otraArea) {
        return new FichaCatastral(
                id,
                predioId,
                tipo,
                version,
                otraArea,
                uso,
                frontis,
                condicionPropiedad,
                tipoEdificacion,
                vigenciaDesde,
                vigenciaHasta,
                origen,
                documentoOrigen,
                observacion,
                construcciones,
                instalaciones);
    }

    private FichaCatastral conVigenciaHasta(@Nullable LocalDate hasta) {
        return new FichaCatastral(
                id,
                predioId,
                tipo,
                version,
                areaTerreno,
                uso,
                frontis,
                condicionPropiedad,
                tipoEdificacion,
                vigenciaDesde,
                hasta,
                origen,
                documentoOrigen,
                observacion,
                construcciones,
                instalaciones);
    }
}
