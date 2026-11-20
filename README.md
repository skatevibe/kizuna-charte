# Kizuna — Charte graphique

Charte graphique de [Kizuna](https://kizuna.games), Trading Card Game.

- **Charte en ligne** : `charte/charte.html` (servie par GitHub Pages)
- **PDF** : `charte/charte.pdf`
- **Tokens CSS** : `charte/tokens.css`
- **Logos vectorisés** : `logos/` (logo complet sombre / clair / mono, wordmark, sceau carré, hanko, soleils)

## Mettre à jour

La charte est générée à partir de `brand.json`.

1. Modifier `sources/brand.template.json` (textes, couleurs) ou `sources/brand.css` (styles des démos).
2. `node sources/assemble.mjs` pour réécrire `brand.json`.
3. Relancer le build et le contrôle du skill charte-graphique : `build.mjs brand.json` puis `check.mjs brand.json --pdf charte/charte.pdf`.
