Place Cubano font files here for the Stagecom display face.

Expected paths:

- `public/fonts/Cubano.ttf` (current)
- `public/fonts/Cubano.woff2`
- `public/fonts/Cubano.woff` (optional fallback)

Public Sans is loaded from Google Fonts in `src/styles.css`.

For production payload size, prefer adding a `woff2` version later and updating
the `@font-face` source in `src/styles.css`.
