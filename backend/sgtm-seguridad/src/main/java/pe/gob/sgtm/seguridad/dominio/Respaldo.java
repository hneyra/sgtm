package pe.gob.sgtm.seguridad.dominio;

import java.time.Instant;
import org.jspecify.annotations.Nullable;

/**
 * El estado de una copia de seguridad (RF-126).
 *
 * <p>La aplicacion <b>no hace copias y no debe poder hacerlas</b>: se conecta como {@code
 * sgtm_app}, que no tiene DDL ni es superusuario (ARQ-03 §4). Quien las hace es el proceso de
 * despliegue y quien escribe esta tabla es {@code sgtm_owner}. Aqui solo se lee.
 */
public record Respaldo(
        long id,
        Instant inicio,
        @Nullable Instant fin,
        String resultado,
        String destino,
        @Nullable Long tamanoBytes,
        @Nullable String detalle) {

    public boolean enCurso() {
        return "EN_CURSO".equals(resultado);
    }

    public boolean exitoso() {
        return "EXITOSO".equals(resultado);
    }
}
