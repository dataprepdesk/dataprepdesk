# Architecture and constraints

DataPrep Desk is a small web application served directly from static assets. Cloudflare handles delivery. Parsing and formatting happen in the visitor's browser.

```text
Visitor's browser                 Cloudflare Static Assets
├── source CSV / TSV / JSON  ←─── HTML, CSS, JS
├── data-core.mjs
│   ├── parse and normalise
│   ├── analyse missing/type/duplicates
│   ├── apply chosen transformations
│   └── export CSV, TSV, JSON
├── workbench.js / json-tools.js
│   ├── safe text-only DOM rendering
│   └── local Blob file downloads
└── no upload server or account database
```

## Import

- CSV parser supports quoted fields, escaped double quotes, embedded newlines and CRLF.
- TSV and semicolon/pipe-delimited text are also supported; automatic delimiter detection is heuristic.
- JSON importer accepts arrays of objects; nested objects and arrays are serialised as strings.
- Columns are always strings, preserving IDs with leading zeros.
- Duplicate or missing header names are made unique.
- Limits: 3 MiB text, 10,000 rows, 100 columns.

## Analysis

- Missing means a cell is empty or contains only whitespace.
- Exact duplicates are detected by serialising row arrays without type coercion.
- Type inference classifies Boolean, Integer, Number, Date, Text or Empty.
- Inference is heuristic; date-time and number edge cases may not match a schema.

## Cleanup & exports

- Cleaning operates from the imported original to avoid repeated destructive transformations.
- Export to JSON creates an array of objects whose values are strings.
- Export to CSV/TSV quotes cells where needed.
- Suspicious values beginning with characters commonly used by spreadsheet formulas are prefixed on export by default. This mitigates rather than eliminates spreadsheet injection across all spreadsheet applications.
- Markdown quality reports include dataset statistics and column names but omit raw rows.
- File downloads happen using `Blob` and a transient object URL.
- No files, tokens or identifiers are persisted in localStorage.

## Security

Do not use `innerHTML` for untrusted data. UI rendering must use `textContent` and DOM APIs. Uploaded files are client-side only and have size and row limits, but browser memory usage is still influenced by dataset contents. Avoid introducing arbitrary remote data fetching without user consent.

There is no AI integration in the current release. Any future Claude feature would require a separately designed server-side key boundary, consent UI, abuse controls, and cost caps. Do not place an API key in a static JavaScript bundle.

## Testing

Run `npm run check` for pure parsing and export tests, route/link tests and syntax checks, and `npx wrangler deploy --dry-run` for deployment validation. Test interactions in a browser before announcing production readiness.
