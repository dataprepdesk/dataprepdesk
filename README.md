<div align="center">

<img src="public/assets/favicon.svg" alt="DataPrep Desk logo" width="68" height="68">

# DataPrep Desk

**Clean data, without the setup.**

A private-by-default, open-source toolkit for inspecting, cleaning, converting and validating small datasets — entirely in your browser.

[Website](https://dataprepdesk.com) · [Workbench](https://dataprepdesk.com/workbench) · [JSON Tools](https://dataprepdesk.com/json-tools) · [User Guide](https://dataprepdesk.com/guide)

![License](https://img.shields.io/badge/license-MIT-147c76)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-516a80)
![Hosting](https://img.shields.io/badge/hosting-static%20assets-285e80)

</div>

## Features

### Dataset Workbench

Import CSV, TSV or JSON arrays of objects, then:

- **Inspect:** row/column totals, missing values, detected types, distinct values and exact duplicate records.
- **Clean:** trim whitespace, remove wholly empty rows, deduplicate repeated rows, normalise column headers.
- **Preview:** inspect the first 12 rows and per-column statistics.
- **Export:** download the working dataset as CSV, TSV or JSON, or generate a Markdown data-quality report without raw rows.

Values remain strings intentionally so identifiers such as `0007` are not silently coerced. CSV/TSV downloads include basic protection against spreadsheet formulas.

### JSON Tools

- Validate JSON, with readable syntax errors.
- Format JSON for easier inspection.
- Minify JSON and export a file.
- Everything runs locally using standard browser APIs.

### Architecture

The deployed site is a **Cloudflare Workers Static Assets-only application**:

- No Worker server entrypoint, custom API, database or authentication.
- No external JavaScript dependencies or font CDNs.
- No tracking pixels or analytics library.
- No user dataset uploads: parsing and exports happen in the browser.
- No build pipeline to render the website. npm is used for tests and deployment only.

This is a small-file tool, not a database or enterprise ETL system. Limits: **3 MB per input, 10,000 rows, 100 columns**.

## Quick start

Requires Node.js 20+.

```bash
git clone https://github.com/dataprepdesk/dataprepdesk.git
cd dataprepdesk
npm ci
npm run dev
```

Open the localhost URL shown by Wrangler. Production clean-URL routes are `/`, `/workbench`, `/json-tools`, `/guide` and `/privacy`.

```bash
npm run check
```

Run Wrangler's deployment validation:

```bash
npx wrangler deploy --dry-run
```

Deploy (Cloudflare authentication required):

```bash
npm run deploy
```

See [Deployment Guide](docs/DEPLOY.md) for creating the GitHub organisation/repository, Git integration, DNS and custom domain steps.

## Usage and data handling

- Use **Load sample data** to explore without uploading a file.
- Cleaning is applied to a copy of the imported dataset; click **Restore original** to undo the preview.
- Downloaded outputs never replace the source file.
- Nested JSON values are serialised as JSON text in table cells.
- Column type inference is advisory, not a guarantee of data correctness.
- Spreadsheet import/export is inherently sensitive to formula injection. We prefix suspicious cell values in text exports, but users must assess their own file handling.
- JSON parsing uses JavaScript numbers: precision can be lost for very large numeric literals.
- No persistence: a page reload clears the working dataset. Export your work before closing the tab.

Our [architecture notes](docs/ARCHITECTURE.md) and [privacy policy](https://dataprepdesk.com/privacy) explain the boundaries in more detail.

## Repository structure

```text
public/                Static HTML pages and browser code
  assets/
    data-core.mjs      Pure parsing, inspection, cleaning and conversion functions
    workbench.js       Interactive dataset workbench
    json-tools.js      JSON formatter / minifier / validator
    site.css           Responsive design
tests/                 Node built-in test runner
docs/                  Deployment and architecture
.github/workflows/     Continuous integration
wrangler.jsonc         Cloudflare Static Assets configuration
```

## Status and roadmap

**Open beta, v0.1.0.** The currently documented features are implemented. Under evaluation: configurable validation rules, saved local presets and optional AI-assisted explanations. **No AI integration has shipped yet.** Any future integration would require clear consent before uploading user data, server-side key management, and cost/abuse limits.

See [CHANGELOG.md](CHANGELOG.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE). Independent software project; no affiliation with Cloudflare, GitHub or Anthropic.
