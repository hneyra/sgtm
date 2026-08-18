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
            long predioId = sembrarCatastro(app, muni, sufijo, titular);
            long vehiculoId =
                    sembrarRentas(app, muni, sufijo, titular, segundo, predioId, conjuntoId);
            long reciboId = sembrarTesoreria(app, muni, sufijo, titular);
            long valorId = sembrarValoresYCoactiva(app, muni, sufijo, titular);
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

    private static long sembrarCatastro(Connection app, long muni, String sufijo, long titular)
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

        // Tablas de valuacion. Valores de relleno: los normativos siguen en D-02.
        ejecutar(
                app,
                "INSERT INTO arancel (municipalidad_id, ejercicio, via_id, valor_m2,"
                        + " documento_fuente)"
                        + " VALUES (?, ?, ?, 1.000000, 'fixture de la prueba')",
                muni,
                EJERCICIO,
                viaId);
        ejecutar(
                app,
                "INSERT INTO valor_unitario_edificacion (municipalidad_id, ejercicio, partida,"
                        + " categoria, valor_m2, documento_fuente)"
                        + " VALUES (?, ?, 'MUROS', 'C', 1.000000, 'fixture de la prueba')",
                muni,
                EJERCICIO);
        ejecutar(
                app,
                "INSERT INTO depreciacion (municipalidad_id, ejercicio, material,"
                        + " estado_conservacion, antiguedad_hasta, porcentaje, documento_fuente)"
                        + " VALUES (?, ?, 'CONCRETO', 'BUENO', 10, 1.0000,"
                        + "         'fixture de la prueba')",
                muni,
                EJERCICIO);
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
        ejecutar(
                app,
                "INSERT INTO valor_referencial_vehiculo (municipalidad_id, ejercicio, marca, modelo,"
                        + " anio_fabricacion, valor, documento_fuente)"
                        + " VALUES (?, ?, 'MARCA', 'MODELO', 2020, ?, 'fixture de la prueba')",
                muni,
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

        ejecutar(
                app,
                "INSERT INTO determinacion (municipalidad_id, ejercicio, tributo, periodo,"
                        + " contribuyente_id, predio_id, conjunto_id, base_imponible,"
                        + " monto_determinado, reglas_aplicadas, usuario_calculo)"
                        + " VALUES (?, ?, 'PREDIAL', 1, ?, ?, ?, ?, ?,"
                        + "         ARRAY['RT-000']::varchar(200)[], 'prueba')",
                muni,
                EJERCICIO,
                titular,
                predioId,
                conjuntoId,
                MIL,
                CIEN);
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
        return vehiculoId;
    }

    private static String numeroDePlaca(String sufijo) {
        return Integer.toString(100 + Math.abs(sufijo.hashCode() % 800));
    }

    // ------------------------------------------------------------------
    // Tesoreria
    // ------------------------------------------------------------------

    private static long sembrarTesoreria(Connection app, long muni, String sufijo, long titular)
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
        long cajaId =
                insertar(
                        app,
                        "INSERT INTO caja (municipalidad_id, codigo, nombre, area_id)"
                                + " VALUES (?, ?, 'Caja C-3', ?) RETURNING id",
                        muni,
                        "C-" + sufijo,
                        areaId);
        long reciboId =
                insertar(
                        app,
                        "INSERT INTO recibo (municipalidad_id, serie, numero, caja_id, cajero,"
                                + " contribuyente_id, forma_pago, total)"
                                + " VALUES (?, '001', 1, ?, 'prueba', ?, 'EFECTIVO', ?)"
                                + " RETURNING id",
                        muni,
                        cajaId,
                        titular,
                        CIEN);
        ejecutar(
                app,
                "INSERT INTO recibo_detalle (municipalidad_id, recibo_id, tributo, concepto,"
                        + " ejercicio, periodo, monto)"
                        + " VALUES (?, ?, 'PREDIAL', 'INSOLUTO', ?, 1, ?)",
                muni,
                reciboId,
                EJERCICIO,
                CIEN);
        ejecutar(
                app,
                "INSERT INTO cierre_caja (municipalidad_id, caja_id, cajero, fecha, total_efectivo,"
                        + " cantidad_recibos)"
                        + " VALUES (?, ?, 'prueba', ?, ?, 1)",
                muni,
                cajaId,
                VIGENCIA,
                CIEN);

        long convenioId =
                insertar(
                        app,
                        "INSERT INTO convenio (municipalidad_id, numero, contribuyente_id, tipo,"
                                + " fecha, monto_total, cuota_inicial, numero_cuotas,"
                                + " recibo_inicial_id)"
                                + " VALUES (?, ?, ?, 'ORDINARIO', ?, ?, ?, 6, ?) RETURNING id",
                        muni,
                        "CV-" + sufijo,
                        titular,
                        VIGENCIA,
                        MIL,
                        CIEN,
                        reciboId);
        ejecutar(
                app,
                "INSERT INTO convenio_cuota (municipalidad_id, convenio_id, numero, vencimiento,"
                        + " monto) VALUES (?, ?, 1, ?, ?)",
                muni,
                convenioId,
                VIGENCIA.plusMonths(1),
                CIEN);
        return reciboId;
    }

    // ------------------------------------------------------------------
    // Valores y coactiva
    // ------------------------------------------------------------------

    private static long sembrarValoresYCoactiva(
            Connection app, long muni, String sufijo, long titular) throws SQLException {
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
                "INSERT INTO notificacion (municipalidad_id, objeto, objeto_id, numero,"
                        + " fecha_notificacion, modalidad, resultado, notificador)"
                        + " VALUES (?, 'VALOR', ?, ?, ?, 'PERSONAL', 'NOTIFICADO', 'prueba')",
                muni,
                valorId,
                "NT-" + sufijo,
                VIGENCIA);

        long expedienteId =
                insertar(
                        app,
                        "INSERT INTO expediente_coactivo (municipalidad_id, numero,"
                                + " contribuyente_id, ejecutor, fecha_apertura, observacion)"
                                + " VALUES (?, ?, ?, 'ejecutor', ?, 'expediente de prueba')"
                                + " RETURNING id",
                        muni,
                        "EXP-" + sufijo,
                        titular,
                        VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO expediente_valor (municipalidad_id, expediente_id, valor_id)"
                        + " VALUES (?, ?, ?)",
                muni,
                expedienteId,
                valorId);
        ejecutar(
                app,
                "INSERT INTO acto_coactivo (municipalidad_id, expediente_id, tipo, numero, fecha,"
                        + " descripcion, usuario_registro)"
                        + " VALUES (?, ?, 'REC1', ?, ?, 'Resolucion de ejecucion coactiva',"
                        + "         'prueba')",
                muni,
                expedienteId,
                "REC-" + sufijo,
                VIGENCIA);
        ejecutar(
                app,
                "INSERT INTO costa_procesal (municipalidad_id, expediente_id, concepto, monto,"
                        + " fecha, arancel_fuente)"
                        + " VALUES (?, ?, 'Notificacion', ?, ?, 'fixture de la prueba')",
                muni,
                expedienteId,
                CIEN,
                VIGENCIA);
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
        long ciiuId =
                insertar(
                        app,
                        "INSERT INTO ciiu (municipalidad_id, codigo, descripcion)"
                                + " VALUES (?, ?, 'Actividad de prueba') RETURNING id",
                        muni,
                        "4711-" + sufijo);
        long licenciaId =
                insertar(
                        app,
                        "INSERT INTO licencia_funcionamiento (municipalidad_id, numero,"
                                + " contribuyente_id, predio_id, nombre_comercial, direccion,"
                                + " area_solicitada, tipo_licencia, fecha_emision, recibo_id,"
                                + " usuario_registro, observacion)"
                                + " VALUES (?, ?, ?, ?, 'Bodega de prueba', 'Jr. Union', 40.00,"
                                + "         'DEFINITIVA', ?, ?, 'prueba', 'licencia de prueba')"
                                + " RETURNING id",
                        muni,
                        "LF-" + sufijo,
                        titular,
                        predioId,
                        VIGENCIA,
                        reciboId);
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
                        + " motivo, recibo_id)"
                        + " VALUES (?, ?, 1, ?, 'deterioro del original', ?)",
                muni,
                licenciaId,
                VIGENCIA,
                reciboId);
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
