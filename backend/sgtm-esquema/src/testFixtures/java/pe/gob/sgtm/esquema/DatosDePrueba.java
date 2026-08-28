package pe.gob.sgtm.esquema;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Siembra una fila en <b>cada</b> tabla de tenant, para las dos municipalidades de la prueba.
 *
 * <p>La cobertura completa no es adorno: la verificacion "con contexto de A no se ve ninguna fila
 * de B" es vacia si en la tabla no hay filas de B. Una tabla sin datos sembrados pasaria en verde
 * sin probar nada, que es justamente el modo de fallo contra el que existe esta prueba. Por eso la
 * prueba exige ademas que cada tabla de tenant tenga al menos una fila propia.
 *
 * <p><b>Al agregar una tabla de tenant hay que sembrarla aqui.</b> Si no, el build se pone rojo con
 * el mensaje de que la municipalidad A no ve filas suyas en esa tabla.
 *
 * <p>Los importes son BigDecimal (regla 1 de ARQ-04 §2) y no representan ninguna regla tributaria:
 * son datos de relleno. Ninguna cifra de aqui debe leerse como un parametro del predial, que sigue
 * bloqueado por D-02.
 */
public final class DatosDePrueba {

    private static final LocalDate VIGENCIA = LocalDate.of(2026, 1, 1);
    private static final short EJERCICIO = 2026;
    private static final BigDecimal CIEN = new BigDecimal("100.00");
    private static final BigDecimal MIL = new BigDecimal("1000.00");

    /**
     * El modelo minimo que {@code documento_emitido.datos} admite: un {@code ModeloDeDocumento}.
     */
    private static final String MODELO_DE_DOCUMENTO =
            "{\"titulo\":\"Documento de prueba\",\"subtitulo\":null,\"aLaFecha\":\"2026-01-01\","
                    + "\"cabecera\":[],\"tablas\":[],\"pie\":[],\"duplicado\":null}";

    private DatosDePrueba() {}

    /** El alta de una municipalidad es una operacion de implantacion: la hace el owner. */
    public static long crearMunicipalidad(BaseDeDatosDePrueba base, String ubigeo, String nombre)
            throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER)) {
            long id =
                    insertar(
                            owner,
                            "INSERT INTO municipalidad (ubigeo, nombre, tipo)"
                                    + " VALUES (?, ?, 'DISTRITAL') RETURNING id",
                            ubigeo,
                            nombre);
            owner.commit();
            return id;
        }
    }

    /** Catalogo nacional: lo carga su propio rol, no la aplicacion. */
    public static long crearParametroNacional(BaseDeDatosDePrueba base) throws SQLException {
        try (Connection carga = base.conexion(BaseDeDatosDePrueba.CARGA_PARAMETROS)) {
            long id =
                    insertar(
                            carga,
                            "INSERT INTO parametro_tributario"
                                    + " (municipalidad_id, tipo, clave, valor_numerico, vigencia_desde,"
                                    + "  documento_fuente, usuario_carga)"
                                    + " VALUES (NULL, 'PRUEBA', 'valor-de-relleno', 1.000000, ?,"
                                    + "         'fixture de la prueba de aislamiento', 'prueba')"
                                    + " RETURNING id",
                            VIGENCIA);
            carga.commit();
            return id;
        }
    }

    /**
     * Siembra todas las tablas de tenant como {@code sgtm_app} y con el contexto de la
     * municipalidad fijado. Sembrar con el rol de la aplicacion, y no con el owner, verifica de
     * paso que la clausula {@code WITH CHECK} deja pasar lo que debe dejar pasar.
     */
    public static void sembrarTenant(
            BaseDeDatosDePrueba base, long muni, long parametroId, String sufijo)
            throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, muni);

            long conjuntoId = sembrarParametros(app, muni, parametroId);
            long[] contribuyentes = sembrarContribuyentes(app, muni, sufijo);
            long titular = contribuyentes[0];
            long segundo = contribuyentes[1];
            long predioId = sembrarCatastro(app, muni, sufijo, titular, conjuntoId);
            long vehiculoId =
                    sembrarRentas(app, muni, sufijo, titular, segundo, predioId, conjuntoId);
            long reciboId = sembrarTesoreria(app, muni, sufijo, titular, conjuntoId);
            long valorId = sembrarValoresYCoactiva(app, muni, sufijo, titular, conjuntoId);
            sembrarSanciones(app, muni, sufijo, titular, segundo, vehiculoId, predioId);
            sembrarLicencias(app, muni, sufijo, titular, predioId, reciboId);
            sembrarSeguridad(app, muni, sufijo);

            // Constancia de que los identificadores encadenados se usaron: el valor
            // sembrado es el que entra al expediente coactivo.
            if (valorId <= 0) {
                throw new IllegalStateException("No se sembro ningun valor");
            }

            // El trigger diferido de titularidad se evalua aqui.
            app.commit();
        }
    }

    // ------------------------------------------------------------------
    // Parametros
    // ------------------------------------------------------------------

    private static long sembrarParametros(Connection app, long muni, long parametroId)
            throws SQLException {
        long conjuntoId =
                insertar(
                        app,
                        "INSERT INTO conjunto_parametros (municipalidad_id, ejercicio, version)"
                                + " VALUES (?, ?, 1) RETURNING id",
                        muni,
                        EJERCICIO);
        ejecutar(
                app,
                "INSERT INTO conjunto_parametro_detalle (municipalidad_id, conjunto_id,"
                        + " parametro_id) VALUES (?, ?, ?)",
                muni,
                conjuntoId,
                parametroId);
        return conjuntoId;
    }

    // ------------------------------------------------------------------
    // Contribuyentes
    // ------------------------------------------------------------------

    /** Dos contribuyentes: uno titular y otro para transferencias y papeletas. */
    private static long[] sembrarContribuyentes(Connection app, long muni, String sufijo)
            throws SQLException {
        long titular = crearContribuyente(app, muni, sufijo, "1");
        long segundo = crearContribuyente(app, muni, sufijo, "2");

        ejecutar(
                app,
                "INSERT INTO domicilio (municipalidad_id, contribuyente_id, tipo, direccion,"
                        + " vigencia_desde, documento_origen)"
                        + " VALUES (?, ?, 'FISCAL', ?, ?, 'DJ-001')",
                muni,
                titular,
                "Av. Siempre Viva " + sufijo,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO contacto (municipalidad_id, contribuyente_id, tipo, valor)"
                        + " VALUES (?, ?, 'EMAIL', ?)",
                muni,
                titular,
                "contribuyente" + sufijo + "@ejemplo.pe");
        // El segundo responde solidariamente por el titular: sirve para la prueba de
        // aislamiento y de paso deja sembrado el caso que la cobranza consulta.
        ejecutar(
                app,
                "INSERT INTO responsable_solidario (municipalidad_id, contribuyente_id,"
                        + " responsable_id, vinculo, vigencia_desde, documento_origen)"
                        + " VALUES (?, ?, ?, 'CONYUGE', ?, 'Partida de matrimonio')",
                muni,
                titular,
                segundo,
                VIGENCIA);
        return new long[] {titular, segundo};
    }

    private static long crearContribuyente(Connection app, long muni, String sufijo, String orden)
            throws SQLException {
        return insertar(
                app,
                "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente, tipo_documento,"
                        + " numero_documento, tipo_persona, nombre_razon_social, usuario_registro)"
                        + " VALUES (?, ?, 'DNI', ?, 'NATURAL', ?, 'prueba') RETURNING id",
                muni,
                "C-" + sufijo + orden,
                "1000000" + sufijo + orden,
                "Contribuyente " + sufijo + orden);
    }

    // ------------------------------------------------------------------
    // Catastro
    // ------------------------------------------------------------------

    private static long sembrarCatastro(
            Connection app, long muni, String sufijo, long titular, long conjuntoId)
            throws SQLException {
        long viaId =
                insertar(
                        app,
                        "INSERT INTO via (municipalidad_id, codigo, tipo_via, nombre)"
                                + " VALUES (?, ?, 'AVENIDA', ?) RETURNING id",
                        muni,
                        "V-" + sufijo,
                        "Avenida Grau " + sufijo);
        long sectorId =
                insertar(
                        app,
                        "INSERT INTO sector (municipalidad_id, codigo, nombre)"
                                + " VALUES (?, ?, ?) RETURNING id",
                        muni,
                        "S-" + sufijo,
                        "Sector " + sufijo);
        long manzanaId =
                insertar(
                        app,
                        "INSERT INTO manzana (municipalidad_id, sector_id, codigo)"
                                + " VALUES (?, ?, ?) RETURNING id",
                        muni,
                        sectorId,
                        "M-" + sufijo);
        long predioId =
                insertar(
                        app,
                        "INSERT INTO predio (municipalidad_id, codigo_ref_catastral, tipo, via_id,"
                                + " direccion, sector_id, manzana_id, lote)"
                                + " VALUES (?, ?, 'URBANO', ?, ?, ?, ?, '01') RETURNING id",
                        muni,
                        codigoCatastral(sufijo),
                        viaId,
                        "Jr. Union " + sufijo,
                        sectorId,
                        manzanaId);

        long fichaId =
                insertar(
                        app,
                        "INSERT INTO ficha_catastral (municipalidad_id, predio_id, tipo, version,"
                                + " area_terreno, uso, vigencia_desde, origen, documento_origen,"
                                + " observacion, usuario_registro)"
                                + " VALUES (?, ?, 'UNICA', 1, 120.00, 'CASA_HABITACION', ?,"
                                + "         'DECLARACION_JURADA', 'DJ-001', 'ficha inicial de prueba',"
                                + "         'prueba') RETURNING id",
                        muni,
                        predioId,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO construccion (municipalidad_id, ficha_id, piso, area_construida,"
                        + " anio_construccion, material_estructural, estado_conservacion,"
                        + " categoria_muros)"
                        + " VALUES (?, ?, '1', 80.00, 2010, 'CONCRETO', 'BUENO', 'C')",
                muni,
                fichaId);
        ejecutar(
                app,
                "INSERT INTO otra_instalacion (municipalidad_id, ficha_id, descripcion,"
                        + " unidad_medida, cantidad)"
                        + " VALUES (?, ?, 'Cerco perimetrico', 'ML', 25.00)",
                muni,
                fichaId);

        // Los otros tres tipos de ficha (#19). Van sobre el mismo predio a proposito: el indice
        // parcial admite una vigente de cada tipo, y sembrarlas juntas lo comprueba de paso.
        long economica =
                insertar(
                        app,
                        "INSERT INTO ficha_catastral (municipalidad_id, predio_id, tipo, version,"
                                + " area_terreno, uso, informacion_complementaria, vigencia_desde,"
                                + " origen, documento_origen, observacion, usuario_registro)"
                                + " VALUES (?, ?, 'ECONOMICA', 1, 120.00, 'COMERCIO',"
                                + "         'ficha economica de prueba', ?, 'FISCALIZACION',"
                                + "         'ACTA-001', 'ficha economica de prueba', 'prueba')"
                                + " RETURNING id",
                        muni,
                        predioId,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO actividad_economica (municipalidad_id, ficha_id, conductor,"
                        + " nombre_comercial, ciiu, licencia_numero, licencia_fecha)"
                        + " VALUES (?, ?, 'Conductor de prueba', 'Bodega de prueba', '4711',"
                        + "         'LIC-001', ?)",
                muni,
                economica,
                VIGENCIA);

        long comunes =
                insertar(
                        app,
                        "INSERT INTO ficha_catastral (municipalidad_id, predio_id, tipo, version,"
                                + " area_terreno, uso, denominacion, vigencia_desde, origen,"
                                + " documento_origen, observacion, usuario_registro)"
                                + " VALUES (?, ?, 'BIENES_COMUNES', 1, 120.00, 'MULTIFAMILIAR',"
                                + "         'Edificio de prueba', ?, 'DECLARACION_JURADA',"
                                + "         'DJ-002', 'ficha de bienes comunes de prueba', 'prueba')"
                                + " RETURNING id",
                        muni,
                        predioId,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO bien_comun (municipalidad_id, ficha_id, descripcion, area,"
                        + " material_estructural, estado_conservacion)"
                        + " VALUES (?, ?, 'Escalera comun', 30.00, 'CONCRETO', 'BUENO')",
                muni,
                comunes);
        ejecutar(
                app,
                "INSERT INTO participacion_comun (municipalidad_id, ficha_id, predio_id,"
                        + " porcentaje) VALUES (?, ?, ?, 100)",
                muni,
                comunes,
                predioId);

        long rural =
                insertar(
                        app,
                        "INSERT INTO ficha_catastral (municipalidad_id, predio_id, tipo, version,"
                                + " area_terreno, uso, denominacion, vigencia_desde, origen,"
                                + " documento_origen, observacion, usuario_registro)"
                                + " VALUES (?, ?, 'RURAL', 1, 120.00, 'AGRICOLA',"
                                + "         'Fundo de prueba', ?, 'DECLARACION_JURADA', 'DJ-003',"
                                + "         'ficha rural de prueba', 'prueba') RETURNING id",
                        muni,
                        predioId,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO tierra_rural (municipalidad_id, ficha_id, clasificacion, riego,"
                        + " cantidad_hectareas) VALUES (?, ?, 'CULTIVO_TRANSITORIO', 'SECANO',"
                        + "         2.5000)",
                muni,
                rural);
        ejecutar(
                app,
                "INSERT INTO colindante_rural (municipalidad_id, ficha_id, orientacion,"
                        + " descripcion) VALUES (?, ?, 'NORTE', 'Predio de prueba colindante')",
                muni,
                rural);

        ejecutar(
                app,
                "INSERT INTO documento_emitido (municipalidad_id, tipo, numero, ejercicio,"
                        + " referencia, datos, formato, resumen, fecha_emision, usuario_emision,"
                        + " observacion)"
                        + " VALUES (?, 'FICHA_CONTRIBUYENTE', 'FICHA_CONTRIBUYENTE-2026-000001',"
                        + "         2026, 'C-0001', CAST(? AS jsonb), 'PDF', repeat('a', 64),"
                        + "         ?, 'siembra', 'documento de prueba')",
                muni,
                "{\"titulo\":\"Documento de prueba\",\"subtitulo\":null,\"aLaFecha\":\"2026-01-01\","
                        + "\"cabecera\":[],\"tablas\":[],\"pie\":[],\"duplicado\":null}",
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO titularidad (municipalidad_id, predio_id, contribuyente_id, condicion,"
                        + " porcentaje, vigencia_desde, documento_origen)"
                        + " VALUES (?, ?, ?, 'PROPIETARIO_UNICO', 100, ?, 'MINUTA-001')",
                muni,
                predioId,
                titular,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO inquilino (municipalidad_id, predio_id, contribuyente_id,"
                        + " vigencia_desde, documento_origen)"
                        + " VALUES (?, ?, ?, ?, 'CONTRATO-001')",
                muni,
                predioId,
                titular,
                VIGENCIA);

        // Tablas de valuacion. Valores de relleno: los normativos siguen en D-02. Cuelgan del
        // conjunto de parametros sembrado por sembrarParametros, no de un ejercicio suelto (#17).
        ejecutar(
                app,
                "INSERT INTO arancel (municipalidad_id, conjunto_id, via_id, valor_m2,"
                        + " documento_fuente)"
                        + " VALUES (?, ?, ?, 1.000000, 'fixture de la prueba')",
                muni,
                conjuntoId,
                viaId);
        ejecutar(
                app,
                "INSERT INTO valor_unitario_edificacion (municipalidad_id, conjunto_id, partida,"
                        + " categoria, anio_construccion_desde, valor_m2, documento_fuente)"
                        + " VALUES (?, ?, 'MUROS', 'C', 2000, 1.000000, 'fixture de la prueba')",
                muni,
                conjuntoId);
        ejecutar(
                app,
                "INSERT INTO depreciacion (municipalidad_id, conjunto_id, material,"
                        + " estado_conservacion, antiguedad_hasta, porcentaje, documento_fuente)"
                        + " VALUES (?, ?, 'CONCRETO', 'BUENO', 10, 1.0000,"
                        + "         'fixture de la prueba')",
                muni,
                conjuntoId);
        return predioId;
    }

    /** Codigo de referencia catastral de relleno; la longitud exacta es D-10. */
    private static String codigoCatastral(String sufijo) {
        String digitos = Integer.toString(Math.abs(sufijo.hashCode() % 100) + 10);
        return ("2006010101500101010" + digitos + "000000").substring(0, 21);
    }

    // ------------------------------------------------------------------
    // Rentas y cuenta corriente
    // ------------------------------------------------------------------

    private static long sembrarRentas(
            Connection app,
            long muni,
            String sufijo,
            long titular,
            long segundo,
            long predioId,
            long conjuntoId)
            throws SQLException {
        long vehiculoId =
                insertar(
                        app,
                        "INSERT INTO vehiculo (municipalidad_id, placa, contribuyente_id, marca,"
                                + " modelo, categoria, anio_fabricacion, anio_inscripcion)"
                                + " VALUES (?, ?, ?, 'MARCA', 'MODELO', 'M1', 2020, 2021)"
                                + " RETURNING id",
                        muni,
                        "ABC-" + numeroDePlaca(sufijo),
                        titular);
        // El valor referencial cuelga del conjunto y no del ejercicio (V16): un
        // ejercicio puede tener varias versiones selladas, y resolver por
        // ejercicio devolveria la vigente hoy en vez de la que se uso al
        // determinar.
        ejecutar(
                app,
                "INSERT INTO valor_referencial_vehiculo (municipalidad_id, conjunto_id, ejercicio,"
                        + " marca, modelo, anio_fabricacion, valor, documento_fuente)"
                        + " VALUES (?, ?, ?, 'MARCA', 'MODELO', 2020, ?, 'fixture de la prueba')",
                muni,
                conjuntoId,
                EJERCICIO,
                MIL);
        ejecutar(
                app,
                "INSERT INTO declaracion_jurada (municipalidad_id, numero, ejercicio,"
                        + " contribuyente_id, tipo, predio_id, fecha_presentacion, fecha_limite,"
                        + " usuario_registro, observacion)"
                        + " VALUES (?, ?, ?, ?, 'HR', ?, ?, ?, 'prueba', 'declaracion de prueba')",
                muni,
                "DJ-" + sufijo,
                EJERCICIO,
                titular,
                predioId,
                VIGENCIA,
                VIGENCIA.plusMonths(2));
        ejecutar(
                app,
                "INSERT INTO beneficio (municipalidad_id, contribuyente_id, predio_id, tipo,"
                        + " tributo, clase, porcentaje, vigencia_desde, base_legal,"
                        + " documento_origen, observacion, usuario_registro)"
                        + " VALUES (?, ?, ?, 'PENSIONISTA', 'PREDIAL', 'DEDUCCION', 1.0000, ?,"
                        + "         'fixture de la prueba', 'RES-001', 'beneficio de prueba',"
                        + "         'prueba')",
                muni,
                titular,
                predioId,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO transferencia (municipalidad_id, objeto, predio_id, transferente_id,"
                        + " adquiriente_id, tipo_transferencia, fecha_transferencia,"
                        + " valor_transferencia, porcentaje_transferido, afecta_alcabala,"
                        + " documento_origen, observacion, usuario_registro)"
                        + " VALUES (?, 'PREDIO', ?, ?, ?, 'COMPRAVENTA', ?, ?, 100, true,"
                        + "         'MINUTA-002', 'transferencia de prueba', 'prueba')",
                muni,
                predioId,
                titular,
                segundo,
                VIGENCIA,
                MIL);
        ejecutar(
                app,
                "INSERT INTO espectaculo (municipalidad_id, contribuyente_id, denominacion, tipo,"
                        + " lugar, fecha_evento, usuario_registro)"
                        + " VALUES (?, ?, 'Evento de prueba', 'CONCIERTO', 'Coliseo', ?, 'prueba')",
                muni,
                titular,
                VIGENCIA);

        // Sin predio_id: el predial se determina por contribuyente, nunca por un solo
        // predio (NEG-05 §1); determinacion_predial_sin_predio_ck (V20) lo exige. El
        // aporte del predio va en determinacion_predio_detalle (V20).
        long determinacionId =
                insertar(
                        app,
                        "INSERT INTO determinacion (municipalidad_id, ejercicio, tributo, periodo,"
                                + " contribuyente_id, conjunto_id, base_imponible,"
                                + " monto_determinado, reglas_aplicadas, usuario_calculo)"
                                + " VALUES (?, ?, 'PREDIAL', 1, ?, ?, ?, ?,"
                                + "         ARRAY['RT-000']::varchar(200)[], 'prueba') RETURNING id",
                        muni,
                        EJERCICIO,
                        titular,
                        conjuntoId,
                        MIL,
                        CIEN);
        ejecutar(
                app,
                "INSERT INTO determinacion_predio_detalle (municipalidad_id, ejercicio,"
                        + " determinacion_id, predio_id, autovaluo, porcentaje_propiedad,"
                        + " base_imponible_predio)"
                        + " VALUES (?, ?, ?, ?, ?, 100, ?)",
                muni,
                EJERCICIO,
                determinacionId,
                predioId,
                MIL,
                MIL);
        ejecutar(
                app,
                "INSERT INTO cuenta_corriente_asiento (municipalidad_id, ejercicio,"
                        + " contribuyente_id, tributo, concepto, tipo, periodo, predio_id, monto,"
                        + " fecha_valor, documento_origen, usuario_id)"
                        + " VALUES (?, ?, ?, 'PREDIAL', 'INSOLUTO', 'CARGO', 1, ?, ?, ?,"
                        + "         'EM-2026-0001', 'prueba')",
                muni,
                EJERCICIO,
                titular,
                predioId,
                CIEN,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO saldo_proyectado (municipalidad_id, contribuyente_id, predio_id,"
                        + " tributo, ejercicio, periodo, insoluto_saldo)"
                        + " VALUES (?, ?, ?, 'PREDIAL', ?, 1, ?)",
                muni,
                titular,
                predioId,
                EJERCICIO,
                CIEN);
        ejecutar(
                app,
                "INSERT INTO determinacion_arbitrio (municipalidad_id, ejercicio, servicio,"
                        + " periodo, contribuyente_id, predio_id, conjunto_id, monto,"
                        + " parametro_aplicado, fecha_calculo, usuario_calculo)"
                        + " VALUES (?, ?, 'LIMPIEZA_PUBLICA', 1, ?, ?, ?, ?,"
                        + "         'TASA_LIMPIEZA_PUBLICA:S-01:CASA_HABITACION', ?, 'prueba')",
                muni,
                EJERCICIO,
                titular,
                predioId,
                conjuntoId,
                CIEN,
                VIGENCIA);
        return vehiculoId;
    }

    private static String numeroDePlaca(String sufijo) {
        return Integer.toString(100 + Math.abs(sufijo.hashCode() % 800));
    }

    // ------------------------------------------------------------------
    // Tesoreria
    // ------------------------------------------------------------------

    /**
     * La serie de la caja sembrada, {@code varchar(5)} y unica por municipalidad (V29).
     *
     * <p>Se deriva del sufijo del tenant en lugar de ser un {@code '001'} fijo: la unicidad es por
     * municipalidad, asi que un literal serviria igual, pero sembrar dos cajas en un mismo tenant
     * -que es lo que hara la prueba de la caja- chocaria, y el fallo apareceria como un choque de
     * clave unica en el fixture en lugar de como lo que es.
     */
    private static String serieDePrueba(String sufijo) {
        return String.format("%03d", Math.abs(sufijo.hashCode() % 1000));
    }

    private static long sembrarTesoreria(
            Connection app, long muni, String sufijo, long titular, long conjuntoId)
            throws SQLException {
        long areaId =
                insertar(
                        app,
                        "INSERT INTO area (municipalidad_id, codigo, nombre)"
                                + " VALUES (?, ?, 'Unidad de Rentas') RETURNING id",
                        muni,
                        "A-" + sufijo);
        ejecutar(
                app,
                "INSERT INTO tasa (municipalidad_id, codigo, descripcion, area_id,"
                        + " partida_presupuestal, importe, vigencia_desde, documento_fuente)"
                        + " VALUES (?, ?, 'Derecho de tramite', ?, '1.3.1.1.1.1', ?, ?,"
                        + "         'fixture de la prueba')",
                muni,
                "T-" + sufijo,
                areaId,
                CIEN,
                VIGENCIA);
        // La serie es de la caja y es unica en la municipalidad (V29): se deriva del
        // sufijo del tenant para que sembrar dos municipalidades no la repita dentro
        // de ninguna de las dos.
        long cajaId =
                insertar(
                        app,
                        "INSERT INTO caja (municipalidad_id, codigo, nombre, area_id, serie)"
                                + " VALUES (?, ?, 'Caja C-3', ?, ?) RETURNING id",
                        muni,
                        "C-" + sufijo,
                        areaId,
                        serieDePrueba(sufijo));
        // El contador de la serie, que la cobranza incrementa con un UPSERT (V29).
        ejecutar(
                app,
                "INSERT INTO recibo_correlativo (municipalidad_id, serie, ultimo)"
                        + " VALUES (?, ?, 1)",
                muni,
                serieDePrueba(sufijo));
        long turnoId =
                insertar(
                        app,
                        // V32 le retiro a `cierre_caja` las columnas de cierre que V3 le habia
                        // puesto —`estado`, los dos totales, el contador y quien cerro—: decian
                        // ABIERTO para siempre, porque el turno no se actualiza. El cierre y su
                        // reversion viven ahora en `cierre_turno`, y el estado se deriva de ahi.
                        "INSERT INTO cierre_caja (municipalidad_id, caja_id, cajero, fecha,"
                                + " fecha_apertura, usuario_apertura, observacion)"
                                + " VALUES (?, ?, 'prueba', ?, ?, 'prueba',"
                                + "         'turno sembrado por el fixture') RETURNING id",
                        muni,
                        cajaId,
                        VIGENCIA,
                        java.sql.Timestamp.valueOf(VIGENCIA.atStartOfDay()));
        long reciboId =
                insertar(
                        app,
                        "INSERT INTO recibo (municipalidad_id, serie, numero, caja_id, cajero,"
                                + " contribuyente_id, forma_pago, total, turno_id, actualizado_a,"
                                + " usuario_registro, observacion)"
                                + " VALUES (?, ?, 1, ?, 'prueba', ?, 'EFECTIVO', ?, ?, ?,"
                                + "         'prueba', 'recibo sembrado por el fixture')"
                                + " RETURNING id",
                        muni,
                        serieDePrueba(sufijo),
                        cajaId,
                        titular,
                        CIEN,
                        turnoId,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO recibo_detalle (municipalidad_id, recibo_id, tributo, concepto,"
                        + " ejercicio, periodo, monto, insoluto)"
                        + " VALUES (?, ?, 'PREDIAL', 'INSOLUTO', ?, 1, ?, ?)",
                muni,
                reciboId,
                EJERCICIO,
                CIEN,
                CIEN);

        // Un duplicado del recibo (V30, #34): lo que le pasa a un recibo se agrega, no se
        // escribe encima. Se siembra un DUPLICADO y no una ANULACION a proposito: la
        // anulacion es unica por recibo y el fixture no debe consumirla, porque la prueba
        // de la caja necesita poder anular ese mismo recibo.
        ejecutar(
                app,
                "INSERT INTO recibo_movimiento (municipalidad_id, recibo_id, tipo, fecha, caja_id,"
                        + " turno_id, resumen, usuario_registro, observacion)"
                        + " VALUES (?, ?, 'DUPLICADO', ?, ?, ?, ?, 'prueba',"
                        + "         'duplicado sembrado por el fixture')",
                muni,
                reciboId,
                VIGENCIA,
                cajaId,
                turnoId,
                "0".repeat(64));

        // El cierre del turno y su reversion (V32, #36). Se siembran los DOS a proposito:
        // un cierre solo dejaria el turno cerrado, y el fixture describe una caja viva
        // —CajaJdbcTest y las pruebas del cierre cobran contra ella—. Con la reversion, el
        // turno vuelve a estar abierto, que es exactamente lo que #36 decidio que significa
        // reversar un cierre: el arqueo anterior queda intacto y el turno reabre.
        long cierreId =
                insertar(
                        app,
                        "INSERT INTO cierre_turno (municipalidad_id, turno_id, tipo, secuencia,"
                                + " fecha, fecha_registro, total_cobrado, total_anulado, neto,"
                                + " total_declarado, diferencia, recibos_emitidos,"
                                + " recibos_anulados, usuario_registro, observacion)"
                                + " VALUES (?, ?, 'CIERRE', 1, ?, ?, ?, 0, ?, ?, 0, 1, 0,"
                                + "         'prueba', 'cierre sembrado por el fixture')"
                                + " RETURNING id",
                        muni,
                        turnoId,
                        VIGENCIA,
                        java.sql.Timestamp.valueOf(VIGENCIA.atStartOfDay()),
                        CIEN,
                        CIEN,
                        CIEN);
        ejecutar(
                app,
                "INSERT INTO cierre_turno_detalle (municipalidad_id, cierre_id, forma_pago,"
                        + " cobrado, anulado, neto, declarado)"
                        + " VALUES (?, ?, 'EFECTIVO', ?, 0, ?, ?)",
                muni,
                cierreId,
                CIEN,
                CIEN,
                CIEN);
        ejecutar(
                app,
                "INSERT INTO cierre_turno (municipalidad_id, turno_id, tipo, secuencia, fecha,"
                        + " fecha_registro, revierte_a_id, motivo, usuario_registro, observacion)"
                        + " VALUES (?, ?, 'REVERSION', 2, ?, ?, ?, 'el fixture deja la caja"
                        + "  abierta', 'prueba', 'reversion sembrada por el fixture')",
                muni,
                turnoId,
                VIGENCIA,
                java.sql.Timestamp.valueOf(VIGENCIA.atStartOfDay()),
                cierreId);

        // Un convenio de fraccionamiento (V31, #35), con su correlativo, su cronograma, la
        // deuda que acogio y su formalizacion. Su `recibo_inicial_id` ya no existe: el
        // recibo que cobro la inicial viaja en el movimiento de FORMALIZACION, que es donde
        // el hecho ocurre.
        //
        // Se siembra la FORMALIZACION y no un cierre a proposito: el cierre es unico por
        // convenio y ademas es el que devuelve la deuda a su fase, asi que sembrarlo dejaria
        // el fixture describiendo un convenio ya muerto.
        ejecutar(
                app,
                "INSERT INTO convenio_correlativo (municipalidad_id, ejercicio, ultimo)"
                        + " VALUES (?, ?, 1)",
                muni,
                EJERCICIO);
        long convenioId =
                insertar(
                        app,
                        "INSERT INTO convenio (municipalidad_id, numero, contribuyente_id, tipo,"
                                + " fecha, fecha_corte, conjunto_id, interes_mensual,"
                                + " porcentaje_inicial, maximo_cuotas, monto_total, cuota_inicial,"
                                + " numero_cuotas, usuario_registro, observacion, fecha_registro)"
                                + " VALUES (?, ?, ?, 'ORDINARIO', ?, ?, ?, 1.0000, 10.0000, 12, ?,"
                                + "         ?, 6, 'prueba', 'convenio sembrado por el fixture',"
                                + "         now()) RETURNING id",
                        muni,
                        "CV-" + sufijo,
                        titular,
                        VIGENCIA,
                        VIGENCIA,
                        conjuntoId,
                        MIL,
                        CIEN);
        ejecutar(
                app,
                "INSERT INTO convenio_cuota (municipalidad_id, convenio_id, numero, vencimiento,"
                        + " monto, capital) VALUES (?, ?, 1, ?, ?, ?)",
                muni,
                convenioId,
                VIGENCIA.plusMonths(1),
                CIEN,
                CIEN);
        ejecutar(
                app,
                "INSERT INTO convenio_deuda (municipalidad_id, convenio_id, tributo, ejercicio,"
                        + " periodo, fase_origen, insoluto, monto, fecha_corte)"
                        + " VALUES (?, ?, 'PREDIAL', ?, 1, 'ORDINARIA', ?, ?, ?)",
                muni,
                convenioId,
                EJERCICIO,
                MIL,
                MIL,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO convenio_movimiento (municipalidad_id, convenio_id, tipo, fecha,"
                        + " recibo_id, cuota, importe, asientos, usuario_registro, fecha_registro,"
                        + " observacion)"
                        + " VALUES (?, ?, 'FORMALIZACION', ?, ?, 0, ?, 2, 'prueba', now(),"
                        + "         'formalizacion sembrada por el fixture')",
                muni,
                convenioId,
                VIGENCIA,
                reciboId,
                MIL);
        return reciboId;
    }

    // ------------------------------------------------------------------
    // Valores y coactiva
    // ------------------------------------------------------------------

    private static long sembrarValoresYCoactiva(
            Connection app, long muni, String sufijo, long titular, long conjuntoId)
            throws SQLException {
        long valorId =
                insertar(
                        app,
                        "INSERT INTO valor (municipalidad_id, tipo, numero, ejercicio,"
                                + " contribuyente_id, fecha_emision, base_legal, monto_insoluto,"
                                + " monto_total, proyectado_a, usuario_registro, observacion)"
                                + " VALUES (?, 'OP', ?, ?, ?, ?, 'ART. 78 DEL CODIGO TRIBUTARIO', ?, ?,"
                                + "         ?, 'prueba', 'valor de prueba') RETURNING id",
                        muni,
                        "OP-" + sufijo,
                        EJERCICIO,
                        titular,
                        VIGENCIA,
                        CIEN,
                        CIEN,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO valor_detalle (municipalidad_id, valor_id, tributo, ejercicio, periodo,"
                        + " insoluto) VALUES (?, ?, 'PREDIAL', ?, 1, ?)",
                muni,
                valorId,
                EJERCICIO,
                CIEN);
        ejecutar(
                app,
                "INSERT INTO valor_correlativo (municipalidad_id, tipo, ejercicio, ultimo)"
                        + " VALUES (?, 'OP', ?, 1)",
                muni,
                EJERCICIO);

        // #38: una corrida masiva ya resuelta -el mismo valor de arriba, referenciado
        // desde su item- y una todavia pendiente, para que la prueba de aislamiento
        // tenga fila que ver en los dos estados de valor_masivo_item.
        long corridaMasivaId =
                insertar(
                        app,
                        "INSERT INTO valor_masivo (municipalidad_id, tipo, ejercicio_desde,"
                                + " ejercicio_hasta, fecha_criterio, origen, total_candidatos,"
                                + " usuario_registro, observacion)"
                                + " VALUES (?, 'OP', ?, ?, ?, 'SELECCION', 1, 'prueba',"
                                + "         'corrida masiva de prueba') RETURNING id",
                        muni,
                        EJERCICIO,
                        EJERCICIO,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO valor_masivo_item (municipalidad_id, corrida_id, contribuyente_id,"
                        + " estado, valor_id, fecha_procesado)"
                        + " VALUES (?, ?, ?, 'GENERADO', ?, now())",
                muni,
                corridaMasivaId,
                titular,
                valorId);
        // #39: dos diligencias sobre el mismo valor. La primera no ubico el domicilio
        // -y por eso no lleva exigibilidad-; la segunda notifico. Las dos filas conviven:
        // es el reintento que la tabla tiene que admitir sin borrar el intento anterior.
        ejecutar(
                app,
                "INSERT INTO notificacion (municipalidad_id, objeto, objeto_id, numero, intento,"
                        + " fecha_notificacion, modalidad, resultado, notificador, direccion,"
                        + " usuario_registro, observacion)"
                        + " VALUES (?, 'VALOR', ?, ?, 1, ?, 'PERSONAL', 'NO_UBICADO', 'prueba',"
                        + "         'domicilio de prueba', 'prueba', 'no se ubico el domicilio')",
                muni,
                valorId,
                "NT1-" + sufijo,
                VIGENCIA);
        long notificacionId =
                insertar(
                        app,
                        "INSERT INTO notificacion (municipalidad_id, objeto, objeto_id, numero,"
                                + " intento, fecha_notificacion, modalidad, resultado, notificador,"
                                + " direccion, receptor, exigible_desde, conjunto_id,"
                                + " usuario_registro, observacion)"
                                + " VALUES (?, 'VALOR', ?, ?, 2, ?, 'PERSONAL', 'NOTIFICADO',"
                                + "         'prueba', 'domicilio de prueba', 'quien recibe', ?, ?,"
                                + "         'prueba', 'notificacion de prueba') RETURNING id",
                        muni,
                        valorId,
                        "NT2-" + sufijo,
                        VIGENCIA,
                        VIGENCIA,
                        conjuntoId);
        ejecutar(
                app,
                "INSERT INTO valor_movimiento (municipalidad_id, valor_id, tipo, fecha,"
                        + " notificacion_id, exigible_desde, usuario_registro, observacion)"
                        + " VALUES (?, ?, 'PCO', ?, ?, ?, 'prueba', 'pase de prueba')",
                muni,
                valorId,
                VIGENCIA,
                notificacionId,
                VIGENCIA);

        long prescripcionId =
                insertar(
                        app,
                        "INSERT INTO prescripcion (municipalidad_id, contribuyente_id, tributo,"
                                + " ejercicio_desde, ejercicio_hasta, fecha_presentacion, causal,"
                                + " plazo_anios, conjunto_id, resultado, usuario_registro,"
                                + " observacion)"
                                + " VALUES (?, ?, 'PREDIAL', ?, ?, ?, 'DECLARACION_PRESENTADA', 4,"
                                + "         ?, 'NO_PROCEDE', 'prueba', 'solicitud de prueba')"
                                + " RETURNING id",
                        muni,
                        titular,
                        EJERCICIO,
                        EJERCICIO,
                        VIGENCIA,
                        conjuntoId);
        ejecutar(
                app,
                "INSERT INTO prescripcion_ejercicio (municipalidad_id, prescripcion_id, ejercicio,"
                        + " inicio_computo, inicio_vigente, fecha_prescripcion, prescrita)"
                        + " VALUES (?, ?, ?, ?, ?, ?, false)",
                muni,
                prescripcionId,
                EJERCICIO,
                VIGENCIA,
                VIGENCIA,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO prescripcion_hecho (municipalidad_id, prescripcion_id, clase, causal,"
                        + " fecha_desde)"
                        + " VALUES (?, ?, 'INTERRUPCION', 'pago parcial de la deuda', ?)",
                muni,
                prescripcionId,
                VIGENCIA);

        ejecutar(
                app,
                "INSERT INTO expediente_correlativo (municipalidad_id, ejercicio, ultimo)"
                        + " VALUES (?, ?, 1)",
                muni,
                EJERCICIO);
        long expedienteId =
                insertar(
                        app,
                        "INSERT INTO expediente_coactivo (municipalidad_id, numero, ejercicio,"
                                + " correlativo, contribuyente_id, ejecutor, fecha_apertura,"
                                + " usuario_registro, fecha_registro, observacion)"
                                + " VALUES (?, ?, ?, 1, ?, 'ejecutor', ?, 'prueba', now(),"
                                + "         'expediente de prueba')"
                                + " RETURNING id",
                        muni,
                        "EXP-" + sufijo,
                        EJERCICIO,
                        titular,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO expediente_valor (municipalidad_id, expediente_id, valor_id,"
                        + " fecha_importacion)"
                        + " VALUES (?, ?, ?, ?)",
                muni,
                expedienteId,
                valorId,
                VIGENCIA);
        // La apertura del expediente: sin ella su estado no se puede derivar (V33, #40).
        ejecutar(
                app,
                "INSERT INTO expediente_movimiento (municipalidad_id, expediente_id, tipo, estado,"
                        + " fecha, motivo, usuario_registro, fecha_registro, observacion)"
                        + " VALUES (?, ?, 'APERTURA', 'INICIADO', ?, 'importacion de prueba',"
                        + "         'prueba', now(), 'apertura de prueba')",
                muni,
                expedienteId,
                VIGENCIA);
        // El acto coactivo se materializa en un documento emitido (V34, #41): el numero del acto
        // ES el del documento, y sin la fila del documento el acto no se puede reimprimir. Por eso
        // la siembra crea las dos, en ese orden.
        long documentoDeLaRec =
                insertar(
                        app,
                        "INSERT INTO documento_emitido (municipalidad_id, tipo, numero, ejercicio,"
                                + " referencia, datos, formato, resumen, fecha_emision,"
                                + " usuario_emision, observacion)"
                                + " VALUES (?, 'REC1', ?, 2026, ?, CAST(? AS jsonb), 'PDF',"
                                + "         repeat('b', 64), ?, 'siembra',"
                                + "         'REC de prueba') RETURNING id",
                        muni,
                        "REC1-2026-" + sufijo,
                        "EXP-" + sufijo,
                        "{\"titulo\":\"RESOLUCION DE EJECUCION COACTIVA\",\"subtitulo\":null,"
                                + "\"aLaFecha\":\"2026-01-01\",\"cabecera\":[],\"tablas\":[],"
                                + "\"pie\":[],\"duplicado\":null}",
                        VIGENCIA);
        long actoDeLaRec =
                insertar(
                        app,
                        "INSERT INTO acto_coactivo (municipalidad_id, expediente_id, tipo, numero,"
                                + " fecha, descripcion, documento_id, usuario_registro,"
                                + " fecha_registro, observacion)"
                                + " VALUES (?, ?, 'REC1', ?, ?, 'Resolucion de ejecucion"
                                + " coactiva', ?, 'prueba', now(), 'REC de prueba')"
                                + " RETURNING id",
                        muni,
                        expedienteId,
                        "REC1-2026-" + sufijo,
                        VIGENCIA,
                        documentoDeLaRec);
        // La costa cuelga de una liquidacion y tarifa UN acto (V35, #42): antes colgaba del
        // expediente y nada mas, y asi «la liquidacion 000123» no tenia sujeto.
        ejecutar(
                app,
                "INSERT INTO liquidacion_costas_correlativo (municipalidad_id, ejercicio, ultimo)"
                        + " VALUES (?, ?, 1)",
                muni,
                EJERCICIO);
        long liquidacionId =
                insertar(
                        app,
                        "INSERT INTO liquidacion_costas (municipalidad_id, numero, ejercicio,"
                                + " correlativo, expediente_id, contribuyente_id, tributo, fecha,"
                                + " conjunto_id, total, usuario_registro, fecha_registro,"
                                + " observacion)"
                                + " VALUES (?, ?, ?, 1, ?, ?, 'COSTAS PROCESALES', ?, ?, ?,"
                                + "         'prueba', now(), 'liquidacion de prueba')"
                                + " RETURNING id",
                        muni,
                        "LC-" + sufijo,
                        EJERCICIO,
                        expedienteId,
                        titular,
                        VIGENCIA,
                        conjuntoId,
                        CIEN);
        ejecutar(
                app,
                "INSERT INTO costa_procesal (municipalidad_id, liquidacion_id, expediente_id,"
                        + " acto_id, acto_tipo, concepto, tributo, monto, fecha, arancel_fuente,"
                        + " arancel_conjunto_id)"
                        + " VALUES (?, ?, ?, ?, 'REC1', 'Notificacion', 'COSTAS PROCESALES', ?, ?,"
                        + "         'fixture de la prueba', ?)",
                muni,
                liquidacionId,
                expedienteId,
                actoDeLaRec,
                CIEN,
                VIGENCIA,
                conjuntoId);
        // Y la obligacion de costas queda reclamada por este expediente (V35 §3): sin la fila, dos
        // expedientes del mismo obligado compartirian obligacion sin que nada fallara.
        ejecutar(
                app,
                "INSERT INTO costa_obligacion (municipalidad_id, contribuyente_id, tributo,"
                        + " ejercicio, expediente_id)"
                        + " VALUES (?, ?, 'COSTAS PROCESALES', ?, ?)"
                        + " ON CONFLICT DO NOTHING",
                muni,
                titular,
                EJERCICIO,
                expedienteId);
        return valorId;
    }

    // ------------------------------------------------------------------
    // Sanciones y fiscalizacion
    // ------------------------------------------------------------------

    private static void sembrarSanciones(
            Connection app,
            long muni,
            String sufijo,
            long titular,
            long segundo,
            long vehiculoId,
            long predioId)
            throws SQLException {
        long codigoId =
                insertar(
                        app,
                        "INSERT INTO codigo_infraccion (municipalidad_id, familia, codigo,"
                                + " descripcion, porcentaje_uit, base_legal, vigencia_desde)"
                                + " VALUES (?, 'TRANSITO', ?, 'Infraccion de prueba', 1.0000,"
                                + "         'fixture de la prueba', ?) RETURNING id",
                        muni,
                        "G-" + sufijo,
                        VIGENCIA);
        long notificacionId =
                insertar(
                        app,
                        "INSERT INTO notificacion_administrativa (municipalidad_id, numero, fecha,"
                                + " contribuyente_id, predio_id, direccion, motivo,"
                                + " usuario_registro)"
                                + " VALUES (?, ?, ?, ?, ?, 'Jr. Union', 'motivo de prueba',"
                                + "         'prueba') RETURNING id",
                        muni,
                        "NA-" + sufijo,
                        VIGENCIA,
                        titular,
                        predioId);
        long papeletaId =
                insertar(
                        app,
                        "INSERT INTO papeleta (municipalidad_id, familia, numero,"
                                + " codigo_infraccion_id, fecha_infraccion, lugar, placa, vehiculo_id,"
                                + " infractor_id, propietario_id, base_imponible,"
                                + " porcentaje_infraccion, importe_infraccion, porcentaje_a_cobrar,"
                                + " importe_a_pagar, usuario_registro, observacion)"
                                + " VALUES (?, 'TRANSITO', ?, ?, ?, 'Av. Grau', ?, ?, ?, ?, ?, 8.0000,"
                                + "         ?, 100.0000, ?, 'prueba', 'papeleta de prueba')"
                                + " RETURNING id",
                        muni,
                        "PT-" + sufijo,
                        codigoId,
                        VIGENCIA,
                        "ABC-" + numeroDePlaca(sufijo),
                        vehiculoId,
                        segundo,
                        titular,
                        MIL,
                        CIEN,
                        CIEN);
        ejecutar(
                app,
                "INSERT INTO papeleta_cambio_numero (municipalidad_id, papeleta_id, numero_anterior,"
                        + " numero_nuevo, usuario, motivo)"
                        + " VALUES (?, ?, ?, ?, 'prueba', 'correccion de prueba')",
                muni,
                papeletaId,
                "PT-VIEJO-" + sufijo,
                "PT-" + sufijo);
        ejecutar(
                app,
                "INSERT INTO descargo (municipalidad_id, papeleta_id, fecha, sustento,"
                        + " resultado, usuario_registro)"
                        + " VALUES (?, ?, ?, 'sustento de prueba', 'EN_TRAMITE', 'prueba')",
                muni,
                papeletaId,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO internamiento (municipalidad_id, papeleta_id, vehiculo_id, placa,"
                        + " deposito, fecha_ingreso, observacion)"
                        + " VALUES (?, ?, ?, ?, 'Deposito municipal', ?,"
                        + "         'internamiento de prueba')",
                muni,
                papeletaId,
                vehiculoId,
                "ABC-" + numeroDePlaca(sufijo),
                OffsetDateTime.of(VIGENCIA.atStartOfDay(), ZoneOffset.UTC));

        long programaId =
                insertar(
                        app,
                        "INSERT INTO programa_fiscalizacion (municipalidad_id, codigo, descripcion,"
                                + " tipo, fecha_inicio)"
                                + " VALUES (?, ?, 'Programa de prueba', 'PREDIAL', ?) RETURNING id",
                        muni,
                        "PF-" + sufijo,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO acta_fiscalizacion (municipalidad_id, programa_id, version,"
                        + " contribuyente_id, predio_id, fecha_visita, fiscalizador, hallazgo,"
                        + " observacion, usuario_registro)"
                        + " VALUES (?, ?, 1, ?, ?, ?, 'fiscalizador', 'CONFORME',"
                        + "         'acta de prueba', 'prueba')",
                muni,
                programaId,
                titular,
                predioId,
                VIGENCIA);

        if (notificacionId <= 0) {
            throw new IllegalStateException("No se sembro la notificacion administrativa");
        }
    }

    // ------------------------------------------------------------------
    // Licencias
    // ------------------------------------------------------------------

    private static void sembrarLicencias(
            Connection app, long muni, String sufijo, long titular, long predioId, long reciboId)
            throws SQLException {
        // V37 (#44) le puso a `ciiu` su traza —quien lo agrego, por que y cuando— y a la
        // licencia y su duplicado el documento que los materializa. La siembra los rellena: son
        // columnas NOT NULL, y una siembra que las esquivara dejaria la prueba de aislamiento sin
        // filas de licencias que aislar.
        long ciiuId =
                insertar(
                        app,
                        "INSERT INTO ciiu (municipalidad_id, codigo, descripcion, seccion,"
                                + " riesgo_itse, requiere_sectorial, usuario_registro,"
                                + " observacion, fecha_registro)"
                                + " VALUES (?, ?, 'Actividad de prueba', 'G', 'BAJO', false,"
                                + "         'prueba', 'giro de prueba', ?) RETURNING id",
                        muni,
                        "4711-" + sufijo,
                        VIGENCIA);
        long documentoDeLaLicencia =
                insertar(
                        app,
                        "INSERT INTO documento_emitido (municipalidad_id, tipo, numero, ejercicio,"
                                + " referencia, datos, formato, resumen, fecha_emision,"
                                + " usuario_emision, observacion)"
                                + " VALUES (?, 'LICENCIA_FUNCIONAMIENTO', ?, 2026, ?,"
                                + "         CAST(? AS jsonb), 'PDF', repeat('c', 64), ?,"
                                + "         'siembra', 'licencia de prueba') RETURNING id",
                        muni,
                        "LICENCIA_FUNCIONAMIENTO-2026-" + sufijo,
                        "LF-" + sufijo,
                        MODELO_DE_DOCUMENTO,
                        VIGENCIA);
        long documentoDelDuplicado =
                insertar(
                        app,
                        "INSERT INTO documento_emitido (municipalidad_id, tipo, numero, ejercicio,"
                                + " referencia, datos, formato, resumen, fecha_emision,"
                                + " usuario_emision, observacion)"
                                + " VALUES (?, 'RES_DUPLICADO_LICENCIA', ?, 2026, ?,"
                                + "         CAST(? AS jsonb), 'PDF', repeat('d', 64), ?,"
                                + "         'siembra', 'resolucion de duplicado') RETURNING id",
                        muni,
                        "RES_DUPLICADO_LICENCIA-2026-" + sufijo,
                        "LF-" + sufijo,
                        MODELO_DE_DOCUMENTO,
                        VIGENCIA);
        long licenciaId =
                insertar(
                        app,
                        "INSERT INTO licencia_funcionamiento (municipalidad_id, numero,"
                                + " contribuyente_id, predio_id, nombre_comercial, direccion,"
                                + " area_solicitada, tipo_licencia, fecha_emision, recibo_id,"
                                + " documento_id, fecha_registro, usuario_registro, observacion)"
                                + " VALUES (?, ?, ?, ?, 'Bodega de prueba', 'Jr. Union', 40.00,"
                                + "         'DEFINITIVA', ?, ?, ?, ?, 'prueba',"
                                + "         'licencia de prueba')"
                                + " RETURNING id",
                        muni,
                        "LF-" + sufijo,
                        titular,
                        predioId,
                        VIGENCIA,
                        reciboId,
                        documentoDeLaLicencia,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO licencia_giro (municipalidad_id, licencia_id, ciiu_id, principal)"
                        + " VALUES (?, ?, ?, true)",
                muni,
                licenciaId,
                ciiuId);
        ejecutar(
                app,
                "INSERT INTO licencia_duplicado (municipalidad_id, licencia_id, numero, fecha,"
                        + " motivo, recibo_id, documento_id, reimpresion, usuario_registro,"
                        + " fecha_registro, observacion)"
                        + " VALUES (?, ?, 1, ?, 'deterioro del original', ?, ?, 1, 'prueba', ?,"
                        + "         'duplicado de prueba')",
                muni,
                licenciaId,
                VIGENCIA,
                reciboId,
                documentoDelDuplicado,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO licencia_movimiento (municipalidad_id, licencia_id, tipo, fecha,"
                        + " documento_id, documento_numero, usuario_registro, fecha_registro,"
                        + " observacion)"
                        + " VALUES (?, ?, 'EMISION', ?, ?, ?, 'prueba', ?,"
                        + "         'emision de prueba')",
                muni,
                licenciaId,
                VIGENCIA,
                documentoDeLaLicencia,
                "LICENCIA_FUNCIONAMIENTO-2026-" + sufijo,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO licencia_correlativo (municipalidad_id, ejercicio, ultimo)"
                        + " VALUES (?, 2026, 1)",
                muni);
        ejecutar(
                app,
                "INSERT INTO licencia_edificacion (municipalidad_id, numero, contribuyente_id,"
                        + " predio_id, modalidad, tipo_obra, area_terreno, area_construida,"
                        + " valor_obra, fecha_emision, usuario_registro, observacion)"
                        + " VALUES (?, ?, ?, ?, 'A', 'OBRA_NUEVA', 120.00, 80.00, ?, ?, 'prueba',"
                        + "         'licencia de edificacion de prueba')",
                muni,
                "LE-" + sufijo,
                titular,
                predioId,
                MIL,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO anuncio (municipalidad_id, numero, contribuyente_id, predio_id, tipo,"
                        + " ubicacion, area, fecha_autorizacion, usuario_registro, observacion)"
                        + " VALUES (?, ?, ?, ?, 'PANEL', 'Fachada', 6.00, ?, 'prueba',"
                        + "         'anuncio de prueba')",
                muni,
                "AN-" + sufijo,
                titular,
                predioId,
                VIGENCIA);
    }

    // ------------------------------------------------------------------
    // Seguridad y auditoria
    // ------------------------------------------------------------------

    private static void sembrarSeguridad(Connection app, long muni, String sufijo)
            throws SQLException {
        long moduloId =
                insertar(
                        app,
                        "INSERT INTO modulo_sistema (municipalidad_id, codigo, nombre)"
                                + " VALUES (?, ?, 'Rentas') RETURNING id",
                        muni,
                        "MOD-" + sufijo);
        long accesoId =
                insertar(
                        app,
                        "INSERT INTO acceso (municipalidad_id, modulo_id, tipo, codigo, nombre)"
                                + " VALUES (?, ?, 'OPCION_MENU', ?, 'Contribuyentes') RETURNING id",
                        muni,
                        moduloId,
                        "contribuyentes-" + sufijo);
        long grupoId =
                insertar(
                        app,
                        "INSERT INTO grupo (municipalidad_id, nombre, descripcion)"
                                + " VALUES (?, ?, 'Grupo de prueba') RETURNING id",
                        muni,
                        "Cajeros " + sufijo);
        long usuarioId =
                insertar(
                        app,
                        "INSERT INTO usuario (municipalidad_id, cuenta, nombre)"
                                + " VALUES (?, ?, 'Usuario de prueba') RETURNING id",
                        muni,
                        "usuario-" + sufijo);
        ejecutar(
                app,
                "INSERT INTO miembro (municipalidad_id, grupo_id, usuario_id, usuario_alta)"
                        + " VALUES (?, ?, ?, 'prueba')",
                muni,
                grupoId,
                usuarioId);
        ejecutar(
                app,
                "INSERT INTO permiso (municipalidad_id, acceso_id, grupo_id, lectura, registro,"
                        + " usuario_registro) VALUES (?, ?, ?, true, true, 'prueba')",
                muni,
                accesoId,
                grupoId);
        ejecutar(
                app,
                "INSERT INTO sesion (municipalidad_id, usuario_id, origen_equipo, origen_ip,"
                        + " ejercicio_trabajo)"
                        + " VALUES (?, ?, 'PC-PRUEBA', CAST(? AS inet), ?)",
                muni,
                usuarioId,
                "10.0.0.1",
                EJERCICIO);
        ejecutar(
                app,
                "INSERT INTO auditoria (municipalidad_id, ejercicio, tabla, clave, operacion,"
                        + " usuario_id, origen_equipo, origen_ip, observacion)"
                        + " VALUES (?, ?, 'contribuyente', '1', 'ALTA', 'prueba', 'PC-PRUEBA',"
                        + "         CAST(? AS inet), 'alta inicial de la prueba de aislamiento')",
                muni,
                EJERCICIO,
                "10.0.0.1");
    }

    /** Identificador del contribuyente titular sembrado en una municipalidad. */
    public static long contribuyenteDe(BaseDeDatosDePrueba base, long municipalidadId)
            throws SQLException {
        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia =
                        admin.prepareStatement(
                                "SELECT id FROM contribuyente WHERE municipalidad_id = ?"
                                        + " ORDER BY id LIMIT 1")) {
            sentencia.setLong(1, municipalidadId);
            return unicoLong(sentencia);
        }
    }

    // ------------------------------------------------------------------
    // Utilidades
    // ------------------------------------------------------------------

    private static long insertar(Connection conexion, String sql, Object... valores)
            throws SQLException {
        try (PreparedStatement sentencia = conexion.prepareStatement(sql)) {
            fijar(sentencia, valores);
            return unicoLong(sentencia);
        }
    }

    private static void ejecutar(Connection conexion, String sql, Object... valores)
            throws SQLException {
        try (PreparedStatement sentencia = conexion.prepareStatement(sql)) {
            fijar(sentencia, valores);
            sentencia.executeUpdate();
        }
    }

    private static void fijar(PreparedStatement sentencia, Object... valores) throws SQLException {
        for (int i = 0; i < valores.length; i++) {
            sentencia.setObject(i + 1, valores[i]);
        }
    }

    private static long unicoLong(PreparedStatement sentencia) throws SQLException {
        try (ResultSet resultado = sentencia.executeQuery()) {
            if (!resultado.next()) {
                throw new IllegalStateException("La sentencia no devolvio ninguna fila");
            }
            return resultado.getLong(1);
        }
    }
}
