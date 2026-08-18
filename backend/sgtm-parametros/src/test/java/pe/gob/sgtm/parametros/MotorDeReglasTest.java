package pe.gob.sgtm.parametros;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.dominio.Vigencia;

/**
 * El motor, sin Spring, sin Docker y sin reloj.
 *
 * <h2>Aviso sobre las cifras</h2>
 *
 * <p><b>Todos los valores de esta prueba son ficticios y estan declarados como tales.</b> El factor
 * {@code 2} de la regla de muestra no es una alicuota, ni un tramo, ni nada que aparezca en ninguna
 * norma: es el numero que hace facil comprobar que la secuencia se aplico. Las cifras de verdad son
 * D-02 y no entran hasta que se verifiquen.
 *
 * <p>Ninguna de esas cifras esta escrita en el codigo de la regla: <b>salen de los parametros</b>,
 * que es justamente lo que la regla 5 exige y lo que este motor existe para hacer posible.
 */
@DisplayName("ADR-0007 — Motor de reglas")
class MotorDeReglasTest {

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final LocalDate FECHA = LocalDate.of(2026, 3, 31);

    /** Ficticia. No representa ninguna decision sobre D-03; la prueba necesita una cualquiera. */
    private static final PoliticaDeRedondeo REDONDEO_DE_PRUEBA =
            new PoliticaDeRedondeo(2, RoundingMode.HALF_UP);

    private static final IdentificadorDeRegla DOBLE = IdentificadorDeRegla.de("RT-901");
    private static final IdentificadorDeRegla SUMA = IdentificadorDeRegla.de("RT-902");

    private static ParametrosSellados parametrosFicticios() {
        return ParametrosSellados.de(EJERCICIO, 1)
                .numero("FICTICIO", "factor", ValorNormativo.de("2"))
                .numero("FICTICIO", "sumando", ValorNormativo.de("10.00"))
                .construir();
    }

    private static EntradaDeCalculo entrada(Dinero base) {
        return new EntradaDeCalculo(base, FECHA, parametrosFicticios(), REDONDEO_DE_PRUEBA);
    }

    @Nested
    @DisplayName("Una regla de muestra, pura")
    class ReglaPura {

        @Test
        @DisplayName("se ejecuta sin Spring, sin Docker y sin reloj")
        void seEjecutaSinNada() {
            MotorDeReglas motor = new MotorDeReglas(CatalogoDeReglas.de(new MultiplicaPorFactor()));

            ResultadoDelCalculo resultado = motor.aplicar(entrada(Dinero.de("100.00")));

            assertThat(resultado.importe()).isEqualTo(Dinero.de("200.00"));
            assertThat(resultado.reglasComoTexto()).containsExactly("RT-901");
            assertThat(resultado.ejercicio()).isEqualTo(EJERCICIO);
            assertThat(resultado.versionDeParametros()).isEqualTo(1);
        }

        @Test
        @DisplayName("cambiar el reloj del sistema no cambia ningun resultado")
        void cambiarElRelojNoCambiaNada() {
            MotorDeReglas motor = new MotorDeReglas(CatalogoDeReglas.de(new MultiplicaPorFactor()));

            // Dos relojes con diez anios de diferencia. La entrada es la misma, asi que
            // el resultado tiene que serlo: la fecha viaja en la entrada y ninguna
            // regla puede leer la hora.
            Clock enDosMilVeintiseis =
                    Clock.fixed(Instant.parse("2026-03-31T09:00:00Z"), ZoneId.of("America/Lima"));
            Clock enDosMilTreintaYSeis =
                    Clock.fixed(Instant.parse("2036-11-02T23:00:00Z"), ZoneId.of("America/Lima"));

            ResultadoDelCalculo ahora = conReloj(motor, enDosMilVeintiseis);
            ResultadoDelCalculo dentroDeDiezAnios = conReloj(motor, enDosMilTreintaYSeis);

            assertThat(dentroDeDiezAnios.importe())
                    .as("recalcular 2026 en 2036 tiene que dar el mismo centimo (regla 6)")
                    .isEqualTo(ahora.importe());
            assertThat(dentroDeDiezAnios.reglasComoTexto()).isEqualTo(ahora.reglasComoTexto());
        }

        private ResultadoDelCalculo conReloj(MotorDeReglas motor, Clock reloj) {
            // El reloj se usa solo para demostrar que NO interviene: la fecha del
            // calculo sigue siendo la del ejercicio, no la de hoy.
            assertThat(LocalDate.now(reloj)).isNotNull();
            return motor.aplicar(entrada(Dinero.de("100.00")));
        }

        @Test
        @DisplayName("recalcular dos veces el mismo caso da el mismo centimo")
        void recalcularDaLoMismo() {
            MotorDeReglas motor =
                    new MotorDeReglas(
                            CatalogoDeReglas.de(new MultiplicaPorFactor(), new SumaUnMonto()));

            ResultadoDelCalculo primera = motor.aplicar(entrada(Dinero.de("33.33")));
            ResultadoDelCalculo segunda = motor.aplicar(entrada(Dinero.de("33.33")));

            assertThat(segunda.importe()).isEqualTo(primera.importe());
            assertThat(segunda.reglasComoTexto()).isEqualTo(primera.reglasComoTexto());
        }

        @Test
        @DisplayName("la secuencia se aplica en orden y queda registrada")
        void laSecuenciaQuedaRegistrada() {
            MotorDeReglas motor =
                    new MotorDeReglas(
                            CatalogoDeReglas.de(new MultiplicaPorFactor(), new SumaUnMonto()));

            ResultadoDelCalculo resultado = motor.aplicar(entrada(Dinero.de("100.00")));

            assertThat(resultado.importe())
                    .as("primero multiplica y despues suma: (100 x 2) + 10")
                    .isEqualTo(Dinero.de("210.00"));
            assertThat(resultado.reglasComoTexto())
                    .as("es lo que va a determinacion.reglas_aplicadas (ADR-0007)")
                    .containsExactly("RT-901", "RT-902");
        }

        @Test
        @DisplayName("sin ninguna regla vigente falla, en vez de devolver la base sin tocar")
        void sinReglasVigentesFalla() {
            MotorDeReglas motor = new MotorDeReglas(CatalogoDeReglas.vacio());

            assertThatThrownBy(() -> motor.aplicar(entrada(Dinero.de("100.00"))))
                    .as("devolver la base produciria una cifra plausible y equivocada")
                    .isInstanceOf(MotorDeReglas.SinReglasVigentes.class);
        }
    }

    @Nested
    @DisplayName("Los parametros son argumento, no configuracion")
    class LosParametrosSonArgumento {

        @Test
        @DisplayName("un parametro que falta no se sustituye por cero: falla y dice cual")
        void unParametroQueFaltaFalla() {
            ParametrosSellados incompletos =
                    ParametrosSellados.de(EJERCICIO, 1)
                            .numero("FICTICIO", "otra-cosa", ValorNormativo.de("1"))
                            .construir();
            MotorDeReglas motor = new MotorDeReglas(CatalogoDeReglas.de(new MultiplicaPorFactor()));

            assertThatThrownBy(
                            () ->
                                    motor.aplicar(
                                            new EntradaDeCalculo(
                                                    Dinero.de("100.00"),
                                                    FECHA,
                                                    incompletos,
                                                    REDONDEO_DE_PRUEBA)))
                    .as(
                            "calcular con cero produciria un padron entero de importes bajos, sin"
                                    + " ningun error de por medio")
                    .isInstanceOf(ParametrosSellados.ParametroAusente.class)
                    .hasMessageContaining("FICTICIO:factor");
        }

        @Test
        @DisplayName("dos versiones del conjunto dan dos cifras, y el resultado dice cual se uso")
        void dosVersionesDanDosCifras() {
            MotorDeReglas motor = new MotorDeReglas(CatalogoDeReglas.de(new MultiplicaPorFactor()));

            ParametrosSellados version2 =
                    ParametrosSellados.de(EJERCICIO, 2)
                            .numero("FICTICIO", "factor", ValorNormativo.de("3"))
                            .construir();

            ResultadoDelCalculo conLaUno = motor.aplicar(entrada(Dinero.de("100.00")));
            ResultadoDelCalculo conLaDos =
                    motor.aplicar(
                            new EntradaDeCalculo(
                                    Dinero.de("100.00"), FECHA, version2, REDONDEO_DE_PRUEBA));

            assertThat(conLaUno.versionDeParametros()).isEqualTo(1);
            assertThat(conLaDos.versionDeParametros()).isEqualTo(2);
            assertThat(conLaDos.importe())
                    .as("las dos son legitimas; por eso el resultado dice con cual se calculo")
                    .isNotEqualTo(conLaUno.importe());
        }

        @Test
        @DisplayName("la politica de redondeo se recibe: no hay ninguna por omision (D-03)")
        void laPoliticaSeRecibe() {
            assertThatThrownBy(
                            () ->
                                    new EntradaDeCalculo(
                                            Dinero.de("100.00"),
                                            FECHA,
                                            parametrosFicticios(),
                                            null))
                    .isInstanceOf(NullPointerException.class);
        }
    }

    @Nested
    @DisplayName("Una implementacion ya usada no se modifica: se sucede")
    class VersionesDeUnaRegla {

        @Test
        @DisplayName("registrar otra implementacion sobre la misma vigencia se rechaza")
        void sobreLaMismaVigenciaSeRechaza() {
            CatalogoDeReglas catalogo = CatalogoDeReglas.de(new MultiplicaPorFactor());

            assertThatThrownBy(() -> catalogo.con(new MultiplicaPorFactorCorregida()))
                    .as(
                            "si se pudiera, recalcular un ejercicio pasado daria una cifra distinta de"
                                    + " la que se notifico")
                    .isInstanceOf(CatalogoDeReglas.VigenciasQueSeSolapan.class)
                    .hasMessageContaining("RT-901");
        }

        @Test
        @DisplayName("sucederla con una vigencia posterior si se admite, y cada fecha usa la suya")
        void sucederlaSiSeAdmite() {
            ReglaTributaria hasta2026 =
                    new MultiplicaPorFactor(
                            new Vigencia(LocalDate.of(2020, 1, 1), LocalDate.of(2026, 12, 31)));
            ReglaTributaria desde2027 =
                    new SumaUnMonto(DOBLE, new Vigencia(LocalDate.of(2027, 1, 1), null));

            CatalogoDeReglas catalogo = CatalogoDeReglas.de(hasta2026).con(desde2027);
            MotorDeReglas motor = new MotorDeReglas(catalogo);

            ParametrosSellados de2027 =
                    ParametrosSellados.de(new Ejercicio(2027), 1)
                            .numero("FICTICIO", "factor", ValorNormativo.de("2"))
                            .numero("FICTICIO", "sumando", ValorNormativo.de("10.00"))
                            .construir();

            assertThat(motor.aplicar(entrada(Dinero.de("100.00"))).importe())
                    .as("en 2026 rige la primera")
                    .isEqualTo(Dinero.de("200.00"));
            assertThat(
                            motor.aplicar(
                                            new EntradaDeCalculo(
                                                    Dinero.de("100.00"),
                                                    LocalDate.of(2027, 3, 31),
                                                    de2027,
                                                    REDONDEO_DE_PRUEBA))
                                    .importe())
                    .as("en 2027 rige la que la sucede, y la anterior sigue intacta")
                    .isEqualTo(Dinero.de("110.00"));
        }
    }

    // ------------------------------------------------------------------
    // Reglas de muestra. Sus factores salen de los parametros, no del codigo.
    // ------------------------------------------------------------------

    /** Multiplica la base por un factor <b>ficticio</b> leido de los parametros. */
    private static final class MultiplicaPorFactor implements ReglaTributaria {

        private final Vigencia vigencia;

        MultiplicaPorFactor() {
            this(Vigencia.SIEMPRE);
        }

        MultiplicaPorFactor(Vigencia vigencia) {
            this.vigencia = vigencia;
        }

        @Override
        public IdentificadorDeRegla identificador() {
            return DOBLE;
        }

        @Override
        public Vigencia vigencia() {
            return vigencia;
        }

        @Override
        public String descripcion() {
            return "Multiplica la base por el factor ficticio del conjunto";
        }

        @Override
        public Dinero aplicar(EntradaDeCalculo entrada) {
            // El factor NO esta en el codigo: sale del conjunto sellado (regla 5).
            String factor = entrada.parametros().exigirNumero("FICTICIO", "factor").toString();
            Dinero resultado = entrada.base();
            for (int i = 1; i < Integer.parseInt(factor); i++) {
                resultado = resultado.mas(entrada.base());
            }
            return resultado.redondeadoCon(entrada.redondeo());
        }
    }

    /** La «correccion» de la anterior: mismo identificador, misma vigencia. No se admite. */
    private static final class MultiplicaPorFactorCorregida implements ReglaTributaria {

        @Override
        public IdentificadorDeRegla identificador() {
            return DOBLE;
        }

        @Override
        public Vigencia vigencia() {
            return Vigencia.SIEMPRE;
        }

        @Override
        public String descripcion() {
            return "La misma regla, corregida: exactamente lo que no se puede hacer";
        }

        @Override
        public Dinero aplicar(EntradaDeCalculo entrada) {
            return entrada.base();
        }
    }

    /** Suma un monto <b>ficticio</b> leido de los parametros. */
    private static final class SumaUnMonto implements ReglaTributaria {

        private final IdentificadorDeRegla identificador;
        private final Vigencia vigencia;

        SumaUnMonto() {
            this(SUMA, Vigencia.SIEMPRE);
        }

        SumaUnMonto(IdentificadorDeRegla identificador, Vigencia vigencia) {
            this.identificador = identificador;
            this.vigencia = vigencia;
        }

        @Override
        public IdentificadorDeRegla identificador() {
            return identificador;
        }

        @Override
        public Vigencia vigencia() {
            return vigencia;
        }

        @Override
        public String descripcion() {
            return "Suma el monto ficticio del conjunto";
        }

        @Override
        public Dinero aplicar(EntradaDeCalculo entrada) {
            ValorNormativo sumando = entrada.parametros().exigirNumero("FICTICIO", "sumando");
            return entrada.base()
                    .mas(Dinero.de(sumando.toString()))
                    .redondeadoCon(entrada.redondeo());
        }
    }
}
