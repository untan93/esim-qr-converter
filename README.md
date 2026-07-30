# eSIM Activation Code ↔ QR Converter

A static, browser-only website that:

- Converts a complete eSIM LPA activation string into a QR code.
- Builds the common `LPA:1$SM-DP+$MatchingID` form from separate fields.
- Reads a QR code from an uploaded image and returns its raw content.
- Parses common `LPA:1$...` fields and displays any additional parameters when detected.

A carrier confirmation code is typically entered separately in the device UI when requested; it is not assumed to be the fourth QR field.

## Privacy model

Activation strings and uploaded images are processed inside the browser. The project has no backend, database, analytics, account system, or upload API.

The page loads two pinned open-source JavaScript libraries from jsDelivr:

- `qrcodejs@1.0.0` for QR generation.
- `jsqr@1.4.0` for QR decoding.

For a fully offline deployment, download those two library files, store them locally, and replace their `<script src>` paths in `index.html`.

## Run locally

Because this is a static site, either open `index.html` directly or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy

Upload the folder to any static host, including GitHub Pages, Cloudflare Pages, Netlify, Vercel, or an ordinary web server.

No build step is required.

## Important

An eSIM activation code can grant access to download a mobile profile. Treat activation strings and generated QR codes like credentials.
