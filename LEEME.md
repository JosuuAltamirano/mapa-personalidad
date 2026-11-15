# Kit para rehacer «Tu mapa de personalidad» como página web

Este kit tiene todo lo necesario para que otro chat construya la nueva versión del test sin perder nada de lo que ya funciona:

- la página actual, dividida en archivos;
- el cálculo, con sus pruebas automáticas;
- la especificación completa del rediseño;
- los bocetos de las pantallas.

## Cómo usarlo en otro chat

1. Abre un chat nuevo.
2. Adjunta `kit-mapa-personalidad.zip`.
3. Pega este mensaje:

```
Te paso un kit para rehacer la interfaz de mi test de personalidad («Tu mapa de personalidad») como página web estática. Descomprime el zip y lee primero LEEME.md y ESPECIFICACION.md enteros.

- La base que funciona está en base/. El cálculo (data.js y model.js) no se toca: tiene pruebas en tests/run.mjs que deben pasar siempre.
- La referencia visual son los bocetos de bocetos/: prototipo.html y sus capturas.
- Trabaja por prioridades. Empieza por la prioridad 1 entera, comprueba los criterios de la sección 9 y las pruebas de la sección 10, y enséñame capturas en móvil y en escritorio, en claro y en oscuro. Espera a que te dé el visto bueno antes de pasar a la prioridad 2.
- Si algo de la especificación falta, choca con otra cosa o no se puede hacer, pregúntame antes de inventarlo.
- Al terminar cada prioridad, dame la carpeta de la web lista para publicar.
```

## Qué hay dentro

| Carpeta | Contenido |
|---|---|
| `ESPECIFICACION.md` | Qué hay que hacer, cómo debe verse y comportarse, y cómo se comprueba |
| `base/` | La página actual, que ya funciona: ábrela con doble clic en `index.html` |
| `tests/` | Pruebas del cálculo: `node tests/run.mjs` (necesita Node.js 18 o superior) |
| `bocetos/` | Prototipo estático de la nueva interfaz y capturas de 8 pantallas (`resumen.png` las junta) |
| `referencia/` | Capturas de cómo se ve ahora, para comparar |

## Probarlo en tu ordenador

- Doble clic en `base/index.html`. Funciona sin servidor y guarda el progreso en ese navegador.
- Para verlo exactamente como se verá publicado, sirve la carpeta: `python3 -m http.server` dentro del kit y abre `http://localhost:8000/base/`.

## Publicarlo cuando esté listo

Es una web estática: no necesita servidor ni base de datos. Puedes publicarla gratis de varias formas:

- **Netlify Drop:** arrastras la carpeta de la web a la página de Netlify Drop.
- **GitHub Pages:** subes la carpeta a un repositorio y activas Pages en la configuración.
- **Cloudflare Pages.**

En los tres casos se obtiene una dirección con HTTPS que se puede compartir.

Cada persona que la abra hace su propio test: las respuestas se quedan en su navegador y no se envían a ningún sitio.
