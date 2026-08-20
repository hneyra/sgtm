package pe.gob.sgtm.catastro.dominio;

/**
 * Las siete partidas de la tabla de valores unitarios de edificacion (RF-009), tal como las trae el
 * manual: muros y columnas, techos, pisos, puertas y ventanas, revestimientos, banos e
 * instalaciones electricas y sanitarias.
 *
 * <p>Es el mismo catalogo que ya fija {@code construccion} para sus siete categorias por partida
 * (V1): esta enumeracion tiene que seguir coincidiendo con esa, porque son las dos mitades de la
 * misma matriz —{@code construccion} dice que letra le toca a cada partida de una edificacion
 * concreta, y esta tabla dice cuanto vale cada letra—.
 */
public enum Partida {
    MUROS,
    TECHOS,
    PISOS,
    PUERTAS,
    REVESTIMIENTOS,
    BANIOS,
    INSTALACIONES
}
