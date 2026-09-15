# AURA Carballo · Clínica de fisioterapia — web estática

Plantilla nº 1 de la familia **fisioterapia** de la librería WEBS NEGOCIOS.
Concepto: **"Cuerpo en movimiento, luz natural"**. Fisioterapia deportiva y de
rendimiento, no clínica hospitalaria. Sin azul sanitario, sin blanco estéril,
sin agua.

- HTML/CSS/JS estático, sin frameworks ni build. Abrir `index.html` o servir la carpeta.
- Responsive desde 360 px. Sin cookies de terceros (mapa de Google solo por clic).
- Motion: Lenis (único motor de scroll suave) + GSAP ScrollTrigger vía CDN, con
  bypass completo bajo `prefers-reduced-motion`.

## Datos reales usados (tal cual, verificados en la ficha de Google el 15-09-2026)

| Dato | Valor |
|---|---|
| Nombre | AURA Carballo · Clínica de fisioterapia |
| Dirección | Rúa Baixa, 52, 15100 Carballo, A Coruña |
| Teléfono | 981 75 73 69 |
| Google | 5,0 · 76 reseñas (Infobel repite el mismo dato; no se cuenta como segunda fuente) |
| Horario | L–J 9:00–22:00 · V 9:00–15:00 · S–D cerrado |

### El botón "Sitio web" de la ficha de Google
Lleva a **`zalopose.wixsite.com/aurafisioterapia`**: una web Wix antigua y
abandonada de la etapa anterior del negocio en Laracha ("Nos trasladamos a
Carballo"), con texto de relleno de Wix sin editar, otro logo (granate y
amarillo) y una sola fisioterapeuta nombrada. **No** es una web actual. Hay
además Instagram `@auracarballo` y Facebook `AURACarballo.sc`. Nada de eso se
ha volcado a la web nueva sin confirmar (ver "Datos que faltan").

## Estructura (propia, no calcada de otras carpetas)

1. **Hero** (`#inicio`): canvas de campo de aura alrededor del logo (partículas
   cálidas que orbitan y "respiran"), claim, CTA llamar + CTA cómo llegar,
   chip "abierto ahora" calculado en cliente.
2. **Marquee** (madera/negro).
3. **Índice de cuerpo** (`#cuerpo`): silueta con 7 zonas clicables
   (`role="tablist"`, flechas/Inicio/Fin, `aria-live`), panel lateral con
   "lo que suele traer a la gente" + tratamiento **[SERVICIO PENDIENTE]**.
4. **Servicios** (`#servicios`): sticky stack de 5 paneles a pantalla completa
   (negro / hueso / césped / madera / terroso), cinta kinesiológica que barre
   al entrar, el panel anterior se encoge y se vela; raíl de puntos.
5. **Horario** (`#horario`): timeline semanal 8:00→23:00 con barras por día,
   marcador "ahora" (hora Europe/Madrid) y estado abierto/cerrado.
6. **Reseñas** (`#opiniones`): 5,0 gigante + 76 reseñas reales; 3 tarjetas
   **[RESEÑA PENDIENTE]**.
7. **Equipo** (`#equipo`): 3 fichas **[NOMBRE / TITULACIÓN / Nº / FOTO PENDIENTE]**.
8. **Contacto** (`#contacto`): dirección, teléfono, horario, mapa por clic.
9. **Footer** + diálogos de aviso legal, privacidad y cookies (con huecos fiscales marcados).

## Motion

- Lenis smooth scroll · marquee CSS · botones magnéticos (solo puntero fino) ·
  sticky stack con scrub · char-reveal elástico en titulares (`data-split`,
  texto íntegro para lectores de pantalla) · reveals "músculo" (estira y
  suelta) · reveals por cinta (`.tape`) en los kickers y en cada panel.
- **Canvas del hero** (`js/aura-canvas.js`): los glows son **sprites cacheados
  en canvas offscreen** (gradiente radial dibujado una vez por tinte); en el
  frame solo hay `drawImage`. Sin `filter`, sin `shadowBlur`. DPR tope 1,5,
  pausa fuera de pantalla y con la pestaña oculta, puntero aditivo.
- `prefers-reduced-motion`: sin Lenis, sin canvas (queda el póster CSS), sin
  marquee, sin stack pegajoso; todo en estado final.

## Fotografía — IMPORTANTE

El brief pedía fotografía **generada** con grading cálido común. En este
entorno **no había herramienta de generación de imagen**, así que se usaron
**fotografías de ambiente con licencia Unsplash** (uso comercial libre, se
acredita igualmente) y se gradaron todas igual con `scripts/process_photos.py`
(luces a madera clara, sombras a negro cálido, saturación contenida). Ninguna
es una foto real de AURA Carballo y la web lo etiqueta en cada imagen.

| Slot pedido | Foto usada | Autor | ID |
|---|---|---|---|
| Manos de fisio sobre piel, luz lateral | manos de terapeuta en un hombro | Sincerely Media | wGFibXDQlBI |
| (motivo) piel con sombra de planta | cuerpo con sombra de planta y luz de ventana | Redd Francisco | XgC_lGgHD8c |
| Atleta en readaptación | deportista con la mano en la rodilla, sol bajo | Filipe Amaral | wWvDODdTRTE |
| Pistola de masaje negra sobre madera | pistola de masaje negra (fondo neutro, gradado) | Javier Esteban | vw353SJTT80 |
| Césped artificial y camilla | césped artificial de entrenamiento (sin camilla) | Long Chung | U1mEPbF_ejA |
| Texturas de sombra de planta | sombra de rama / monstera / plantas en pared | Alex He · Ranurte · Pawel Czerwinski | IGsLkWL4JMM · 7L-u875mqNQ · fK_d1gBw2s0 |

Las fotos del local que aparecen en la ficha de Google (pistola con el logo,
sala con césped y sillas rojas) se usaron **solo como referencia de paleta**;
son de baja resolución y no se publican.

## Logo — PROVISIONAL

No llegó el archivo del logo. Se ha recreado **a partir de la foto de la ficha
de Google** (la pistola de masaje con "aura CARBALLO" serigrafiado):
caligráfica "aura" en Caveat 600 + "CARBALLO" en Manrope con tracking. En la
web se renderiza como texto con la webfont (`.brand`, `.hero-logo`); en
`assets/img/logo/` hay versiones SVG en trazados (`logo.svg`, `logo-hueso.svg`,
`logo-negro.svg`, `mark.svg`) y los favicons/OG generados con
`scripts/generate_brand.js`. **Sustituir por el archivo oficial** en cuanto
exista; no es una reproducción fiel, es una aproximación.

## Verificación (`scripts/verify.js`, Playwright)

```
NODE_PATH=%APPDATA%\npm\node_modules node scripts/verify.js http://127.0.0.1:8765/
```

Comprueba: aviso de cookies (botón oculta con `display:none` real y se recuerda
tras recargar), CTAs del hero y cabecera reciben el clic y rejilla de 253
puntos sin zonas muertas sobre el canvas, índice de cuerpo por teclado (flechas
y Fin, foco visible), mapa sin iframe hasta el clic, `PerformanceObserver`
longtask durante la intro y el scroll completo, reduced-motion sin canvas ni
Lenis, sin scroll horizontal a 390 y 360 px, y capturas de cada sección en
`screenshots/`. Resultado en `scripts/verify-report.json`.

Nota sobre longtasks: hay una tarea de ~110-190 ms **antes de `load`** que es
el primer parse/estilo/layout del documento; aparece igual bloqueando todo el
JS (se probó bloqueando canvas, main.js, GSAP/Lenis y todo `.js`). Durante la
intro del hero y el scroll completo: **cero** longtasks > 50 ms.

## Datos que faltan (placeholders marcados en la web)

- Servicios concretos (nombre + descripción de los 5 paneles, y el tratamiento
  por zona en el índice de cuerpo). En canales propios aparecen, sin confirmar:
  fisioterapia, osteopatía, suelo pélvico, ATM, ecografía, Indiba, ondas de
  choque, pilates terapéutico, embarazo y posparto.
- Textos de 3 reseñas reales de Google y nombre de quien las firma.
- Equipo: nombres, titulaciones, números de colegiado y fotos. (La Wix antigua
  nombra a "Lorena Cabeza Puñal, Col. 1613"; no se ha usado sin confirmar.)
- Logo oficial en archivo.
- Fotografía propia o generada (sustituye a la de ambiente).
- Aviso legal: razón social, NIF, email de contacto, colegio profesional.
- Precios (no hay ninguna sección de precios; añadir si se quiere).

## Estructura de archivos

```
index.html · 404.html · manifest.json
css/style.css
js/main.js            motion, índice de cuerpo, horario en directo, cookies, mapa, diálogos
js/aura-canvas.js     campo de aura del hero (sprites cacheados)
assets/img/logo/      logo provisional (SVG trazados) + favicons
assets/img/photos/    fotos gradadas (-1600, -900, -lqip)
assets/img/web/       og-image.jpg
scripts/process_photos.py   descarga + gradación (procedencia documentada)
scripts/generate_brand.js   favicons y OG (Playwright)
scripts/verify.js           verificación Playwright + capturas
screenshots/                capturas de cada sección (escritorio y móvil)
```
