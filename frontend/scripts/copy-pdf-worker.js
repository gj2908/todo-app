// Copies pdf.js's worker build into public/ so it's served from our own
// origin. Browsers refuse to load a Worker script from a different origin
// (unlike <script src>), so pointing workerSrc at a CDN URL doesn't work -
// this has to be same-origin. Runs on every `npm install` so it stays in
// sync with whatever pdfjs-dist version is actually installed.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");

if (!fs.existsSync(src)) {
  console.warn("[copy-pdf-worker] pdfjs-dist worker build not found, skipping:", src);
  process.exit(0);
}

fs.copyFileSync(src, dest);
console.log("[copy-pdf-worker] copied pdf.worker.min.mjs to public/");
