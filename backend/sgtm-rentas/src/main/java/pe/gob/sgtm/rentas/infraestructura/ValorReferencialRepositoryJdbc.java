package pe.gob.sgtm.rentas.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.rentas.dominio.MarcaYModelo;
import pe.gob.sgtm.rentas.dominio.ValorReferencial;
import pe.gob.sgtm.rentas.dominio.ValorReferencialRepository;

/**
 * Los valores referenciales, leidos siempre por conjunto.
 *
 * <p>No hay ninguna consulta que acepte solo el ejercicio, y no es una omision: es lo que impide
 * que alguien la escriba «para el caso simple» y acabe leyendo una version sellada distinta de la
 * que uso la determinacion.
 */
@Repository
public class ValorReferencialRepositoryJdbc extends RepositorioJdbc
        implements ValorReferencialRepository {

    public ValorReferencialRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<ValorReferencial> buscar(
            IdentificadorDeConjunto conjunto, String marca, String modelo, int anioFabricacion) {
        return jdbc().sql(
                        """
                        SELECT ejercicio, marca, modelo, anio_fabricacion, valor, documento_fuente
                          FROM valor_referencial_vehiculo
                         WHERE conjunto_id = :conjunto
                           AND marca = :marca
                           AND modelo = :modelo
                           AND anio_fabricacion = :anio
                        """)
                .param("conjunto", conjunto.valor())
                .param("marca", marca)
                .param("modelo", modelo)
                .param("anio", anioFabricacion)
                .query(ValorReferencialRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public List<MarcaYModelo> catalogo(IdentificadorDeConjunto conjunto) {
        return jdbc().sql(
                        """
                        SELECT DISTINCT marca, modelo
                          FROM valor_referencial_vehiculo
                         WHERE conjunto_id = :conjunto
                         ORDER BY marca, modelo
                        """)
                .param("conjunto", conjunto.valor())
                .query(
                        (ResultSet fila, int numero) ->
                                new MarcaYModelo(fila.getString("marca"), fila.getString("modelo")))
                .list();
    }

    private static ValorReferencial mapear(ResultSet fila, int numero) throws SQLException {
        return new ValorReferencial(
                new Ejercicio(fila.getInt("ejercicio")),
                fila.getString("marca"),
                fila.getString("modelo"),
                new Ejercicio(fila.getInt("anio_fabricacion")),
                new Dinero(fila.getBigDecimal("valor")),
                fila.getString("documento_fuente"));
    }
}
