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
