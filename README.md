<p align="center">
  <img src="logo/logo.png" alt="OpenReview Export logo" width="108" />
</p>

<h1 align="center">OpenReview Export</h1>

<p align="center">
  <b>English</b>
</p>

<p align="center">
  One-click export of <code>openreview.net</code> forums to Markdown or an offline materials ZIP.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/njebpcgdkmphbnchmaapbphcidhcacag">
    <img src="https://img.shields.io/badge/Chrome-Available-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Available" />
  </a>
  <img src="https://img.shields.io/badge/OpenReview-8B1A1A?logo=openaccess&logoColor=white" alt="OpenReview" />
  <img src="https://img.shields.io/badge/Format-Markdown-000000?logo=markdown&logoColor=white" alt="Markdown" />
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/njebpcgdkmphbnchmaapbphcidhcacag">
    <img src="logo/chrome.png" alt="Chrome Logo" width="48" />
  </a>
</p>

---

## Export a forum

Open a paper on OpenReview and use either button at the bottom right.

- **Export Forum (.md)** downloads the submission and readable discussion, including reviews, rebuttals, comments and decisions. Each note links to its source and its parent.
- **Export All Materials (.zip)** includes `forum.md`, the uploaded paper PDF and OpenReview attachments. Extract the ZIP before opening the Markdown to follow local links. External resources stay linked online.

The extension reads pages of notes from OpenReview using your browser session. Forum filters and collapsed threads do not restrict the API export. If OpenReview blocks the request or the response is incomplete, the extension labels the export as partial and includes available page notes. For a missing attachment, the ZIP keeps the online link and lists the error in `missing-files.txt`.

Only current note content is exported. The archive is assembled in browser memory, so very large attachments may exceed the browser's available memory. Data is requested from OpenReview and saved locally.

## Development

Load this directory as an unpacked Chrome extension. Run the regression tests with `node --test`. ZIP generation uses the bundled MIT-licensed fflate 0.8.2 in `vendor/`.
