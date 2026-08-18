package pe.gob.sgtm.verificaciones;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.domain.JavaMethod;
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
                    PAQUETE_RAIZ + ".dominio.AreaM2");

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
     * recibe la escala y el modo de redondeo (D-03).
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
                                    + " las reglas (D-03)");

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

    public static List<ArchRule> todas() {
        return List.of(
                EL_DOMINIO_NO_CONOCE_FRAMEWORKS,
                NINGUN_IMPORTE_EN_COMA_FLOTANTE,
                NINGUNA_FIRMA_DE_DOMINIO_EXPONE_BIGDECIMAL,
                NADIE_USA_LOCALDATETIME,
                EL_DOMINIO_NO_LEE_EL_RELOJ,
                NADIE_RECIBE_EL_IDENTIFICADOR_DE_MUNICIPALIDAD,
                EL_DOMINIO_NO_DEPENDE_DE_LAS_CAPAS_EXTERNAS);
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
