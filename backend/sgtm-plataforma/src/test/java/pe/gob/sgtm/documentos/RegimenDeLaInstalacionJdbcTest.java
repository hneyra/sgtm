package pe.gob.sgtm.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * De donde sale la marca: de la fila, no de un archivo de configuracion (#122, ADR-0007).
 *
 * <p>Contra PostgreSQL y como {@code sgtm_app}, porque las dos cosas que se verifican aqui solo
 * existen ahi: que la consulta resuelva la municipalidad por el parametro de sesion que fija {@code
 * SET LOCAL} —y no por un identificador que viaje en Java—, y que una instalacion que atiende a
 * varias municipalidades no confunda el regimen de una con el de otra.
 */
@DisplayName("#122 — El regimen de la instalacion sale de la base")
class RegimenDeLaInstalacionJdbcTest {

    private static BaseDeDatosDePrueba base;
    private static long deDemostracion;
    private static long real;

    private static RegimenDeLaInstalacion regimen;
    private static TransactionTemplate transaccion;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        deDemostracion = crearMunicipalidad("400101", "Municipalidad de la marcha blanca", true);
        real = crearMunicipalidad("400102", "Municipalidad que ya opera", false);

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        regimen = new RegimenDeLaInstalacionJdbc(JdbcClient.create(pool));
        transaccion = new TransactionTemplate(new TenantTransactionManager(pool));
    }

    @AfterAll
    static void cerrar() {
        TenantContext.limpiar();
        if (base != null) {
            base.close();
        }
    }

    @Test
    @DisplayName("la municipalidad marcada emite marcado, y la que no, no")
    void cadaUnaConSuRegimen() {
        assertThat(regimenDe(deDemostracion))
                .as("es la fila la que lo dice, no una variable de entorno")
                .isTrue();
        assertThat(regimenDe(real)).isFalse();
    }

    @Test
    @DisplayName("la cache no deja que la primera municipalidad decida por las demas")
    void laCacheEsPorMunicipalidad() {
        // El fallo que esto atrapa no se ve probando con una sola municipalidad, y es el
        // peor de los posibles: una cache de un solo valor haria que la primera que
        // emitiera fijara el regimen de toda la instalacion. Con la de demostracion
        // primero, la que ya opera emitiria papeles marcados —molesto—; al reves, la de
        // la marcha blanca emitiria papeles SIN marca, que es justo lo que #122 impide.
        assertThat(regimenDe(deDemostracion)).isTrue();
        assertThat(regimenDe(real)).as("preguntada despues de una de demostracion").isFalse();
        assertThat(regimenDe(deDemostracion)).as("y preguntada de nuevo, no ha cambiado").isTrue();
    }

    @Test
    @DisplayName("sin contexto de tenant no responde: falla en vez de suponer")
    void sinContextoNoResponde() {
        TenantContext.limpiar();

        assertThatThrownBy(() -> regimen.esDeDemostracion())
                .as("suponer «no es de demostracion» seria emitir sin marca por descuido")
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("una municipalidad que no esta en el registro no emite nada")
    void unaMunicipalidadQueNoEstaNoEmite() {
        // Sin saber el regimen no se puede decidir si el documento va marcado, y de las
        // dos respuestas posibles la comoda —«no es de demostracion»— es la que produce
        // un papel sin marca. Asi que no hay respuesta comoda: hay excepcion.
        assertThatThrownBy(() -> regimenDe(999_999L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("saldria sin marca");
    }

    private static boolean regimenDe(long municipalidad) {
        TenantContext.fijar(new MunicipalidadId(municipalidad));
        try {
            return Boolean.TRUE.equals(transaccion.execute(estado -> regimen.esDeDemostracion()));
        } finally {
            TenantContext.limpiar();
        }
    }

    private static long crearMunicipalidad(String ubigeo, String nombre, boolean esDemostracion)
            throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER);
                PreparedStatement sentencia =
                        owner.prepareStatement(
                                "INSERT INTO municipalidad (ubigeo, nombre, tipo, es_demostracion)"
                                        + " VALUES (?, ?, 'DISTRITAL', ?) RETURNING id")) {
            sentencia.setString(1, ubigeo);
            sentencia.setString(2, nombre);
            sentencia.setBoolean(3, esDemostracion);
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                long id = resultado.getLong(1);
                owner.commit();
                return id;
            }
        }
    }
}
