package pe.gob.sgtm.catastro.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.catastro.dominio.Arancel;
import pe.gob.sgtm.catastro.dominio.Depreciacion;
import pe.gob.sgtm.catastro.dominio.Partida;
import pe.gob.sgtm.catastro.dominio.ValorUnitarioEdificacion;
import pe.gob.sgtm.catastro.dominio.ValuacionRepository;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Aranceles, valores unitarios de edificacion y depreciacion, leidos y escritos siempre por
 * conjunto (#17).
 *
 * <p>Los tres {@code INSERT} no comprueban el estado del conjunto antes de escribir: la
 * comprobacion la hace el disparador {@code valuacion_de_conjunto_sellado_es_inmutable} de {@code
 * V18}, y si aqui se leyera el estado antes de insertar habria una ventana entre las dos sentencias
 * donde una carga concurrente podria sellar el conjunto en medio. El disparador no tiene esa
 * ventana: corre en la misma sentencia.
 */
@Repository
public class ValuacionRepositoryJdbc extends RepositorioJdbc implements ValuacionRepository {

    public ValuacionRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    // ---------- Arancel ----------

    @Override
    public List<Arancel> arancelesDe(IdentificadorDeConjunto conjunto) {
        return jdbc().sql(
                        """
                        SELECT id, via_id, tramo, valor_m2, documento_fuente
                          FROM arancel
                         WHERE conjunto_id = :conjunto
                         ORDER BY via_id, tramo
                        """)
                .param("conjunto", conjunto.valor())
                .query(ValuacionRepositoryJdbc::mapearArancel)
                .list();
    }

    @Override
    public Arancel guardarArancel(Arancel arancel, IdentificadorDeConjunto conjunto) {
        long id =
                jdbc().sql(
                                """
                                INSERT INTO arancel
                                    (municipalidad_id, conjunto_id, via_id, tramo, valor_m2,
                                     documento_fuente)
                                VALUES
                                    (%s, :conjunto, :via, :tramo, :valorM2, :documentoFuente)
                                RETURNING id
                                """
                                        .formatted(MUNICIPALIDAD_ACTUAL))
                        .param("conjunto", conjunto.valor())
                        .param("via", arancel.viaId())
                        .param("tramo", arancel.tramo())
                        .param("valorM2", arancel.valorM2().valor())
                        .param("documentoFuente", arancel.documentoFuente())
                        .query(Long.class)
                        .single();
        return new Arancel(
                id, arancel.viaId(), arancel.tramo(), arancel.valorM2(), arancel.documentoFuente());
    }

    private static Arancel mapearArancel(ResultSet fila, int numero) throws SQLException {
        return new Arancel(
                fila.getLong("id"),
                fila.getLong("via_id"),
                fila.getString("tramo"),
                new ValorNormativo(fila.getBigDecimal("valor_m2")),
                fila.getString("documento_fuente"));
    }

    // ---------- Valor unitario de edificacion ----------

    @Override
    public List<ValorUnitarioEdificacion> valoresUnitariosDe(IdentificadorDeConjunto conjunto) {
        return jdbc().sql(
                        """
                        SELECT id, partida, categoria, anio_construccion_desde,
                               anio_construccion_hasta, valor_m2, documento_fuente
                          FROM valor_unitario_edificacion
                         WHERE conjunto_id = :conjunto
                         ORDER BY partida, categoria, anio_construccion_desde
                        """)
                .param("conjunto", conjunto.valor())
                .query(ValuacionRepositoryJdbc::mapearValorUnitario)
                .list();
    }

    @Override
    public ValorUnitarioEdificacion guardarValorUnitario(
            ValorUnitarioEdificacion valorUnitario, IdentificadorDeConjunto conjunto) {
        long id =
                jdbc().sql(
                                """
                                INSERT INTO valor_unitario_edificacion
                                    (municipalidad_id, conjunto_id, partida, categoria,
                                     anio_construccion_desde, anio_construccion_hasta, valor_m2,
                                     documento_fuente)
                                VALUES
                                    (%s, :conjunto, :partida, :categoria, :anioDesde, :anioHasta,
                                     :valorM2, :documentoFuente)
                                RETURNING id
                                """
                                        .formatted(MUNICIPALIDAD_ACTUAL))
                        .param("conjunto", conjunto.valor())
                        .param("partida", valorUnitario.partida().name())
                        .param("categoria", String.valueOf(valorUnitario.categoria()))
                        .param("anioDesde", valorUnitario.anioConstruccionDesde())
                        .param("anioHasta", valorUnitario.anioConstruccionHasta())
                        .param("valorM2", valorUnitario.valorM2().valor())
                        .param("documentoFuente", valorUnitario.documentoFuente())
                        .query(Long.class)
                        .single();
        return new ValorUnitarioEdificacion(
                id,
                valorUnitario.partida(),
                valorUnitario.categoria(),
                valorUnitario.anioConstruccionDesde(),
                valorUnitario.anioConstruccionHasta(),
                valorUnitario.valorM2(),
                valorUnitario.documentoFuente());
    }

    private static ValorUnitarioEdificacion mapearValorUnitario(ResultSet fila, int numero)
            throws SQLException {
        Integer anioHasta = (Integer) fila.getObject("anio_construccion_hasta");
        return new ValorUnitarioEdificacion(
                fila.getLong("id"),
                Partida.valueOf(fila.getString("partida")),
                fila.getString("categoria").charAt(0),
                fila.getInt("anio_construccion_desde"),
                anioHasta,
                new ValorNormativo(fila.getBigDecimal("valor_m2")),
                fila.getString("documento_fuente"));
    }

    // ---------- Depreciacion ----------

    @Override
    public List<Depreciacion> depreciacionesDe(IdentificadorDeConjunto conjunto) {
        return jdbc().sql(
                        """
                        SELECT id, material, estado_conservacion, antiguedad_hasta, porcentaje,
                               documento_fuente
                          FROM depreciacion
                         WHERE conjunto_id = :conjunto
                         ORDER BY material, estado_conservacion, antiguedad_hasta
                        """)
                .param("conjunto", conjunto.valor())
                .query(ValuacionRepositoryJdbc::mapearDepreciacion)
                .list();
    }

    @Override
    public Depreciacion guardarDepreciacion(
            Depreciacion depreciacion, IdentificadorDeConjunto conjunto) {
        long id =
                jdbc().sql(
                                """
                                INSERT INTO depreciacion
                                    (municipalidad_id, conjunto_id, material, estado_conservacion,
                                     antiguedad_hasta, porcentaje, documento_fuente)
                                VALUES
                                    (%s, :conjunto, :material, :estado, :antiguedad, :porcentaje,
                                     :documentoFuente)
                                RETURNING id
                                """
                                        .formatted(MUNICIPALIDAD_ACTUAL))
                        .param("conjunto", conjunto.valor())
                        .param("material", depreciacion.material())
                        .param("estado", depreciacion.estadoConservacion())
                        .param("antiguedad", depreciacion.antiguedadHasta())
                        .param("porcentaje", depreciacion.porcentaje().valor())
                        .param("documentoFuente", depreciacion.documentoFuente())
                        .query(Long.class)
                        .single();
        return new Depreciacion(
                id,
                depreciacion.material(),
                depreciacion.estadoConservacion(),
                depreciacion.antiguedadHasta(),
                depreciacion.porcentaje(),
                depreciacion.documentoFuente());
    }

    private static Depreciacion mapearDepreciacion(ResultSet fila, int numero) throws SQLException {
        return new Depreciacion(
                fila.getLong("id"),
                fila.getString("material"),
                fila.getString("estado_conservacion"),
                fila.getInt("antiguedad_hasta"),
                new Alicuota(fila.getBigDecimal("porcentaje")),
                fila.getString("documento_fuente"));
    }
}
