package pe.gob.sgtm.persistencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import pe.gob.sgtm.compartido.Paginacion;

@DisplayName("Orden seguro")
class OrdenSeguroTest {

    private static final OrdenSeguro ORDEN =
            OrdenSeguro.sobre("codigo", "nombre_razon_social", "fecha_registro");

    @Test
    @DisplayName("arma la clausula con la columna y el sentido")
    void armaLaClausula() {
        assertThat(ORDEN.clausula(Paginacion.de(0, 10, "codigo"))).isEqualTo("ORDER BY codigo ASC");
        assertThat(
                        ORDEN.clausula(
                                new Paginacion(0, 10, "codigo", Paginacion.Direccion.DESCENDENTE)))
                .isEqualTo("ORDER BY codigo DESC");
    }

    @Test
    @DisplayName("el cliente ordena en camelCase y la tabla recibe snake_case")
    void traduceCamelCaseASnakeCase() {
        assertThat(ORDEN.clausula(Paginacion.de(0, 10, "nombreRazonSocial")))
                .as("quien consume la API no tiene por que saber como se llama la columna")
                .isEqualTo("ORDER BY nombre_razon_social ASC");
        assertThat(ORDEN.clausula(Paginacion.de(0, 10, "nombre_razon_social")))
                .isEqualTo("ORDER BY nombre_razon_social ASC");
    }

    /**
     * La razon de ser de esta clase. {@code ORDER BY} no admite parametros de enlace, asi que el
     * texto del cliente se concatenaria a la consulta; con una subconsulta se pueden extraer datos
     * fila a fila sin necesidad de ver ningun mensaje de error.
     */
    @ParameterizedTest
    @ValueSource(
            strings = {
                "(SELECT nombre FROM municipalidad LIMIT 1)",
                "codigo; DROP TABLE via",
                "codigo, (SELECT 1)",
                "1",
                "codigo--",
                "otra_columna"
            })
    @DisplayName("lo que no esta en la lista blanca no llega a la consulta")
    void loQueNoEstaEnLaListaBlancaNoLlegaALaConsulta(String campo) {
        assertThatThrownBy(() -> ORDEN.clausula(Paginacion.de(0, 10, campo)))
                .isInstanceOf(OrdenSeguro.OrdenNoAdmitido.class)
                .hasMessageContaining(campo);
    }

    @Test
    @DisplayName("el error dice que campos si se admiten")
    void elErrorDiceQueCamposSeAdmiten() {
        assertThatThrownBy(() -> ORDEN.clausula(Paginacion.de(0, 10, "inventado")))
                .hasMessageContaining("codigo")
                .hasMessageContaining("fechaRegistro");
    }

    /**
     * El desempate (#543): sin el, un listado cuya columna de orden empata no tiene orden.
     *
     * <p>Medido sobre los doce modulos del sistema, que tienen todos {@code orden = 0}: el orden
     * relativo <b>cambia con el tamano de pagina</b> —el plan de ejecucion no es el mismo—, asi que
     * dos paginas consecutivas pueden repetir una fila y omitir otra.
     */
    @Test
    @DisplayName("el desempate declarado se anade a la clausula, y no se repite")
    void elDesempateSeAnadeYNoSeRepite() {
        OrdenSeguro conDesempate = OrdenSeguro.sobre("codigo", "orden", "id").desempatandoPor("id");

        assertThat(conDesempate.clausula(Paginacion.de(0, 10, "orden")))
                .as("sin esto, doce filas con el mismo «orden» salen como el plan quiera")
                .isEqualTo("ORDER BY orden ASC, id ASC");
        assertThat(
                        conDesempate.clausula(
                                new Paginacion(0, 10, "codigo", Paginacion.Direccion.DESCENDENTE)))
                .as("el desempate va siempre ASC: lo que hace falta es que el orden sea total")
                .isEqualTo("ORDER BY codigo DESC, id ASC");
        assertThat(conDesempate.clausula(Paginacion.de(0, 10, "id")))
                .as("ordenar por la propia columna de desempate no la repite")
                .isEqualTo("ORDER BY id ASC");
    }

    @Test
    @DisplayName("y el desempate tampoco admite nada que no sea un nombre de columna")
    void elDesempateNoAdmiteCualquierCosa() {
        assertThatThrownBy(() -> ORDEN.desempatandoPor("id DESC, (SELECT 1)"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("una lista blanca no admite nada que no sea un nombre de columna")
    void laListaBlancaNoAdmiteCualquierCosa() {
        assertThatThrownBy(() -> OrdenSeguro.sobre("codigo ASC"))
                .as("si la propia lista blanca admitiera SQL, no serviria de nada")
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> OrdenSeguro.sobre("(SELECT 1)"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
