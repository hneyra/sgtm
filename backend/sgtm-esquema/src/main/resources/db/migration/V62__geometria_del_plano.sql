-- Las tres capas del plano que no tenian geometria (issue #527).
--
-- `V61` se la dio a `predio` y su ADR lo dijo con todas las letras: «lo que hay
-- es una columna, su indice y el camino que la llena». El artboard del visor
-- pide cinco capas y solo esa podia dibujarse; las otras tres —vias, manzanas y
-- sectores— no tenian de donde.
--
-- Lo que el visor hacia mientras tanto, y por que no bastaba: «Manzanas» y
-- «Sectores» coloreaban los LOTES por el codigo que cada uno declara. Es
-- honesto —cada lote si sabe de que manzana es— pero no es un perimetro: el
-- contorno de una manzana no es la union de los lotes que alguien haya
-- digitalizado, y alli donde falten por levantar —que es en todas partes— esa
-- union sale mordida y se lee como el lindero. Y «Vias» no se dibujaba: sin
-- trazado, una linea del lote a su via de frente seria inventar la calle.
--
-- LOS TRES ARGUMENTOS DE ADR-0021 VALEN IGUAL AQUI:
--
--   geography y 4326, no geometry con una zona UTM. Una instalacion atiende a
--   muchas municipalidades y el Peru abarca 17S, 18S y 19S: un SRID fijo deja a
--   parte de los inquilinos en la proyeccion equivocada, y un SRID por
--   municipalidad no se puede expresar en una columna tipada.
--
--   Multi*, porque una via se parte en tramos con discontinuidades y un sector
--   puede tener enclaves. Aceptar solo Polygon o LineString rechazaria filas
--   legitimas y obligaria a partirlas, que es inventar territorio.
--
--   NULAS, y sin plan de dejar de serlo. La mayoria de las municipalidades no
--   tendran plano digital nunca, y exigirlo dejaria sin poder registrar una via
--   o un sector a quien trabaja sin el.
--
-- LA VIA ES UNA LINEA Y LAS OTRAS DOS SON POLIGONOS, y no es un detalle de
-- tipo: es lo que son. Un eje vial es el trazado por el que la calle pasa; una
-- manzana y un sector son superficies cerradas.
ALTER TABLE via
    ADD COLUMN geometria geography(MultiLineString, 4326);

ALTER TABLE manzana
    ADD COLUMN geometria geography(MultiPolygon, 4326);

ALTER TABLE sector
    ADD COLUMN geometria geography(MultiPolygon, 4326);

COMMENT ON COLUMN via.geometria IS
    'Eje vial en WGS84 (#527). El trazado por donde pasa la calle, no su calzada: '
    'no mide nada y no funda ninguna cifra.';

COMMENT ON COLUMN manzana.geometria IS
    'Perimetro de la manzana en WGS84 (#527). NO se deriva de la union de sus '
    'lotes: alli donde falten lotes por levantar, esa union publicaria un lindero '
    'que nadie levanto.';

COMMENT ON COLUMN sector.geometria IS
    'Perimetro del sector en WGS84 (#527). Mismo trato que la manzana: viene del '
    'plano, no se compone de lo que cuelga de el.';

-- La pregunta por la que las tres columnas existen es «que hay dentro de este
-- marco»: el visor pide una ventana y dibuja lo que cae en ella. Sin indice eso
-- recorre la tabla entera. GiST es el que `geography` admite, y parcial porque
-- la mayoria de las filas la tendran nula.
CREATE INDEX via_geometria_gix
    ON via USING GIST (geometria)
    WHERE geometria IS NOT NULL;

CREATE INDEX manzana_geometria_gix
    ON manzana USING GIST (geometria)
    WHERE geometria IS NOT NULL;

CREATE INDEX sector_geometria_gix
    ON sector USING GIST (geometria)
    WHERE geometria IS NOT NULL;

-- LO QUE ESTAS COLUMNAS NO HACEN, y es la mitad de la decision:
--
--   No valorizan. Ninguna superficie sale de aqui —ni la de la manzana, ni la
--   del sector, ni la longitud de la via—. Vale lo mismo que para el predio
--   (ADR-0021): un area es indistinguible de otra al leerla, y una derivada de
--   un poligono mal digitalizado entraria en el autovaluo sin sintoma.
--
--   No corrigen el padron. Un lote cuyo poligono cae fuera de la manzana que su
--   codigo declara es un HALLAZGO: se remarca para que se vea y no se toca. Ni
--   se le cambia la manzana al predio, ni se recorta el poligono. Arreglarlo es
--   trabajo del area de catastro urbano, con su acto y su observacion; el
--   sistema solo lo ensena. Es la misma frontera de ADR-0015 entre catastro y
--   rentas, y la de ADR-0021 entre el poligono y el area.
--
-- Sin GRANT nuevo, por lo mismo que V61: V7 concede sobre las TABLAS, no por
-- columna. Lo que mantiene la geometria fuera de HTTP no es un privilegio, es
-- que ninguna operacion del contrato la lleve. Entra por la carga cartografica,
-- que corre en el perfil batch.
