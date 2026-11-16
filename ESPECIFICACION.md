# Tu mapa de personalidad · Especificación del rediseño

Versión 4 · 16 de noviembre de 2026 (nueva dirección visual: «Diario»)

**En una frase:** rehacer la interfaz del test como página web estática con la dirección visual «Diario», sin tocar el cálculo, en tres prioridades con criterios de aceptación comprobables.

---

## 1. Qué hay en el kit

| Ruta | Qué es | ¿Se toca? |
|---|---|---|
| `base/index.html` | Estructura de la página actual | Sí, se rehace |
| `base/styles.css` | Estilos actuales | Sí, se rehace |
| `base/app.js` | Interfaz actual: cuestionario, resultados, figuras y eventos | Sí, se rehace |
| `base/data.js` | Preguntas, opciones con sus claves, descripciones y constantes | **No** (solo erratas, avisando antes) |
| `base/model.js` | Cálculo, preguntas adaptativas, revisión (`reconcile`), elección propia y ayudantes | **No**, salvo que esta especificación lo pida |
| `base/texts.js` | Textos de la interfaz nueva y glosario | Sí, libremente |
| `base/fonts/` | Archivo variable (latín) autoalojada y su licencia OFL | No |
| `tests/run.mjs` | Pruebas del cálculo: `node tests/run.mjs` | No (solo ampliar) |
| `tests/vectors.json`, `tests/estado-guardado.json` | Resultados esperados y un estado real guardado | No |
| `bocetos/` | Capturas de la dirección actual, «Diario» (`diario-*.png`), y el prototipo y las 8 pantallas de la dirección anterior | Referencia visual |
| `referencia/` | Capturas de la versión actual | Referencia de lo que se sustituye |

La base funciona tal cual: abre `base/index.html` o sirve la carpeta con `python3 -m http.server` y entra en `/base/`. Es la misma página que está publicada ahora, dividida en archivos y con el modelo ampliado; da resultados idénticos (comprobado en cuatro recorridos completos y con el estado guardado).

---

## 2. Reglas que no se pueden romper

1. **El cálculo no cambia.** No modifiques preguntas, opciones, claves, orden ni identificadores de `data.js`, ni probabilidades, temperaturas o umbrales de `model.js`. `node tests/run.mjs` tiene que terminar en «Todo bien» en cada entrega.
2. **El progreso guardado sigue valiendo.** Misma clave (`mapa-personalidad-v2`) y mismo formato (`{ans, i, view, seq, gen}`). Los campos nuevos son opcionales y se rellenan con valores por defecto al cargar. Un estado guardado por la versión actual (prueba con `tests/estado-guardado.json`) se abre en la nueva y da los mismos números.
3. **Nada sale del navegador.** Sin CDN, analíticas, cookies ni peticiones a terceros. La fuente ya está autoalojada.
4. **Sin frameworks ni compilación.** HTML, CSS y JavaScript con scripts clásicos, cargados en este orden: `data.js`, `texts.js`, `model.js` y `app.js`. Debe funcionar abriendo el archivo y en cualquier hosting estático.
5. **Español de España**, tuteo, frases cortas, tono cálido y sobrio. Los textos nuevos están en `texts.js`.
6. **Accesible** (WCAG 2.2 AA) en móvil, tableta y escritorio, en claro y en oscuro.

---

## 3. Cómo funciona la base

### Datos

- `ITEMS[id] = {id, part, blk, q, o, d?, c?}`. `part` es `mbti`, `enea` o `inst`; `o` es `[[texto, clave], …]`, con 2 a 4 opciones.
- `BASE`: orden de las 106 preguntas fijas con cuatro marcadores: `#mbti` (tras `c4`), `#enea` y `#wing` (tras `ei6`) e `#inst` (tras `ib6`).

| Bloque | Parte | Qué pregunta | Nº | Botón para saltar |
|---|---|---|---|---|
| A | MBTI | Cómo decides o juzgas (Ti, Te, Fi, Fe) | 14 | No me ha pasado |
| B | MBTI | Cómo percibes (Ni, Ne, Si, Se) | 14 | No me ha pasado |
| D | MBTI | Tu energía con la gente (E/I) | 8 | No me ha pasado |
| C | MBTI | Momentos en que no parecías tú (función inferior) | 4 | No me ha pasado |
| EG | Eneagrama | Grupos: centro, estilo social, problemas, infancia | 24 | No me ha pasado |
| E5 | Eneagrama | Motivaciones dentro de cada centro | 18 | No me ha pasado |
| IP | Instintos | A qué dedicas tu energía | 18 | No me ha pasado |
| IB | Instintos | Punto ciego: lo que **menos** atiendes | 6 | Ninguna encaja |
| TBF / TBEI | MBTI | Desempate (funciones o E/I) | 6 | Ninguna encaja |
| TBE | Eneagrama | Desempate entre dos eneatipos | 6 | Ninguna encaja |
| WG | Eneagrama | Ala (sale siempre) | 3 | Ninguna encaja |
| TBI | Instintos | Desempate de instintos | 3 | Ninguna encaja |

Siempre salen 109 preguntas (106 fijas y 3 de ala), y hasta 124 con desempates.

### Estado y flujo

- `S = {ans, i, view, seq, gen}`.
  - `ans[id]` vale `[]` si se saltó, `[k]` con una opción, o `[k1, k2]` con principal y también, que pesan 2/3 y 1/3.
  - `seq` es el orden real, con los marcadores pendientes.
  - `gen` guarda las preguntas generadas: `tm1–6`, `te1–6`, `tw1–3` y `ti1–3`.
- Para avanzar: `S.i++` y después `settle()`, que resuelve los marcadores que haya en `S.i`. Genera desempates si `unsure(P)`, es decir, si el primero no llega al 60 % o no dobla al segundo. El ala se genera siempre.
- `firstUn()` devuelve la primera pregunta sin contestar o el primer marcador pendiente, y −1 si no queda nada. Los resultados se muestran cuando devuelve −1.

### API del modelo (`model.js`)

| Función | Para qué |
|---|---|
| `item(id)` | Devuelve la pregunta, fija o generada |
| `settle()` / `resolve(m)` | Resuelven los marcadores al avanzar |
| `firstUn()` | Siguiente pendiente |
| `compute(ch?)` | Todos los resultados. `ch` (o `S.choice`) es `{mbti, enea, inst}`, todo opcional: el tipo que la persona elige como suyo |
| `reconcile()` | Al salir de una revisión, rehace desempates y ala si han cambiado. Devuelve los marcadores que ha vuelto a poner |
| `letterProbs(PM)` | Probabilidad de cada letra: `[{E,I},{N,S},{T,F},{J,P}]` |
| `confidence(p)` | `'alta'` (≥ 70 %), `'media'` (≥ 50 %) o `'baja'` |
| `unsure(P)` | Si mostrar la vista de empate (misma regla que los desempates) |
| `txt(R)` | Texto para copiar (el actual) |

`compute()` devuelve:

| Campo | Contenido |
|---|---|
| `PM` | Los 16 tipos con su probabilidad, ordenados |
| `PE` | Los 9 eneatipos, ordenados |
| `PI` | Los 6 órdenes de instintos, ordenados |
| `mbti`, `core`, `wing`, `stack` | Resultado final: elegido o, si no hay elección, el primero |
| `dom` | Probabilidad de cada instinto de ser el dominante |
| `fs`, `ns` | Uso de cada función |
| `eShare` | Proporción de respuestas de extraversión |
| `gp` | Perfil por grupos |
| `tri`, `triKey` | Tritipo: `[{t, c, share}]` y su clave |
| `chosen` | Qué sistemas usan una elección propia (booleanos) |
| `LE`, `ipShare`, `ibw` | Datos internos del cálculo |

Las descripciones están en `data.js`: `T16`, `TEMP`, `FN`, `FPOS`, `E9`, `WING`, `SUB`, `INS`, `SEC`, `BLIND`, `STACK`, `CN`, `ROLE` y `TRI`. Úsalas como hace `renderRes()` en `app.js`.

---

## 4. Sistema visual: «Diario»

**Idea.** Un cuaderno que se rellena contigo. Tinta sobre papel, una serif editorial y lo tuyo marcado con rotulador, como subrayarías lo que te resuena.
- **Mientras respondes:** renglones en vez de cajas, aire y nada que distraiga de pensar en ti.
- **En los resultados, tu retrato:** una página tipográfica con los códigos grandes y marcados con rotulador, con matices: es lo más probable, no una etiqueta cerrada.

**Qué debe sentir la persona:**
- al entrar, curiosidad y confianza;
- al responder, calma y foco;
- al terminar cada parte, una pequeña recompensa;
- al final, reconocimiento («esto soy yo») y ganas de compartirlo.

La propuesta y sus alternativas descartadas («Conversación» y «Constelación») están en el lienzo «Direcciones visuales del test».

### Colores (contraste comprobado)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--paper` | `#fbf8f2` | `#16171d` | Fondo (papel) |
| `--surface` | `#fffdf9` | `#1e2028` | Hojas sueltas: diálogos y burbuja del glosario |
| `--ink` | `#1e2a44` | `#ece6da` | Texto y **avanzar**: botón principal, progreso y foco |
| `--ink2` | `#5b6375` | `#b4b0a6` | Texto secundario (5,7:1 y 8,2:1) |
| `--line` | `#858a99` | `#7d7a74` | Bordes de controles (3,2:1 y 4,2:1) |
| `--hair` | `#e3dccf` | `#2d2f38` | Renglones y separadores (decorativo) |
| `--press` | `#f1ebe0` | `#262832` | Fondo al pulsar o al pasar el ratón |
| `--mark` | `#ffe07a` | `#f5d35e` | **Lo tuyo**: rotulador sobre la opción elegida, tus códigos, tus barras y tus puntos |
| `--mark-line` | `#efbd2a` | `#c9a43a` | Subrayado de «también» |
| `--mark-soft` | `#fff3c4` | `#3a3420` | Fondo de tus tarjetas (subtipo y núcleo del tritipo) |
| `--on-mark` | `#1e2a44` | `#1e2a44` | Texto sobre rotulador (siempre oscuro) |
| `--note`, `--note-line` | `#e7eef9`, `#9fb3d9` | `#222a3d`, `#4a5a82` | **Avisos**: notas al margen en los bloques que cambian las reglas |

**Reglas:**
- Un color, un significado. El amarillo solo marca lo tuyo; avanzar es tinta; los avisos son notas azules.
- En oscuro, el rotulador de los códigos pasa a ser un subrayado grueso, porque la letra clara sobre amarillo no se leería. Sobre la opción elegida, en cambio, la letra se vuelve oscura (`--on-mark`).
- Crecimiento y estrés se distinguen por el trazo, continuo y discontinuo y siempre en tinta, nunca por el color.
- Sin mezclas de color en las figuras (`mix-blend-mode`).

**Tema:** claro u oscuro según `prefers-color-scheme`. Si existe `data-theme="light|dark"` en `<html>`, manda ese. Sin botón de tema.

### Tipografía

Newsreader (serif, licencia OFL), autoalojada: solo los archivos latinos de la redonda (pesos 400–600) y de la cursiva, 82 KB. Para la interfaz, la letra del sistema.

| Uso | Letra | Tamaño |
|---|---|---|
| Títulos de entrada, transiciones y retrato | Newsreader 500; la última palabra del título, en cursiva | 34–46 px en móvil |
| Códigos de resultado (INTP, 6w5…) | Newsreader 600, con el trazo de rotulador detrás | 30–96 px |
| Enunciado | Newsreader 500 | 24 px en móvil y 30 px en escritorio; interlineado 1,24 |
| Contexto del bloque, entradillas y nombres de tipo | Newsreader cursiva 400 | 16–24 px |
| Opciones y texto | Letra del sistema 400 | 16 px; interlineado 1,45 |
| Secundario | Letra del sistema 500 | 13–15 px, nunca menos de 13 |

Sin mayúsculas espaciadas. Las etiquetas llevan mayúscula solo en la primera letra.

### Formas, espacio y emblemas

- Escala de 4 px: 4, 8, 12, 16, 20, 24 y 32.
- Opciones, listas y datos son renglones de 1 px, sin cajas. La letra de cada opción va en cursiva («a.»).
- **Opción elegida:** marca ✓ dibujada a mano y el texto marcado con rotulador.
- **«También»:** subrayado grueso en `--mark-line` y la palabra «también» en cursiva.
- **Botones** redondos: el principal, relleno de tinta; los secundarios, con borde de tinta.
- Sin sombras, salvo en los diálogos y en la burbuja del glosario.
- Objetivos táctiles de 44 px como mínimo, y de 48 px en los botones principales.
- **Emblemas** de línea en tinta (círculo partido, estrella de 9 y tres círculos), a 24 px en la cabecera y a 96 px en las transiciones.

### Movimiento

- Cambio de pregunta: 180 ms; aparece subiendo 8 px.
- Al elegir: el rotulador se traza sobre la opción (260 ms) y la ✓ aparece (160 ms).
- Avance automático: una línea de tinta de 1200 ms bajo la opción elegida.
- Al mostrar el resultado: los renglones entran escalonados, el rotulador se traza bajo los códigos y las barras crecen.
- Con `prefers-reduced-motion: reduce`, nada se desplaza ni se anima; la línea del temporizador se queda quieta.

---

## 5. Pantallas y comportamiento

Las pantallas corresponden a los bocetos 1 a 8. Las medidas son para un móvil de 390 px salvo que se diga otra cosa.

### 5.1 Entrada (boceto 1)

- Título, entradilla y las tres partes, cada una con su emblema, qué mide, número de preguntas y minutos, más la nota de los desempates (`TEXTOS.entrada`).
- «Cómo contestar», en 3 puntos.
- Interruptor «Pasar solo a la siguiente», activado por defecto; se guarda en `S.prefs.auto`.
- Aviso de privacidad y botón «Empezar».
- Si ya hay progreso: «Continuar por la pregunta {n}» y «Empezar de cero». Este último pide confirmación en un `<dialog>`.
- El enlace «Qué es y qué no es este test» abre `TEXTOS.metodo` en un diálogo.
- Si el navegador no deja guardar, aviso (`TEXTOS.pregunta.sinGuardar`) aquí y en las preguntas.

### 5.2 Pregunta (bocetos 2, 4 y 8)

- **Barra superior** (56 px): Atrás (icono de 44 px, deshabilitado en la primera pregunta), luego emblema, parte y «12 de 40», y a la derecha Ayuda (icono «?»).
- **Progreso:**
  - tres segmentos, proporcionales al número de preguntas de cada parte (incluidas las generadas);
  - debajo, «Te quedan unos {min} min».
- **Contexto:**
  - la instrucción del bloque (`instr(it)`) en `--ink2`, a 14 px;
  - en los bloques C e IB, en los desempates y en el ala, va en su lugar un **aviso** fijo, como nota al margen, (`TEXTOS.transiciones.X.aviso`).
- **Enunciado:** `<h2 tabindex="-1">`.
- **Opciones:** botones con `aria-pressed`, con la letra A–D en un círculo, el texto y un chip a la derecha.
  - **Sin elegir:** fondo `--surface` y borde `--line`.
  - **Principal:** relleno `--ink`, texto `--paper` y ✓ en el círculo. El chip «Principal» solo aparece si hay también.
  - **También:** borde de 2 px en `--ink` y chip «También».
  - **Pulsado** (`:active`): fondo `--press`.
  - **Táctil:**
    - sin resaltado del navegador (`-webkit-tap-highlight-color: transparent`);
    - hover solo con ratón (`@media (hover:hover) and (pointer:fine)`);
    - `touch-action: manipulation`.
- **Barra inferior fija:**
  - a la izquierda, «No me ha pasado» o «Ninguna encaja», como botón de texto subrayado: registra `[]` y avanza;
  - a la derecha, «Siguiente →» en tinta, deshabilitado hasta elegir;
  - respeta `env(safe-area-inset-bottom)`;
  - el contenido deja un hueco debajo igual al alto de la barra, y `scroll-padding-bottom` con el mismo valor, para que el foco nunca quede tapado.
- **Desde 900 px de ancho:** columna de 680 px centrada, enunciado de 28 px y botones justo debajo de las opciones (ya no fijos), con la pista de teclas debajo.
- **Pantallas bajas** (menos de 560 px de alto):
  - se oculta «Te quedan…»;
  - el enunciado baja a 19 px y las opciones a 48 px de alto mínimo;
  - en horizontal, con 640 px de ancho o más, las opciones van en dos columnas.
- **Lógica de elección:** la actual (`pick`).
  - Tocar una opción vacía la hace principal; tocar otra la marca como también.
  - Tocar la principal la quita, y la también pasa a principal.
  - Tocar la también la quita.

### 5.3 Avance automático

- Activado por defecto. Se puede desactivar en la entrada o en la ayuda.
- Cada toque que deje al menos una opción elegida arranca, o reinicia, un temporizador de 1200 ms (constante `AUTO_MS`). Mientras dura, una línea de tinta se vacía en la opción principal. Al terminar, `next()`.
- Se cancela si no queda ninguna opción elegida, si se pulsa Atrás o Ayuda, o si la página se oculta (`visibilitychange`).
- «Siguiente» avanza en el acto.
- No actúa en la revisión ni en preguntas ya contestadas a las que se vuelve con Atrás. Ahí se avanza con «Siguiente».

### 5.4 Transiciones (boceto 3)

- Pantalla completa con:
  - emblema grande;
  - insignia: nota azul en los bloques que cambian las reglas y de tinta en las partes;
  - título, texto, meta y botón.
- **Cuándo salen:**
  - antes de la primera pregunta de cada parte;
  - antes de los bloques C e IB;
  - antes del primer desempate de cada parte, con «{n} preguntas más»;
  - antes del ala.
- Solo al avanzar, y una sola vez: se apunta en `S.seen`, por ejemplo `{mbti:1, C:1, tb_enea:1}`. No salen al volver atrás ni al revisar.
- El foco va al título. Intro o el botón continúan.

### 5.5 Progreso y tiempo

- **Tiempo restante** = preguntas conocidas sin contestar (más 3 si el ala aún no se ha generado) × ritmo.
- **Ritmo** = mediana de los últimos 10 tiempos de respuesta, limitada a entre 8 y 40 s. Hasta tener 5 respuestas se usan 20 s. Los tiempos se guardan en `S.pace` (10 como máximo).
- **Texto:** «Te quedan unos {min} min»; con 1 minuto o menos, «Ya casi está».

### 5.6 Ayuda

Un `<dialog>` con:
- los puntos de `TEXTOS.ayuda`;
- el interruptor del avance automático;
- el interruptor «Atajos de teclado», activado por defecto (lo exige el criterio WCAG 2.1.4);
- la pista de teclas.

Esc lo cierra.

### 5.7 Resultado al terminar una parte (boceto 5)

- **Al terminar el MBTI** (desempates incluidos):
  - en una página de papel, el código en grande marcado con rotulador, el nombre, el chip de confianza («Confianza media · 52 %») y el segundo más probable;
  - debajo, cada letra por separado con su barra (`letterProbs`) y la nota que corresponda (ver 5.8);
  - y el primer párrafo de la descripción.
- **Al terminar el eneagrama** (con desempate y ala): eneatipo con ala, confianza y segundo, más la nota de que el tritipo y el subtipo saldrán al final.
- **Botones:** «Seguir con…» y «Parar aquí y seguir otro día», que muestra «Guardado…».
- **Al terminar los instintos** se pasa directamente al mapa completo.

### 5.8 Resultados (bocetos 6 y 7)

**Retrato** (la cabecera de los resultados, en papel):
- título;
- fecha: «Hecho el 15 de noviembre de 2026», guardada en `S.doneAt` al terminar;
- cuatro celdas (MBTI, eneagrama, instintos y tritipo), cada una con:
  - etiqueta, código y nombre;
  - chip con la confianza en palabras y el porcentaje (sin chip en el tritipo);
  - «o {segundo} ({p} %)».
- Si hay elección propia, la celda lleva el chip «Elegido por ti» y la línea «El test: {tipo} ({p} %)».
- Acciones: «Compartir imagen», «Copiar texto» y «Revisar respuestas», más un enlace «Cómo se calcula».

**Pestañas** (`role="tablist"`, fijas arriba al desplazarse):
- MBTI, Eneagrama, Instintos y Tritipo, enlazables con `#mbti`, `#eneagrama`, `#instintos` y `#tritipo`.
- Cada panel empieza por su `<h2>` con la conclusión, y sigue con la figura y el texto. En el móvil, siempre en ese orden: título, figura, texto.

**Panel MBTI:**
1. Título.
2. Vista de empate si `unsure(PM)`.
3. Las letras con su probabilidad (`letterProbs`):
   - si la letra del tipo no pasa del 50 %, «Letra dudosa…»;
   - si todas pasan del 70 % pero el tipo no, «Cada letra sale clara; la duda está en la combinación».
4. Barras de los 5 tipos más probables.
5. Uso de funciones (cómo decides y cómo percibes), con las del tipo en tinta y su etiqueta marcada.
6. Funciones en orden.
7. Descripción, fortalezas y retos.

**Panel Eneagrama:**
1. Título.
2. Vista de empate si `unsure(PE)`.
3. Estrella:
   - el área de cada punto, según su probabilidad;
   - tu eneatipo en amarillo con borde de tinta y el ala con borde grueso de tinta;
   - flechas de crecimiento (trazo continuo) y de estrés (discontinuo) en tinta, con leyenda.
4. Barras de los 9 tipos con el nombre completo: que no se corte, con una columna de etiqueta más ancha o en dos líneas.
5. Descripción y ala.
6. Perfil por grupos en minibarras.
7. Datos: deseo, miedo, pasión, virtud, reto, centro, crecimiento y estrés.

**Panel Instintos:**
1. Título.
2. Vista de empate si `unsure(PI)`.
3. Figura de tres círculos **según el orden final**:
   - el dominante, grande y en amarillo con borde de tinta;
   - el segundo, mediano, en papel con borde de tinta;
   - el punto ciego, pequeño y con borde discontinuo;
   - dentro de cada uno, el código y «1.º», «2.º» o «3.º», sin porcentajes.
4. Barras de los 6 órdenes.
5. Tarjetas Dominante, Secundario y Punto ciego, cada una con «Probabilidad de que sea tu dominante: {p} %» (`R.dom`).
6. Subtipo en una tarjeta `--mark-soft` con borde de tinta, con la etiqueta «contratipo» si corresponde.

Se elimina la nota «Los círculos y el elegido…».

**Panel Tritipo:**
1. Título.
2. Figura del eneagrama con el triángulo de tus tres tipos:
   - triángulo con relleno amarillo translúcido y borde de tinta;
   - tu eneatipo en amarillo y los otros dos con borde grueso de tinta;
   - el resto, pequeños y en gris;
   - sin colores por centro.
3. Tarjetas Núcleo, Segundo y Tercero, cada una con su centro; la del núcleo, en `--mark-soft`.
4. Una explicación breve.

**Vista de empate** (boceto 7):
- Una tarjeta con los dos candidatos en columnas. Cada columna lleva:
  - código y probabilidad;
  - 2 o 3 filas de diferencias:
    - en MBTI, las funciones dominante y auxiliar (`FN`) y el primer párrafo de `T16[x].d`;
    - en eneagrama, el deseo y el miedo básicos y la pasión (`E9`);
    - en instintos, el segundo instinto (`SEC`) y el punto ciego (`BLIND`);
  - el botón «Me reconozco más en este».
- **Al elegir:**
  - se guarda `S.choice[sistema] = tipo` y se recalcula todo con `compute()`;
  - aparece «Elegido por ti», con la opción «Volver al resultado del test»;
  - la elección no cambia ningún porcentaje.

**Glosario:**
- En los textos de resultados, los términos van subrayados con puntos y son botones.
- Al tocarlos se abre una burbuja (en el móvil, una hoja inferior) con la definición de `GLOSARIO`.
- Esc o tocar fuera la cierra.

**Cómo se calcula:** una sección normal (papel y tinta) al final, con `TEXTOS.metodo`, enlazada desde el retrato.

**Copiar texto:** en la primera línea los cuatro códigos («INTP · 6w5 · so/sx · 613»), luego la fecha y después el detalle actual de `txt(R)`.

**Compartir imagen** (prioridad 2):
- Un `<canvas>` de 1080×1350 en papel, con el título, las cuatro celdas (código, nombre y confianza), la fecha y el pie `TEXTOS.compartir.pie`.
- Antes de dibujar, espera a que carguen los pesos de Newsreader que usa (`document.fonts.load`).
- Si `navigator.canShare({files})` lo permite, se comparte; si no, se descarga `mi-mapa-de-personalidad.png`.

**Pie:** «Repetir el test», con un diálogo de confirmación (`TEXTOS.resultados.repetirPregunta`).

### 5.9 Revisar respuestas (prioridad 2)

- Lista por partes, con un `<h2>` por parte. Cada fila lleva:
  - el número;
  - el enunciado, en 2 líneas como máximo;
  - la respuesta: letra y texto corto, «También», «No me ha pasado» o «Sin contestar».

  Las generadas llevan la etiqueta «Desempate» o «Ala».
- Tocar una fila abre esa pregunta en modo edición, sin avance automático y con el botón «Volver a la lista».
- «Ver resultados» llama a `reconcile()`.
  - Si después `firstUn() >= 0`, muestra `TEXTOS.revision.nuevas` y lleva a esa pregunta en modo normal, con su transición de desempate.
  - Si no, va a los resultados.
- Mientras no exista la lista, la revisión actual también debe llamar a `reconcile()` antes de volver a los resultados.

### 5.10 Guardado y errores

- **Al arrancar,** probar `localStorage` escribiendo y borrando una clave de prueba dentro de un try/catch. Si falla, aviso persistente.
- **Estado ampliado**, todo opcional y con valores por defecto: `prefs: {auto: true, keys: true}`, `seen: {}`, `choice: {}`, `pace: []` y `doneAt` (fecha ISO).
- Mantener las líneas de `window.claude?.hot`: no hacen nada fuera de claude.ai.
- **Historial** (prioridad 3): al repetir el test, guardar `{fecha, mbti, enea, inst, tri}` en `mapa-personalidad-historial` y mostrar en los resultados «La otra vez: …».

---

## 6. Accesibilidad

- **Estructura:**
  - un solo `<main>`;
  - cada vista con sus encabezados en orden;
  - en resultados, el `<h2>` de cada panel va antes que su figura.
- **Anuncios:** una región `aria-live="polite"` aparte y oculta a la vista.
  - Al cambiar de pregunta anuncia solo «Pregunta {n} de {m}. {enunciado}».
  - Al tocar una opción, «Elegida», «También» o «Quitada», seguido del texto.
  - La tarjeta de la pregunta no es región viva.
- **Foco:**
  - al cambiar de pregunta, incluso con Atrás o al saltar, va al enunciado;
  - al llegar a los resultados, al `<h1>` del retrato;
  - al abrir un diálogo, dentro de él;
  - al cerrarlo, al botón que lo abrió.
- **Contorno de foco:** 3 px en `--ink`, separado 2 px; nunca tapado por la barra inferior.
- **Contraste:** el de los tokens de la sección 4 (texto a 4,5:1 como mínimo; controles y gráficos, a 3:1).
- **Figuras:** las SVG llevan `role="img"` y un `aria-label` con el resultado real («Eneagrama: 6, 68 %; 3, 22 %…»).
- **Sin desplazamiento horizontal** a 320 px ni con el zoom al 200 %.
- **Otros:**
  - se respeta `prefers-reduced-motion`;
  - `lang="es"`;
  - el avance automático se explica en la entrada y se puede desactivar (WCAG 3.2.2);
  - los atajos de una sola tecla se pueden desactivar en la ayuda (WCAG 2.1.4).

## 7. Teclado

| Tecla | Acción |
|---|---|
| 1–4 o A–D | Elegir, igual que tocar |
| Intro | Con el foco en una opción sin elegir, la elige. En una ya elegida o fuera de las opciones, pasa a la siguiente. Nunca desmarca |
| Espacio | Sobre una opción, igual que tocarla |
| ← | Atrás |
| ? | Ayuda |
| Esc | Cierra el diálogo o la burbuja |

Las teclas no hacen nada si el foco está en un campo de texto o si los atajos están desactivados (Intro y Esc siguen funcionando).

---

## 8. Publicarla como web

- **Archivos:**
  - `index.html`, `styles.css`, `data.js`, `texts.js`, `model.js` y `app.js`;
  - la carpeta `fonts/`;
  - `favicon.svg`, con la estrella del eneagrama en tinta;
  - `og.png`, de 1200×630: el retrato con datos de ejemplo.
- **`<head>`:**
  - `<title>`;
  - `meta description`: «Test de personalidad gratuito a partir de situaciones reales: MBTI, eneagrama, instintos y tritipo. Sin registro: tus respuestas no salen de tu navegador.»;
  - Open Graph: `og:title`, `og:description`, `og:image` con URL absoluta y `og:type`;
  - `twitter:card=summary_large_image`;
  - `theme-color` para claro y para oscuro;
  - enlace canónico.
- **Hosting:** cualquier hosting estático con HTTPS, por ejemplo GitHub Pages, Netlify o Cloudflare Pages (basta con arrastrar la carpeta). Sin servidor ni base de datos.
- **Privacidad:** sin analíticas ni cookies. El almacenamiento local solo guarda el progreso de quien hace el test. Si algún día se añaden analíticas, conviene revisar antes los requisitos legales.
- **Marca:** MBTI® es una marca registrada de The Myers-Briggs Company. Hay que mantener el aviso visible y no presentar el test como el oficial.
- **Peso:** menos de 300 KB en total (las fuentes pesan 82 KB y el JavaScript, unos 160 KB sin comprimir).

---

## 9. Plan por prioridades

Cada punto está terminado cuando cumple su criterio. La numeración es la de la lista acordada.

### Prioridad 1: responder bien

| # | Qué | Terminado cuando |
|---|---|---|
| 1 | Pantalla de entrada (5.1) | Muestra partes, tiempos, cómo contestar, privacidad, interruptor y empezar o continuar; «Empezar de cero» pide confirmación |
| 2 | Cada pregunta en una pantalla (5.2) | En 360×740, enunciado y opciones visibles sin desplazarse en al menos el 90 % de las preguntas; la barra inferior, siempre visible; la cabecera ocupa 100 px como máximo |
| 3 | Barra inferior fija (5.2) | Fija en el móvil y respetando la zona segura; desde 900 px, bajo las opciones |
| 4 | Avance automático (5.3) | 1,2 s con barra; un segundo toque marca «también» y reinicia el tiempo; se puede desactivar; no actúa en la revisión ni al volver atrás |
| 5 | Transiciones y avisos (5.4) | Salen una vez antes de cada parte, de los bloques C e IB, de cada desempate y del ala; el aviso se mantiene durante esos bloques |
| 6 | Progreso honesto (5.5) | Segmentos por parte y minutos restantes; los desempates se anuncian con su número; ningún salto sin explicación |
| 7 | Fallos táctiles | Ni recuadro del navegador al tocar, ni borde pegado tras quitar una opción, ni zoom por doble toque |
| 8 | Teclado (7) | Se puede hacer el test entero sin ratón; Intro nunca desmarca; el foco nunca vuelve al principio de la página |
| 9 | Lector de pantalla (6) | Solo se anuncian la pregunta nueva y los cambios de selección; el enunciado es un encabezado |
| 10 | Contraste (4 y 6) | axe sin fallos de contraste; bordes de 3:1 o más |
| 11 | Textos | «Ninguna encaja» en IB, desempates y ala; la ayuda ya no se repite en cada pregunta; «entre 109 y 124» donde se cuenten las preguntas |
| 12 | Estética «Diario» (4) | Coincide con la dirección A del lienzo de direcciones, en claro y en oscuro |
| 13 | Guardado (5.10) | Un estado guardado de la versión actual se abre y continúa; aviso si no se puede guardar |
| 14 | Revisión que recalcula | Al volver de revisar se llama a `reconcile()` y se llevan las preguntas nuevas |

### Prioridad 2: entender el resultado

| # | Qué | Terminado cuando |
|---|---|---|
| 15 | Resumen con confianza | Póster del boceto 6 con `confidence()` y el segundo |
| 16 | Resultado por partes (5.7) | Sale tras el MBTI y tras el eneagrama, con «Parar aquí» |
| 17 | Figura de instintos corregida | Tamaños según el orden final, sin la nota, y tarjetas con la probabilidad de ser dominante |
| 18 | Título antes que figura, y pestañas | Orden título, figura, texto; pestañas enlazables; axe sin «heading-order» |
| 19 | Vista de empate y elección | Aparece con `unsure`; elegir actualiza todo el mapa y se puede deshacer |
| 20 | Revisar en lista (5.9) | Lista por partes con salto a cualquier pregunta; la vuelta pasa por `reconcile()` |
| 21 | MBTI letra a letra | Letras con su probabilidad y nota de letra dudosa |
| 22 | Colores coherentes | Mismas reglas en las cuatro figuras y ningún color por centro |
| 23 | Glosario | Se pueden tocar todos los términos de `GLOSARIO` que aparecen en los resultados |
| 24 | Estética de retrato | Papel y tinta, códigos marcados con rotulador y sin mezclas de color |
| 25 | «Cómo se calcula» legible | Sección normal, enlazada desde el retrato |
| 26 | Compartir imagen | Un PNG de 1080×1350 que se comparte o se descarga |
| 27 | Detalles | Ningún nombre cortado; «30 %» con espacio; figuras con `aria-label` del resultado |

### Prioridad 3: pulido y extras

| # | Qué | Terminado cuando |
|---|---|---|
| 28 | Microanimaciones | Al elegir, al pasar de pregunta y al mostrar el resultado; ninguna con movimiento reducido |
| 29 | Seguir en otro dispositivo | Un botón copia un código (el estado comprimido en base64) y en la entrada hay un campo para pegarlo |
| 30 | Historial | Al repetir, se guarda el resultado anterior y se muestra qué ha cambiado |
| 31 | Repetir una parte | Borra solo las respuestas de esa parte (y sus generadas) y vuelve a su primera pregunta |
| 32 | Imprimir o PDF | Con `@media print` salen todas las pestañas, sin barras ni botones y con fondo blanco |
| 33 | Fuente ligera | Solo se cargan los archivos latinos de Newsreader (82 KB) |
| 34 | Comparar con otra persona (opcional) | Se pega el texto copiado de otra persona y se ven los dos mapas lado a lado |

**Descartado:** un color por parte, porque choca con «un color, un significado», y el botón de modo oscuro.

---

## 10. Cómo comprobar cada entrega

1. `node tests/run.mjs` termina en «Todo bien».
2. Cargar `tests/estado-guardado.json` en `localStorage['mapa-personalidad-v2']` y abrir la página: los porcentajes coinciden con los de `real` en `tests/vectors.json`.
3. Recorrido completo en 320×568, 360×740, 390×844, 740×360 (horizontal), 720×800, 1280×800 y 1440×900, en claro y en oscuro: sin desplazamiento horizontal ni texto cortado.
4. axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`) sin fallos en la entrada, una pregunta, una transición, el bloque IB, el resultado parcial, cada pestaña de resultados y la revisión, en claro y en oscuro.
5. Hacer el test entero solo con el teclado.
6. Táctil, con emulación de móvil: elegir, quitar, marcar «también» y dar un doble toque rápido.
7. Capturas de las mismas pantallas de los bocetos para compararlas.

---

## 11. Fallos de la versión actual que deben desaparecer

Medidos el 15/11/2026. Sirven de lista de comprobación.

- En 360×740, «Siguiente» quedaba a 1123 px, en una pantalla de 740. En 320×568, a 1224 px; en horizontal (740×360), a 821 px; y en 1440×900, a 948 px.
- Al tocar las opciones aparecía el recuadro azul rectangular del navegador, y en táctil una opción quitada se quedaba con el borde azul.
- Intro sobre una opción la marcaba o la desmarcaba en lugar de avanzar.
- El foco volvía al principio de la página tras Atrás y al llegar a los resultados.
- Toda la tarjeta era región viva y se volvía a leer en cada cambio.
- Contraste insuficiente en la cabecera azul (5 textos en el test y 14 en resultados, entre 3,7:1 y 4,3:1) y bordes de las opciones a 1,5:1.
- En resultados, los gráficos iban antes que el título de su sección.
- La figura de instintos daba al punto ciego el mismo tamaño que al dominante, y hacía falta una nota para explicarlo.
- En el tritipo, los colores del dibujo y los de las tarjetas no coincidían.
- «4 · Individualista» se cortaba en el móvil, y se mezclaban «30%» y «30 %».
- No había ningún aviso cuando el navegador no dejaba guardar.
- Al cambiar respuestas después de terminar, los desempates y el ala no se recalculaban. Ya está resuelto en `model.js` con `reconcile()`; falta llamarlo desde la interfaz.
