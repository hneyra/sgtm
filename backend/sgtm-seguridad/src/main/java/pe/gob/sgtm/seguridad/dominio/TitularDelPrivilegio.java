package pe.gob.sgtm.seguridad.dominio;

import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.seguridad.dominio.PermisoEfectivo.OrigenDelPermiso;

/**
 * Una cuenta que tiene un privilegio sobre un acceso, y <b>de donde le viene</b> (#583).
 *
 * <h2>Por que existe</h2>
 *
 * <p>«Quien tiene ESPECIAL sobre la caja» solo se podia contestar cuenta por cuenta: {@code GET
 * /seguridad/usuarios/{id}/permisos} publica la matriz de <b>una</b> persona y el contrato no
 * declara ningun filtro. Medido el 2026-09-01, recorrer el padron con los 200 usuarios que la
 * pantalla pide de una vez costaba 200 peticiones y ~4,2 MB de JSON para pintar una insignia.
 *
 * <p>Y no se puede acortar preguntando por los grupos: la excepcion de usuario <b>sustituye</b> a
 * lo que el grupo da, asi que quien pertenece a un grupo sin el privilegio puede tenerlo por
 * excepcion, y al reves. Un recorrido por grupos deja fuera exactamente esa mitad.
 *
 * <h2>Lo que su forma decide</h2>
 *
 * <ol>
 *   <li><b>{@code efectivoHoy} no es un adorno.</b> Esta lista es la de lo <b>configurado</b>: una
 *       cuenta deshabilitada o fuera de vigencia que conserva el privilegio <b>sale</b>, porque es
 *       justo la que se audita —rehabilitarla se lo devuelve entero—. Pero decir que lo tiene sin
 *       decir que hoy no lo puede ejercer seria afirmar que entra donde el guardia le responderia
 *       403. La bandera es el mismo predicado que el guardia comprueba sobre el usuario, publicado
 *       en vez de aplicado como filtro.
 *   <li><b>{@code grupoId} es nulo cuando el privilegio viene de mas de un grupo</b>, igual que en
 *       {@link PermisoEfectivo}: la union de dos grupos que lo otorgan no tiene <b>un</b> grupo que
 *       nombrar, y elegir el menor por id daria un dato plausible y equivocado a quien tiene que
 *       decidir de donde quitarlo. Los grupos que cuentan son los que otorgan <b>este</b>
 *       privilegio; uno que aporte otros no es el origen de este.
 * </ol>
 *
 * @param usuarioId el id de la cuenta, el mismo que publica {@code GET /seguridad/usuarios}
 * @param cuenta el nombre de cuenta
 * @param nombre el nombre de la persona
 * @param efectivoHoy si hoy puede ejercerlo: cuenta habilitada y dentro de vigencia
 * @param origen quien se lo da, su excepcion o sus grupos
 * @param grupoId el grupo, cuando el origen es {@code GRUPO} y hay uno solo que lo otorga
 */
public record TitularDelPrivilegio(
        long usuarioId,
        String cuenta,
        String nombre,
        boolean efectivoHoy,
        OrigenDelPermiso origen,
        @Nullable Long grupoId) {

    public TitularDelPrivilegio {
        Objects.requireNonNull(cuenta, "Un titular tiene cuenta");
        Objects.requireNonNull(nombre, "Un titular tiene nombre");
        Objects.requireNonNull(origen, "Un titular dice de donde le viene el privilegio");
        if (origen == OrigenDelPermiso.EXCEPCION && grupoId != null) {
            throw new IllegalArgumentException(
                    "Una excepcion de usuario no viene de ningun grupo: " + cuenta);
        }
    }
}
