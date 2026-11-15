# Pruebas de la interfaz

Herramientas de comprobación: no forman parte de la web publicada.

1. Instalar una vez: `npm install` y `npx playwright install chromium` dentro de `dev/`.
2. Servir el kit desde su carpeta: `python3 -m http.server 8765`.
3. Lanzar desde `dev/`:

| Script | Qué comprueba |
|---|---|
| `node recorrido.mjs` | Test completo en un móvil de 360×740: transiciones, resultados parciales, avance automático, que las preguntas quepan y la cabecera |
| `node guardado.mjs` | Un estado guardado de la versión anterior, la revisión en lista con `reconcile()` y el teclado |
| `node resultados.mjs` | Póster, pestañas, empate y elección, glosario, copiar, compartir imagen, «Cómo se calcula» y repetir |
| `node extras.mjs` | Prioridad 3: fuente, código para otro dispositivo, historial, repetir una parte, imprimir, comparar y animaciones |
| `node capturas.mjs` | axe-core en claro y en oscuro y capturas en los 7 tamaños de la sección 10 (en `dev/out/`) |
| `node og.mjs` | Regenera `web/og.png` |

Las pruebas del cálculo siguen en `tests/run.mjs` (`node tests/run.mjs` desde la carpeta del kit).
