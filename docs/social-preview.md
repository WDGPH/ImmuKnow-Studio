# Social preview

The homepage metadata uses the production origin `https://immuknow.phiz.ca/`.
Vite copies `public/social-preview.png` to the site root without changing its
filename, so social crawlers can read the image without running JavaScript.

The 1200 × 630 card uses the unchanged vector artwork from
`src/assets/studio-logo-light.svg` and the light-theme colours from
`src/style.css`. Its editable source is `src/assets/social-preview.svg`.
If the logo changes, replace the embedded logo group from that source.

To regenerate the committed PNG with Inkscape and DejaVu Sans installed:

```sh
inkscape src/assets/social-preview.svg --export-filename=public/social-preview.png
```

Keep the dimensions and metadata in `index.html` in sync. Check the exported
image visually before committing. Social platforms may cache older previews
after deployment.
