# Nunca Fuiste al Cine

Landing del programa de radio **Nunca Fuiste al Cine** (cine, cuarta temporada),
sábados de 14 a 16hs por FM La Tribu — también en Spotify y YouTube.

**Sitio en vivo:** https://micaelajara.github.io/nunca-fuiste-al-cine/

## Sobre el proyecto

Sitio multi-página (home, columnas, merch, preguntas frecuentes y una página
propia por cada integrante del equipo) construido y mantenido por mí de punta
a punta: diseño, maquetación, contenido, automatización y testing.

## Stack

- **HTML, CSS y JavaScript vanilla** — sin frameworks ni build step, publicado
  directo en GitHub Pages.
- **CSS responsive fluido** con `clamp()` para que tipografía y espaciados
  escalen de forma continua entre mobile y desktop, en vez de saltar en un
  único breakpoint.
- **Accesibilidad**: encabezados semánticos y texto alternativo, respeto a
  `prefers-reduced-motion` en las animaciones de scroll, navegación y
  dropdowns operables por teclado.
- **SEO**: meta tags Open Graph/Twitter Card, `canonical` por página,
  `sitemap.xml` y `robots.txt`.
- **GitHub Actions**: workflow diario (`update-episode.yml`) que consulta la
  API de Spotify, detecta si hay un episodio nuevo y commitea solo el cambio
  en `index.html` — sin intervención manual.
- **Playwright** para testing end-to-end (`tests/nfac.spec.js`): título y
  metadata, menú mobile, montos de suscripción, FAQ y links del footer.

## Testing

```bash
npm install
npx playwright test
```

Los tests corren contra `http://localhost:8744`, así que hay que tener el
sitio servido en ese puerto (por ejemplo con `python3 -m http.server 8744`).

## Correr el sitio localmente

```bash
python3 -m http.server 8744
```

Y abrir `http://localhost:8744` en el navegador.
