package pe.gob.sgtm.verificaciones;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.core.domain.JavaParameter;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

/**
 * Las reglas de ARQ-04 §2 que pueden expresarse como regla de ArchUnit, expresadas como regla de
 * ArchUnit.
 *
 * <p>El objetivo declarado del estandar: una prohibicion que solo vive en un documento se incumple
 * en seis meses.
 *
 * <p>Estan aqui como constantes, y no dentro de las pruebas, porque se usan dos veces: {@link
 * ArquitecturaTest} las aplica al codigo de produccion y {@link ReglasDeArquitecturaMuerdenTest}
 * las aplica a clases de muestra que las violan a proposito. Lo segundo importa tanto como lo
 * primero: hoy los contextos acotados estan vacios, asi que casi todas estas reglas pasarian en
 * verde por no tener nada que revisar.
 *
 * <h2>Lo que NO esta aqui</h2>
 *
 * <p>{@code SET SESSION}, el {@code DELETE} sobre tablas protegidas y el {@code UPDATE} sobre las
 * inmutables no son estructura de clases sino texto: los revisa {@link RevisorDeCodigoFuente}. Y
 * las que dependen de juicio —literal numerico tributario, observacion obligatoria— siguen en
 * revision humana.
 */
public final class ReglasDeArquitectura {

    private static final String PAQUETE_RAIZ = "pe.gob.sgtm";
    private static final Set<String> TIPOS_COMA_FLOTANTE =
            Set.of("double", "float", "java.lang.Double", "java.lang.Float");

    /**
     * Los objetos de valor del dominio compartido que envuelven un decimal.
     *
     * <p>Son la excepcion a {@link #NINGUNA_FIRMA_DE_DOMINIO_EXPONE_BIGDECIMAL}, y la unica: la
     * regla existe para que las reglas tributarias no manejen {@code BigDecimal} suelto, no para
     * impedir que el tipo que lo guarda pueda devolverlo. Sin esta lista, la alternativa seria que
     * la persistencia leyera los importes como texto, que es peor y ademas invita a reconstruirlos
     * con {@code Double.parseDouble}.
     */
    private static final Set<String> ENVOLTORIOS_DE_DECIMAL =
            Set.of(
                    PAQUETE_RAIZ + ".dominio.Dinero",
                    PAQUETE_RAIZ + ".dominio.Alicuota",
                    PAQUETE_RAIZ + ".dominio.Porcentaje",
                    PAQUETE_RAIZ + ".dominio.AreaM2",
                    PAQUETE_RAIZ + ".dominio.ValorNormativo",
                    // Un metrado alimenta un importe (NEG-05 §RT-005); por eso es un
                    // envoltorio y no un BigDecimal suelto.
                    PAQUETE_RAIZ + ".dominio.Medida");

    private ReglasDeArquitectura() {}

    /** Regla 7: el dominio debe poder probarse sin levantar Spring. */
    public static final ArchRule EL_DOMINIO_NO_CONOCE_FRAMEWORKS =
            noClasses()
                    .that()
                    .resideInAPackage("..dominio..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAnyPackage(
                            "org.springframework..",
                            "jakarta.persistence..",
                            "jakarta.servlet..",
                            "com.fasterxml.jackson..",
                            "javax.sql..")
                    .because(
                            "las reglas tributarias deben probarse sin Spring ni base de datos, para"
                                    + " que recalcular 2027 en 2037 siga funcionando (ARQ-04 §1)");

    /** Regla 1: importes en BigDecimal, jamas en coma flotante (RNF-055). */
    public static final ArchRule NINGUN_IMPORTE_EN_COMA_FLOTANTE =
            ArchRuleDefinition.classes()
                    .that()
                    .resideInAPackage(PAQUETE_RAIZ + "..")
                    .should(new SinTiposDeComaFlotante())
                    .because(
                            "double y float pierden centimos en silencio; todo importe es BigDecimal"
                                    + " o el tipo Dinero (RNF-055)");

    /**
     * {@code BigDecimal} desnudo no aparece en una firma de dominio; se usa {@code Dinero}, que
     * recibe la escala y el modo de redondeo (D-03a, D-03b).
     *
     * <p>Se exceptuan los propios envoltorios de decimal del dominio compartido —{@link
     * ReglasDeArquitectura#ENVOLTORIOS_DE_DECIMAL}—: son justamente los tipos que existen para que
     * nadie mas maneje un {@code BigDecimal}, y tienen que poder entregar el suyo a la capa de
     * persistencia. La excepcion es una lista corta y explicita, para que agregar un tipo a ella se
     * vea en el diff.
     */
    public static final ArchRule NINGUNA_FIRMA_DE_DOMINIO_EXPONE_BIGDECIMAL =
            ArchRuleDefinition.classes()
                    .that()
                    .resideInAPackage("..dominio..")
                    .should(new SinBigDecimalEnLaFirma())
                    .because(
                            "la escala y el modo de redondeo viven dentro de Dinero, no dispersos en"
                                    + " las reglas (D-03a, D-03b)");

    /** Un instante lleva zona; una fecha tributaria es LocalDate. */
    public static final ArchRule NADIE_USA_LOCALDATETIME =
            noClasses()
                    .that()
                    .resideInAPackage(PAQUETE_RAIZ + "..")
                    .should()
                    .dependOnClassesThat()
                    .haveFullyQualifiedName("java.time.LocalDateTime")
                    .because(
                            "LocalDateTime no distingue el instante de la fecha tributaria y pierde"
                                    + " la zona America/Lima");

    /** Regla 6: la fecha entra como argumento, nunca se lee del reloj. */
    public static final ArchRule EL_DOMINIO_NO_LEE_EL_RELOJ =
            noClasses()
                    .that()
                    .resideInAPackage("..dominio..")
                    .should()
                    .callMethodWhere(
                            new DescribedPredicate<>("es una lectura del reloj del sistema") {
                                @Override
                                public boolean test(
                                        com.tngtech.archunit.core.domain.JavaMethodCall llamada) {
                                    String propietario = llamada.getTargetOwner().getFullName();
                                    String nombre = llamada.getName();
                                    boolean tipoDeFecha =
                                            propietario.startsWith("java.time.")
                                                    || propietario.equals("java.util.Date")
                                                    || propietario.equals("java.util.Calendar");
                                    return (tipoDeFecha && nombre.equals("now"))
                                            || (propietario.equals("java.lang.System")
                                                    && (nombre.equals("currentTimeMillis")
                                                            || nombre.equals("nanoTime")));
                                }
                            })
                    .because(
                            "recalcular el ejercicio 2027 en 2037 debe dar el mismo centimo: la"
                                    + " fecha entra como argumento (regla 6)");

    /**
     * Regla 2: ningun metodo recibe el identificador de municipalidad.
     *
     * <p>Sale del token y se fija una sola vez. Si el desarrollador no lo maneja, no puede
     * olvidarlo. Las dos excepciones son las dos piezas que si deben manejarlo: {@code
     * TenantContext} y la plataforma que lo lleva al {@code SET LOCAL}.
     */
    public static final ArchRule NADIE_RECIBE_EL_IDENTIFICADOR_DE_MUNICIPALIDAD =
            ArchRuleDefinition.classes()
                    .that()
                    .resideInAPackage(PAQUETE_RAIZ + "..")
                    .and()
                    .resideOutsideOfPackages(
                            PAQUETE_RAIZ + ".compartido..", PAQUETE_RAIZ + ".plataforma..")
                    .should(new SinMunicipalidadIdComoParametro())
                    .because(
                            "el municipalidad_id sale del token y se fija una sola vez con SET"
                                    + " LOCAL; si aparece en una firma, es un defecto (ARQ-03 §3.1)");

    /** El dominio es el centro; no mira hacia afuera. */
    public static final ArchRule EL_DOMINIO_NO_DEPENDE_DE_LAS_CAPAS_EXTERNAS =
            noClasses()
                    .that()
                    .resideInAPackage("..dominio..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAnyPackage("..infraestructura..", "..aplicacion..")
                    .because("la dependencia apunta hacia el dominio, no desde el (ARQ-04 §1)");

    /**
     * Regla 10: toda escritura exige observacion del usuario (ADR-0008, RNF-052).
     *
     * <p>Se comprueba donde se puede comprobar: un caso de uso de escritura es un metodo
     * {@code @Transactional} que no es de solo lectura, y tiene que declarar un parametro {@link
     * pe.gob.sgtm.dominio.Observacion}.
     *
     * <p>La restriccion de la base es la barrera final y no se puede rodear, pero falla en
     * ejecucion; esta falla al compilar el build, que es donde cuesta barato. Y hace algo que la
     * base no puede: obliga a que la observacion llegue <b>desde el usuario</b>, en la firma, en
     * lugar de rellenarse con una cadena fija en la capa de persistencia —que satisfaria a la base
     * y vaciaria de sentido la auditoria—.
     *
     * <p>Las excepciones estan en {@link ConObservacionEnLasEscrituras#SIN_USUARIO_QUE_OBSERVE} y
     * se nombran una a una, con su motivo. Que cueste una linea es deliberado: exime a un metodo
     * concreto, no a una clase ni a un paquete, y el diff dice cual y por que.
     */
    public static final ArchRule TODO_CASO_DE_USO_DE_ESCRITURA_EXIGE_OBSERVACION =
            ArchRuleDefinition.classes()
                    .that()
                    .resideInAPackage("..aplicacion..")
                    .should(new ConObservacionEnLasEscrituras())
                    .because(
                            "el que cambio lo reconstruye cualquier sistema; el por que solo lo sabe"
                                    + " quien lo cambio, en el momento de cambiarlo (ADR-0008)");

    /**
     * Regla 2 en el borde: ningun controlador acepta la municipalidad por HTTP.
     *
     * <p>{@link #NADIE_RECIBE_EL_IDENTIFICADOR_DE_MUNICIPALIDAD} ya prohibe el <b>tipo</b> {@code
     * MunicipalidadId} en una firma. Esta regla cubre la forma en que el defecto aparece de verdad
     * en una capa web: no como un tipo del dominio, sino como un {@code @RequestParam("
     * municipalidadId") long} o un {@code @PathVariable} anadido «por comodidad» para probar algo y
     * nunca retirado.
     *
     * <p>Si ese parametro existiera, cualquiera podria leer la deuda de otra municipalidad
     * cambiando un numero en la barra de direcciones. El identificador sale del token y de ningun
     * otro sitio (ADR-0005).
     */
    public static final ArchRule NINGUN_CONTROLADOR_RECIBE_LA_MUNICIPALIDAD =
            ArchRuleDefinition.classes()
                    .that(new EsControlador())
                    .should(new SinMunicipalidadEnLaFirmaHttp())
                    .because(
                            "el cliente controla la ruta, los parametros y los encabezados; si"
                                    + " alguno pudiera fijar la municipalidad, el aislamiento seria"
                                    + " decorativo (ADR-0005, regla 2)");

    /**
     * Regla 9 y RNF-075: toda cifra que sale por HTTP dice a que fecha esta actualizada.
     *
     * <p>No existe «la deuda»: existe {@code deudaActualizadaA(fecha)}. El interes moratorio corre
     * y el reajuste depende del indice del mes, asi que una cifra sin fecha es una cifra que dentro
     * de tres dias es otra —y la diferencia acaba en una discusion en ventanilla que la
     * municipalidad no puede ganar, porque no puede decir a que dia correspondia lo que imprimio—.
     *
     * <p>La regla es simple a proposito: un DTO de la capa web que declare un {@code Dinero} tiene
     * que declarar tambien un {@code actualizadoA}. La alternativa —distinguir «importes de deuda»
     * de los demas— exigiria un juicio que una regla automatica no puede hacer, y el proyecto ya
     * decidio que <b>toda</b> cifra mostrada indica su fecha. Quien no quiera repetir los dos
     * campos tiene {@code ImporteActualizado}, que los lleva juntos.
     */
    public static final ArchRule TODA_CIFRA_DE_LA_WEB_LLEVA_SU_FECHA =
            ArchRuleDefinition.classes()
                    .that()
                    .resideInAPackage("..web..")
                    .should(new ConFechaJuntoAlImporte())
                    .because(
                            "una cifra de deuda sin su fecha es una cifra que manana es otra"
                                    + " (RNF-075, regla 9)");

    /**
     * RF-121: todo endpoint declara que acceso y que privilegio exige.
     *
     * <p>La comprobacion la hace el servidor —{@code GuardiaDeAcceso}—, pero solo puede comprobar
     * lo que el endpoint declara. Un controlador sin {@code @RequiereAcceso} es un endpoint sin
     * guardia, y no se descubre revisando: se descubre cuando alguien lo encuentra.
     *
     * <p>El guardia ademas <b>niega</b> si la anotacion falta, en lugar de dejar pasar «porque no
     * dice nada». Las dos cosas juntas —negar en ejecucion y romper el build— hacen que el olvido
     * sea imposible de convertir en una puerta abierta.
     */
    public static final ArchRule TODO_ENDPOINT_DECLARA_SU_ACCESO =
            ArchRuleDefinition.classes()
                    .that(new EsControlador())
                    .should(new ConAccesoDeclarado())
                    .because(
                            "que la interfaz oculte una opcion es comodidad, no seguridad: la"
                                    + " peticion se puede hacer igual con curl (RF-121, ADR-0005)");

    /**
     * Un componente de Spring con varios constructores dice cual se inyecta.
     *
     * <p>Esta regla existe por un fallo concreto, y conviene que se lea aqui porque no se parece a
     * nada que el compilador vigile: {@code GeneradorDeDocumentos} tenia dos constructores publicos
     * y ninguno marcado. Compilaba, sus pruebas pasaban —invocan el constructor a mano— y <b>la
     * aplicacion no arrancaba</b>: Spring, sin un constructor declarado, busca el que no tiene
     * argumentos, no lo encuentra y aborta el contexto entero.
     *
     * <p>Lo encontro el primer despliegue que levanto el artefacto de verdad. Ninguna verificacion
     * lo veia: ArchUnit mira estructura, el escaner mira texto y Modulith mira dependencias entre
     * modulos; instanciar el contexto no lo hacia nadie. El despliegue lo sigue comprobando, pero
     * tarda minutos y hace falta Docker, asi que ademas se comprueba aqui, donde cuesta segundos.
     *
     * <p>Un constructor unico no necesita anotacion: ahi Spring no tiene nada que elegir.
     */
    public static final ArchRule TODO_COMPONENTE_DECLARA_QUE_CONSTRUCTOR_INYECTAR =
            ArchRuleDefinition.classes()
                    .that(new EsComponenteDeSpring())
                    .should(new ConUnConstructorInyectableSinAmbiguedad())
                    .because(
                            "con varios constructores y ninguno marcado, Spring busca el que no"
                                    + " tiene argumentos y la aplicacion no arranca; compila igual y"
                                    + " las pruebas que instancian a mano no lo ven");

    /**
     * Nada que siembre datos corre en el perfil por omision: solo en {@code batch} (E-6, #202).
     *
     * <p>La siembra de un tenant de demostracion —y la implantacion de cualquier municipalidad—
     * escribe en {@code municipalidad}, que solo {@code sgtm_owner} puede escribir. {@link
     * org.springframework.boot.ApplicationRunner} es el mecanismo por el que algo corre <b>al
     * arrancar</b>: uno sin perfil corre tambien en el proceso web, y entonces el contenedor que
     * atiende peticiones necesita las credenciales de {@code sgtm_owner} para arrancar. Eso no es
     * una siembra de mas: es el camino mas corto entre una peticion HTTP y el alta de una
     * municipalidad.
     *
     * <p>Es el tercer criterio de aceptacion de #202 —«poner la siembra en el perfil por omision
     * pone en rojo la comprobacion»— y hasta esta regla nadie lo comprobaba: quitarle el
     * {@code @Profile("batch")} a {@code ImplantarMunicipalidad} compilaba, sus pruebas seguian en
     * verde —la instancian a mano— y el unico sintoma habria sido que el proceso web pide una clave
     * que no deberia conocer.
     *
     * <p>Se exige el perfil <b>y</b> que sea {@code batch}: {@code @Profile("web")} o
     * {@code @Profile("!test")} tambien lo pondrian en el proceso equivocado.
     */
    public static final ArchRule TODA_SIEMBRA_CORRE_SOLO_EN_EL_PERFIL_BATCH =
            ArchRuleDefinition.classes()
                    .that(new EsUnProcesoDeArranque())
                    .should(new ConPerfilBatch())
                    .because(
                            "sembrar escribe en municipalidad, y esa tabla solo la escribe"
                                    + " sgtm_owner: un proceso de arranque sin perfil le exige esa"
                                    + " credencial al contenedor que atiende peticiones (#202)");

    /**
     * ARQ-01 §3.5: la transferencia a rentas es el <b>unico</b> camino de escritura de {@code
     * fiscalizacion} hacia {@code catastro}, {@code rentas} y el libro (#52, RF-054, AC 1).
     *
     * <p>Es la frontera delicada del sistema. Hasta la transferencia, todo lo que este contexto
     * registra vive sobre <b>copias</b>: el acta guarda el area medida en campo y la version de
     * ficha que regia el dia de la visita, y la liquidacion guarda el contraste hallado/declarado.
     * Nada de eso es el dato oficial del padron. Si un segundo camino de escritura apareciera —una
     * pantalla que «corrige» la ficha al liquidar, un proceso masivo que asienta directamente—, lo
     * hallado entraria al padron sin resolucion que lo justifique y sin version que lo pueda
     * deshacer.
     *
     * <p>La regla tiene <b>dos mitades</b>, y hacen falta las dos:
     *
     * <ol>
     *   <li><b>Solo la transferencia usa un puerto de escritura ajeno.</b> Los puertos estan
     *       enumerados en {@link SinEscribirFueraDeLaTransferencia#PUERTOS_DE_ESCRITURA}: hoy son
     *       {@code catastro.TransferenciaDeFiscalizacion} y {@code
     *       cuentacorriente.GeneradorDeCargos}. Cualquier otra clase de este contexto que dependa
     *       de uno viola la regla.
     *   <li><b>Todo tipo ajeno que este contexto toque esta clasificado.</b> Sin esta mitad la
     *       primera no protege nada: bastaria con publicar un puerto de escritura nuevo —o anadirle
     *       una escritura a un lector— y usarlo desde donde fuera. Con ella, cruzar el limite
     *       cuesta <b>una linea</b> en {@link
     *       SinEscribirFueraDeLaTransferencia#TIPOS_AJENOS_QUE_SOLO_SE_LEEN}, y esa linea la
     *       escribe alguien que tiene que decidir si lo que abre es una lectura o una escritura. El
     *       diff lo dice.
     * </ol>
     *
     * <p><b>Lo que esta regla NO dice</b>, para no prometer de mas: ARQ-01 §4 regla 4 esta
     * redactada en absoluto —«nadie escribe en catastro salvo catastro y la transferencia de
     * fiscalizacion»— y la realidad ya es mas ancha: {@code rentas} escribe en {@code catastro} por
     * {@code GestorDeTitularidad} desde #29, porque una transferencia de predio cambia al titular.
     * Eso es legitimo y esta fuera del alcance de #52. Lo que esta regla garantiza, y garantiza
     * mecanicamente, es la mitad de {@code fiscalizacion}.
     */
    public static final ArchRule SOLO_LA_TRANSFERENCIA_ESCRIBE_FUERA_DE_FISCALIZACION =
            ArchRuleDefinition.classes()
                    .that()
                    .resideInAPackage("..fiscalizacion..")
                    .should(new SinEscribirFueraDeLaTransferencia())
                    .because(
                            "hasta la transferencia, fiscalizacion trabaja sobre copias: un segundo"
                                    + " camino de escritura meteria lo hallado en el padron sin"
                                    + " resolucion que lo justifique (ARQ-01 §3.5, RF-054)");

    /**
     * El panel de recaudacion no habla con ninguna base de datos (#56, AC 3 y AC 4).
     *
     * <p>{@code indicadores} no es un contexto acotado: no tiene tablas, no determina y no asienta.
     * Lo unico que hace es <b>agregar</b> lo que {@code cuentacorriente} y {@code tesoreria} ya
     * publican. Spring Modulith ya impide que toque un tipo interno de otro modulo; lo que esta
     * regla añade es lo otro: que no pueda saltarselos <b>por debajo</b>, escribiendo su propio
     * {@code JdbcClient} contra {@code cuenta_corriente_asiento}.
     *
     * <p>No es una preocupacion teorica, y el defecto tiene una forma muy concreta: el panel
     * necesita cifras de varios modulos, y la ruta corta —«total, es solo un SELECT de lectura»—
     * produce una consulta que duplica el criterio de reversion del libro sin saberlo. El dia que
     * ese criterio cambie, la pantalla de inicio dira una cifra y el resumen del area dira otra,
     * las dos plausibles, y nadie sabra cual esta mal.
     *
     * <p>Y hay una segunda consecuencia, que es el AC 4: un {@code SELECT} escrito aqui seria un
     * {@code SELECT} sin agregar —quien escribe un panel no escribe {@code GROUP BY}, escribe un
     * bucle—, o sea la cartera de un padron entero recorrida en cada carga de la pantalla que todo
     * el mundo abre al entrar.
     */
    public static final ArchRule EL_PANEL_NO_HABLA_CON_LA_BASE =
            noClasses()
                    .that()
                    .resideInAPackage("..indicadores..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAnyPackage(
                            "java.sql..",
                            "javax.sql..",
                            "org.springframework.jdbc..",
                            "org.springframework.r2dbc..")
                    .because(
                            "el panel agrega lo que otros publican; una consulta propia duplicaria"
                                    + " el criterio del libro y recorreria el padron en cada carga"
                                    + " de la pantalla de inicio (#56, AC 3 y AC 4)");

    public static List<ArchRule> todas() {
        return List.of(
                EL_DOMINIO_NO_CONOCE_FRAMEWORKS,
                NINGUN_IMPORTE_EN_COMA_FLOTANTE,
                NINGUNA_FIRMA_DE_DOMINIO_EXPONE_BIGDECIMAL,
                NADIE_USA_LOCALDATETIME,
                EL_DOMINIO_NO_LEE_EL_RELOJ,
                NADIE_RECIBE_EL_IDENTIFICADOR_DE_MUNICIPALIDAD,
                EL_DOMINIO_NO_DEPENDE_DE_LAS_CAPAS_EXTERNAS,
                TODO_CASO_DE_USO_DE_ESCRITURA_EXIGE_OBSERVACION,
                NINGUN_CONTROLADOR_RECIBE_LA_MUNICIPALIDAD,
                TODA_CIFRA_DE_LA_WEB_LLEVA_SU_FECHA,
                TODO_ENDPOINT_DECLARA_SU_ACCESO,
                TODO_COMPONENTE_DECLARA_QUE_CONSTRUCTOR_INYECTAR,
                TODA_SIEMBRA_CORRE_SOLO_EN_EL_PERFIL_BATCH,
                SOLO_LA_TRANSFERENCIA_ESCRIBE_FUERA_DE_FISCALIZACION,
                EL_PANEL_NO_HABLA_CON_LA_BASE);
    }

    /** Clases del sistema, sin las de prueba ni las de fixtures. */
    public static JavaClasses clasesDeProduccion() {
        return new com.tngtech.archunit.core.importer.ClassFileImporter()
                .withImportOption(
                        com.tngtech.archunit.core.importer.ImportOption.Predefined
                                .DO_NOT_INCLUDE_TESTS)
                .withImportOption(ubicacion -> !ubicacion.contains("testFixtures"))
                .importPackages(PAQUETE_RAIZ);
    }

    // ------------------------------------------------------------------
    // Condiciones propias
    // ------------------------------------------------------------------

    /**
     * La frontera de {@code fiscalizacion} hacia {@code catastro}, {@code rentas} y el libro.
     *
     * <p>Mira las dependencias reales del bytecode y no los {@code import}: un {@code import} sin
     * uso no deja rastro y un uso por nombre completo no deja {@code import}, asi que la lista de
     * importaciones no sirve para esto.
     */
    private static final class SinEscribirFueraDeLaTransferencia extends ArchCondition<JavaClass> {

        /**
         * Los contextos cuyo limite vigila esta regla.
         *
         * <p>{@code catastro} y {@code rentas} porque los nombra el AC 1 de #52. {@code
         * cuentacorriente} porque es donde acaban los cargos de la diferencia, y dejarlo fuera
         * habria hecho que «el unico camino de escritura» no cubriera la escritura que mas pesa: la
         * deuda que se le cobra a alguien.
         *
         * <p>{@code contribuyentes} y {@code parametros} no estan, y no es un descuido: los dos son
         * de solo lectura para todos por definicion (ARQ-01 §3.4 y §3.1), y ninguno publica un
         * puerto de escritura que este contexto pudiera usar.
         */
        private static final Set<String> CONTEXTOS_VIGILADOS =
                Set.of(
                        PAQUETE_RAIZ + ".catastro",
                        PAQUETE_RAIZ + ".rentas",
                        PAQUETE_RAIZ + ".cuentacorriente");

        /** El unico camino de escritura, y el unico que puede usar los puertos de abajo. */
        private static final String LA_TRANSFERENCIA =
                PAQUETE_RAIZ + ".fiscalizacion.aplicacion.TransferirARentas";

        /**
         * Los puertos por los que se ESCRIBE en otro contexto.
         *
         * <p>Dos, y cada uno con su motivo:
         *
         * <ul>
         *   <li>{@code catastro.TransferenciaDeFiscalizacion}: la version nueva de la ficha. Es la
         *       puerta que ARQ-01 §3.5 llama la frontera delicada.
         *   <li>{@code cuentacorriente.GeneradorDeCargos}: el cargo de la diferencia. Es la puerta
         *       comun por la que todo contexto que determina asienta (ARQ-01 §4 regla 2), pero
         *       dentro de fiscalizacion la usa solo la transferencia: asentar deuda desde una
         *       pantalla de liquidacion seria cobrar antes de haber notificado nada.
         * </ul>
         */
        private static final Set<String> PUERTOS_DE_ESCRITURA =
                Set.of(
                        PAQUETE_RAIZ + ".catastro.TransferenciaDeFiscalizacion",
                        PAQUETE_RAIZ + ".cuentacorriente.GeneradorDeCargos");

        /**
         * Todo lo demas que {@code fiscalizacion} puede tocar de esos tres contextos, uno por uno.
         *
         * <p>Que cueste una linea es deliberado, igual que en {@code SIN_USUARIO_QUE_OBSERVE}:
         * exime a un <b>tipo</b> concreto y el diff dice cual. Un tipo ajeno nuevo sin clasificar
         * rompe el build, y quien lo agregue tiene que decidir —y dejar escrito— si lo que abre es
         * una lectura o una escritura.
         */
        private static final Set<String> TIPOS_AJENOS_QUE_SOLO_SE_LEEN =
                Set.of(
                        // La ficha que sustenta un acta y la que sustenta una declaracion (#45,
                        // #49). Devuelven identificador y area: ni un metodo que escriba.
                        PAQUETE_RAIZ + ".catastro.LectorDeFichas",
                        // El uso y las caracteristicas del predio a una fecha (#49).
                        PAQUETE_RAIZ + ".catastro.LectorDeCaracteristicas",
                        PAQUETE_RAIZ + ".catastro.CaracteristicasDelPredio",
                        // El padron entero, paginado, para la deteccion de omisos (RF-055).
                        PAQUETE_RAIZ + ".catastro.PadronDePredios",
                        PAQUETE_RAIZ + ".catastro.PredioDelPadron",
                        // Lo que la transferencia DEVOLVIO. Es un registro de resultado, no una
                        // puerta: no tiene un metodo que escriba, y lo lee tambien quien dibuja el
                        // papel. Si estuviera entre los puertos, imprimir la resolucion exigiria
                        // ser la transferencia.
                        PAQUETE_RAIZ + ".catastro.VersionTransferida",
                        // Y su excepcion: atraparla no es escribir. La captura la capa web, que
                        // traduce a 422 «el predio no tiene ficha vigente».
                        PAQUETE_RAIZ
                                + ".catastro.TransferenciaDeFiscalizacion$SinFichaQueVersionar",
                        // Si un predio declaro en un ejercicio, por lote (RF-055).
                        PAQUETE_RAIZ + ".rentas.DeclaracionesDelEjercicio",
                        PAQUETE_RAIZ + ".rentas.DeclaracionDelEjercicio",
                        // Cuanto se debe a una fecha, para el estado de cuenta de fiscalizacion
                        // (RF-056). Arista al reves de las otras: la excepcion de ARQ-01 §4 regla
                        // 2.
                        PAQUETE_RAIZ + ".cuentacorriente.ConsultaDeDeudaPublica",
                        PAQUETE_RAIZ + ".cuentacorriente.ObligacionPublica");

        SinEscribirFueraDeLaTransferencia() {
            super(
                    "no escribir en catastro, rentas ni el libro fuera de la transferencia, y"
                            + " declarar uno por uno los tipos ajenos que lee");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            for (JavaClass destino :
                    clase.getDirectDependenciesFromSelf().stream()
                            .map(dependencia -> dependencia.getTargetClass())
                            .distinct()
                            .toList()) {

                String nombre = destino.getFullName();
                if (!estaVigilado(nombre)) {
                    continue;
                }
                if (PUERTOS_DE_ESCRITURA.contains(nombre)) {
                    if (!esLaTransferencia(clase)) {
                        eventos.add(
                                SimpleConditionEvent.violated(
                                        clase,
                                        clase.getName()
                                                + " usa el puerto de escritura "
                                                + nombre
                                                + " sin ser la transferencia a rentas: la"
                                                + " transferencia es el UNICO camino por el que lo"
                                                + " hallado pasa a ser el dato oficial del padron"
                                                + " (ARQ-01 §3.5, AC 1 de #52)"));
                    }
                    continue;
                }
                if (!TIPOS_AJENOS_QUE_SOLO_SE_LEEN.contains(nombre)) {
                    eventos.add(
                            SimpleConditionEvent.violated(
                                    clase,
                                    clase.getName()
                                            + " depende de "
                                            + nombre
                                            + ", que no esta clasificado: agreguelo a"
                                            + " TIPOS_AJENOS_QUE_SOLO_SE_LEEN si solo lee, o a"
                                            + " PUERTOS_DE_ESCRITURA si escribe —y entonces solo lo"
                                            + " podra usar la transferencia—"));
                }
            }
        }

        /** Si el tipo pertenece a uno de los contextos vigilados, sea de su raiz o de dentro. */
        private static boolean estaVigilado(String nombre) {
            for (String contexto : CONTEXTOS_VIGILADOS) {
                if (nombre.equals(contexto) || nombre.startsWith(contexto + ".")) {
                    return true;
                }
            }
            return false;
        }

        /**
         * La transferencia, con sus tipos anidados.
         *
         * <p>{@code TransferirARentas$Transferencia} —lo que devuelve— lleva dentro la version que
         * el padron inscribio, y es tan parte del caso de uso como su metodo.
         */
        private static boolean esLaTransferencia(JavaClass clase) {
            String nombre = clase.getFullName();
            return nombre.equals(LA_TRANSFERENCIA) || nombre.startsWith(LA_TRANSFERENCIA + "$");
        }
    }

    /** Lo que Spring corre al arrancar el proceso, antes de atender nada. */
    private static final class EsUnProcesoDeArranque extends DescribedPredicate<JavaClass> {

        private static final Set<String> ARRANQUE =
                Set.of(
                        "org.springframework.boot.ApplicationRunner",
                        "org.springframework.boot.CommandLineRunner");

        EsUnProcesoDeArranque() {
            super("Spring los corre al arrancar el proceso");
        }

        @Override
        public boolean test(JavaClass clase) {
            return clase.getAllRawInterfaces().stream()
                    .anyMatch(interfaz -> ARRANQUE.contains(interfaz.getName()));
        }
    }

    private static final class ConPerfilBatch extends ArchCondition<JavaClass> {

        private static final String PROFILE = "org.springframework.context.annotation.Profile";
        private static final String BATCH = "batch";

        ConPerfilBatch() {
            super("declarar @Profile(\"batch\")");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            var perfil =
                    clase.getAnnotations().stream()
                            .filter(a -> PROFILE.equals(a.getRawType().getName()))
                            .findFirst();
            if (perfil.isEmpty()) {
                eventos.add(
                        SimpleConditionEvent.violated(
                                clase,
                                clase.getName()
                                        + " corre al arrancar y no declara @Profile: correria"
                                        + " tambien en el proceso web"));
                return;
            }
            Object valor = perfil.get().getProperties().get("value");
            List<String> perfiles =
                    valor instanceof Object[] varios
                            ? java.util.Arrays.stream(varios).map(String::valueOf).toList()
                            : List.of(String.valueOf(valor));
            if (!perfiles.contains(BATCH)) {
                eventos.add(
                        SimpleConditionEvent.violated(
                                clase,
                                clase.getName()
                                        + " corre al arrancar con @Profile"
                                        + perfiles
                                        + ", y sembrar solo se hace en 'batch'"));
            }
        }
    }

    /** Lo que Spring instancia: los estereotipos que el escaneo de componentes descubre. */
    private static final class EsComponenteDeSpring extends DescribedPredicate<JavaClass> {

        private static final Set<String> ESTEREOTIPOS =
                Set.of(
                        "org.springframework.stereotype.Component",
                        "org.springframework.stereotype.Service",
                        "org.springframework.stereotype.Repository",
                        "org.springframework.stereotype.Controller",
                        "org.springframework.web.bind.annotation.RestController",
                        "org.springframework.context.annotation.Configuration");

        EsComponenteDeSpring() {
            super("los instancia Spring");
        }

        @Override
        public boolean test(JavaClass clase) {
            // Basta con la anotacion directa o una meta-anotacion: @RestController lleva
            // @Component dentro, y @Configuration tambien.
            return clase.getAnnotations().stream()
                    .anyMatch(
                            a ->
                                    ESTEREOTIPOS.contains(a.getRawType().getName())
                                            || a.getRawType().getAnnotations().stream()
                                                    .anyMatch(
                                                            meta ->
                                                                    ESTEREOTIPOS.contains(
                                                                            meta.getRawType()
                                                                                    .getName())));
        }
    }

    private static final class ConUnConstructorInyectableSinAmbiguedad
            extends ArchCondition<JavaClass> {

        private static final String AUTOWIRED =
                "org.springframework.beans.factory.annotation.Autowired";

        ConUnConstructorInyectableSinAmbiguedad() {
            super("declarar cual de sus constructores inyecta Spring");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            var constructores =
                    clase.getConstructors().stream()
                            .filter(c -> !c.getModifiers().contains(JavaModifier.PRIVATE))
                            .toList();
            if (constructores.size() <= 1) {
                return;
            }
            long marcados =
                    constructores.stream()
                            .filter(
                                    c ->
                                            c.getAnnotations().stream()
                                                    .anyMatch(
                                                            a ->
                                                                    AUTOWIRED.equals(
                                                                            a.getRawType()
                                                                                    .getName())))
                            .count();
            boolean haySinArgumentos =
                    constructores.stream().anyMatch(c -> c.getRawParameterTypes().isEmpty());

            if (marcados == 1 || (marcados == 0 && haySinArgumentos)) {
                return;
            }
            String motivo =
                    marcados > 1
                            ? "tiene "
                                    + marcados
                                    + " constructores con @Autowired, y solo puede"
                                    + " haber uno"
                            : "tiene "
                                    + constructores.size()
                                    + " constructores, ninguno con @Autowired y ninguno sin"
                                    + " argumentos: Spring no puede elegir y el contexto no"
                                    + " arranca";
            eventos.add(SimpleConditionEvent.violated(clase, clase.getName() + " " + motivo));
        }
    }

    private static final class SinTiposDeComaFlotante extends ArchCondition<JavaClass> {

        SinTiposDeComaFlotante() {
            super("no usar double ni float");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            for (JavaField campo : clase.getFields()) {
                if (TIPOS_COMA_FLOTANTE.contains(campo.getRawType().getName())) {
                    eventos.add(
                            SimpleConditionEvent.violated(
                                    campo,
                                    "el campo " + campo.getFullName() + " es de coma flotante"));
                }
            }
            for (JavaMethod metodo : clase.getMethods()) {
                if (TIPOS_COMA_FLOTANTE.contains(metodo.getRawReturnType().getName())) {
                    eventos.add(
                            SimpleConditionEvent.violated(
                                    metodo,
                                    "el metodo "
                                            + metodo.getFullName()
                                            + " devuelve coma flotante"));
                }
                for (JavaParameter parametro : metodo.getParameters()) {
                    if (TIPOS_COMA_FLOTANTE.contains(parametro.getRawType().getName())) {
                        eventos.add(
                                SimpleConditionEvent.violated(
                                        metodo,
                                        "el metodo "
                                                + metodo.getFullName()
                                                + " recibe coma flotante"));
                    }
                }
            }
        }
    }

    private static final class SinBigDecimalEnLaFirma extends ArchCondition<JavaClass> {

        SinBigDecimalEnLaFirma() {
            super("no exponer BigDecimal desnudo en su firma, salvo los envoltorios de decimal");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            if (ENVOLTORIOS_DE_DECIMAL.contains(clase.getFullName())) {
                return;
            }
            for (JavaMethod metodo : clase.getMethods()) {
                if (!metodo.getModifiers()
                        .contains(com.tngtech.archunit.core.domain.JavaModifier.PUBLIC)) {
                    continue;
                }
                boolean enLaFirma =
                        metodo.getRawReturnType().isEquivalentTo(BigDecimal.class)
                                || metodo.getParameters().stream()
                                        .anyMatch(
                                                p ->
                                                        p.getRawType()
                                                                .isEquivalentTo(BigDecimal.class));
                if (enLaFirma) {
                    eventos.add(
                            SimpleConditionEvent.violated(
                                    metodo,
                                    "el metodo "
                                            + metodo.getFullName()
                                            + " expone BigDecimal desnudo"));
                }
            }
        }
    }

    private static final class ConObservacionEnLasEscrituras extends ArchCondition<JavaClass> {

        private static final String TRANSACTIONAL =
                "org.springframework.transaction.annotation.Transactional";
        private static final String OBSERVACION = PAQUETE_RAIZ + ".dominio.Observacion";

        /**
         * Los metodos que escriben sin observacion porque <b>no hay usuario que la de</b>.
         *
         * <p>La regla 10 gobierna las <b>modificaciones de datos</b>: el que las hace sabe por que,
         * y se le exige decirlo. Un proceso que recalcula un cache derivado a las tres de la
         * madrugada no modifica ningun dato —la fuente, el libro de asientos, queda intacta— y no
         * tiene ninguna observacion que dar. Exigirsela produciria exactamente lo que el javadoc de
         * la regla advierte: una cadena fija que satisface la comprobacion y vacia de sentido la
         * auditoria.
         *
         * <p>Se nombra el metodo entero, no la clase: cualquier otra escritura que se agregue a la
         * misma clase vuelve a estar sujeta a la regla.
         */
        private static final Set<String> SIN_USUARIO_QUE_OBSERVE =
                Set.of(
                        // Reconstruye saldo_proyectado desde el libro (#23). Es un cache
                        // derivado: no modifica ningun dato, lo recalcula. El libro no se toca.
                        PAQUETE_RAIZ
                                + ".cuentacorriente.aplicacion.ReconstruirSaldo.deContribuyente(long)",
                        // La lista de predios SIN declaracion jurada (ADR-0015 §2.3, #344). Es
                        // una CONSULTA: no modifica ningun dato. Lo unico que escribe es su
                        // propia fila de ACCESO en la bitacora, y esa observacion no la puede
                        // escribir el usuario porque nadie escribe un motivo para mirar una
                        // grilla: la compone el sistema y dice que se consulto y de que
                        // ejercicio. Es transaccional de escritura por eso y solo por eso —la
                        // fila tiene que caer dentro de la misma transaccion que la lectura—, y
                        // sus dos hermanas, `todas` y `conciliadas`, siguen siendo readOnly.
                        PAQUETE_RAIZ
                                + ".rentas.aplicacion.ConsultaDeConciliacion.noConciliadas("
                                + PAQUETE_RAIZ
                                + ".catastro.BusquedaDeFichas, "
                                + PAQUETE_RAIZ
                                + ".dominio.Ejercicio, java.time.LocalDate, "
                                + PAQUETE_RAIZ
                                + ".compartido.Paginacion)",
                        // El titular de un predio, resuelto al clic (ADR-0015 §2.4, #366). Misma
                        // forma exacta que la anterior: es una CONSULTA —no modifica ningun dato—
                        // y lo unico que escribe es su propia fila de ACCESO, cuya observacion no
                        // la puede dar el usuario porque nadie escribe un motivo para preguntar de
                        // quien es un predio. Es transaccional de escritura solo para que esa fila
                        // caiga dentro de la misma transaccion que la lectura: sin eso, quedaria
                        // constancia de consultas que fallaron y no la habria de las que si
                        // devolvieron el codigo de una persona.
                        PAQUETE_RAIZ
                                + ".rentas.aplicacion.ConsultaDeTitulares.resolver(long,"
                                + " java.time.LocalDate)");

        ConObservacionEnLasEscrituras() {
            super("exigir una Observacion en todo metodo transaccional de escritura");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            for (JavaMethod metodo : clase.getMethods()) {
                if (!esEscrituraTransaccional(metodo)
                        || SIN_USUARIO_QUE_OBSERVE.contains(metodo.getFullName())) {
                    continue;
                }
                boolean laRecibe =
                        metodo.getParameters().stream()
                                .anyMatch(p -> p.getRawType().getName().equals(OBSERVACION));
                if (!laRecibe) {
                    eventos.add(
                            SimpleConditionEvent.violated(
                                    metodo,
                                    "el metodo "
                                            + metodo.getFullName()
                                            + " escribe dentro de una transaccion y no recibe una"
                                            + " Observacion: sin ella la auditoria guarda el que y"
                                            + " pierde el por que (regla 10, ADR-0008)"));
                }
            }
        }

        /**
         * La anotacion se busca por su nombre y no por su clase para no depender de que {@code
         * spring-tx} este en el classpath de esta prueba: lo que se revisa es el bytecode de otros
         * modulos, no el de este.
         */
        private static boolean esEscrituraTransaccional(JavaMethod metodo) {
            return metodo.getAnnotations().stream()
                    .filter(a -> a.getRawType().getName().equals(TRANSACTIONAL))
                    .anyMatch(a -> !Boolean.TRUE.equals(a.get("readOnly").orElse(Boolean.FALSE)));
        }
    }

    /** Un controlador es una clase anotada como tal; se busca por nombre de anotacion. */
    private static final class EsControlador extends DescribedPredicate<JavaClass> {

        private static final Set<String> ANOTACIONES =
                Set.of(
                        "org.springframework.web.bind.annotation.RestController",
                        "org.springframework.stereotype.Controller");

        EsControlador() {
            super("son controladores HTTP");
        }

        @Override
        public boolean test(JavaClass clase) {
            return clase.getAnnotations().stream()
                    .anyMatch(a -> ANOTACIONES.contains(a.getRawType().getName()));
        }
    }

    private static final class SinMunicipalidadEnLaFirmaHttp extends ArchCondition<JavaClass> {

        /** Las tres formas en que un valor del cliente entra en la firma de un controlador. */
        private static final Set<String> ENTRADAS_DEL_CLIENTE =
                Set.of(
                        "org.springframework.web.bind.annotation.RequestParam",
                        "org.springframework.web.bind.annotation.PathVariable",
                        "org.springframework.web.bind.annotation.RequestHeader",
                        "org.springframework.web.bind.annotation.CookieValue");

        SinMunicipalidadEnLaFirmaHttp() {
            super("no aceptar la municipalidad por parametro, ruta ni encabezado");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            for (JavaMethod metodo : clase.getMethods()) {
                for (JavaParameter parametro : metodo.getParameters()) {
                    parametro.getAnnotations().stream()
                            .filter(a -> ENTRADAS_DEL_CLIENTE.contains(a.getRawType().getName()))
                            .filter(SinMunicipalidadEnLaFirmaHttp::nombraLaMunicipalidad)
                            .forEach(
                                    a ->
                                            eventos.add(
                                                    SimpleConditionEvent.violated(
                                                            metodo,
                                                            "el metodo "
                                                                    + metodo.getFullName()
                                                                    + " acepta la municipalidad"
                                                                    + " desde la peticion; sale del"
                                                                    + " token y de ningun otro"
                                                                    + " sitio (ADR-0005)")));
                }
            }
        }

        private static boolean nombraLaMunicipalidad(
                com.tngtech.archunit.core.domain.JavaAnnotation<?> anotacion) {
            return anotacion.getProperties().values().stream()
                    .map(Object::toString)
                    .anyMatch(v -> v.toLowerCase(java.util.Locale.ROOT).contains("municipalidad"));
        }
    }

    private static final class ConAccesoDeclarado extends ArchCondition<JavaClass> {

        private static final String REQUIERE_ACCESO = PAQUETE_RAIZ + ".autorizacion.RequiereAcceso";

        /** Lo que hace de un metodo un endpoint: cualquiera de los mapeos de Spring MVC. */
        private static final Set<String> MAPEOS =
                Set.of(
                        "org.springframework.web.bind.annotation.RequestMapping",
                        "org.springframework.web.bind.annotation.GetMapping",
                        "org.springframework.web.bind.annotation.PostMapping",
                        "org.springframework.web.bind.annotation.PutMapping",
                        "org.springframework.web.bind.annotation.PatchMapping",
                        "org.springframework.web.bind.annotation.DeleteMapping");

        ConAccesoDeclarado() {
            super("declarar @RequiereAcceso en la clase o en cada endpoint");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            if (tieneRequiereAcceso(clase.getAnnotations())) {
                return;
            }
            for (JavaMethod metodo : clase.getMethods()) {
                boolean esEndpoint =
                        metodo.getAnnotations().stream()
                                .anyMatch(a -> MAPEOS.contains(a.getRawType().getName()));
                if (esEndpoint && !tieneRequiereAcceso(metodo.getAnnotations())) {
                    eventos.add(
                            SimpleConditionEvent.violated(
                                    metodo,
                                    "el endpoint "
                                            + metodo.getFullName()
                                            + " no declara @RequiereAcceso: sin declararlo no hay"
                                            + " nada que el servidor pueda comprobar (RF-121)"));
                }
            }
        }

        private static boolean tieneRequiereAcceso(
                Set<? extends com.tngtech.archunit.core.domain.JavaAnnotation<?>> anotaciones) {
            return anotaciones.stream()
                    .anyMatch(a -> a.getRawType().getName().equals(REQUIERE_ACCESO));
        }
    }

    private static final class ConFechaJuntoAlImporte extends ArchCondition<JavaClass> {

        private static final String DINERO = PAQUETE_RAIZ + ".dominio.Dinero";
        private static final String CAMPO_DE_FECHA = "actualizadoA";
        private static final String EXCEPCION = PAQUETE_RAIZ + ".web.ImporteActualizado";

        ConFechaJuntoAlImporte() {
            super("declarar actualizadoA junto a todo importe");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            if (clase.getFullName().equals(EXCEPCION)) {
                // Es el tipo que lleva los dos juntos: su campo se llama asi.
                return;
            }
            boolean tieneImporte =
                    clase.getFields().stream()
                            .anyMatch(campo -> campo.getRawType().getName().equals(DINERO));
            if (!tieneImporte) {
                return;
            }
            boolean tieneFecha =
                    clase.getFields().stream()
                            .anyMatch(campo -> campo.getName().equals(CAMPO_DE_FECHA));
            if (!tieneFecha) {
                eventos.add(
                        SimpleConditionEvent.violated(
                                clase,
                                "la clase "
                                        + clase.getName()
                                        + " expone un importe sin decir a que fecha esta"
                                        + " actualizado: agregue un campo "
                                        + CAMPO_DE_FECHA
                                        + " o use ImporteActualizado (RNF-075, regla 9)"));
            }
        }
    }

    private static final class SinMunicipalidadIdComoParametro extends ArchCondition<JavaClass> {

        private static final String TIPO = PAQUETE_RAIZ + ".dominio.MunicipalidadId";

        SinMunicipalidadIdComoParametro() {
            super("no recibir MunicipalidadId como parametro");
        }

        @Override
        public void check(JavaClass clase, ConditionEvents eventos) {
            for (JavaMethod metodo : clase.getMethods()) {
                boolean loRecibe =
                        metodo.getParameters().stream()
                                .anyMatch(p -> p.getRawType().getName().equals(TIPO));
                if (loRecibe) {
                    eventos.add(
                            SimpleConditionEvent.violated(
                                    metodo,
                                    "el metodo "
                                            + metodo.getFullName()
                                            + " recibe el identificador de municipalidad"));
                }
            }
        }
    }
}
