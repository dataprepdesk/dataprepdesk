/**
 * DataPrep Desk: deterministic, browser-safe dataset utilities.
 * No external dependencies. Cells remain strings to preserve leading zeros.
 */
export const LIMITS = Object.freeze({ bytes: 3 * 1024 * 1024, rows: 10000, columns: 100 });
const NL = "\n";
export const EXAMPLE_CSV = `customer_id,company,region,plan,monthly_spend,status
1001,Acme Supplies,North,Pro,89.00,Active
1002,Northport Studio,West,Basic,19.00,Active
1003,Greenway Co,South,Pro,89.00,Trial
1004,Acme Supplies,North,Pro,89.00,Active
1005,Harbour Works,East,,39.00,Active
1006,  Bright Office  ,West,Basic,19.00,Inactive
1006,  Bright Office  ,West,Basic,19.00,Inactive
1007,Westbank Design,,Enterprise,240.00,Active
1008,Sunrise Labs,South,Basic,19.00,Trial
1009,Maple Consulting,East,Pro,89.00,Active`;

function sizeGuard(text) {
  if (typeof text !== "string") throw new TypeError("Expected text input.");
  if (new TextEncoder().encode(text).length > LIMITS.bytes) {
    throw new Error("File is too large. The browser workbench accepts up to 3 MB.");
  }
}
export function parseDelimited(text, delimiter = ",") {
  sizeGuard(text);
  if (!["\t", ",", ";", "|"].includes(delimiter)) throw new Error("Unsupported delimiter.");
  if (text.startsWith("\ufeff")) text = text.slice(1);
  if (!text.trim()) throw new Error("Input is empty.");
  const records = [];
  let record = [], field = "", quoted = false, afterQuote = false;
  function finishField() { record.push(field); field = ""; afterQuote = false; }
  function finishRow() {
    finishField();
    records.push(record);
    if (records.length > LIMITS.rows + 1) throw new Error("Maximum of 10,000 data rows exceeded.");
    record = [];
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; afterQuote = true; }
      } else field += char;
      continue;
    }
    if (afterQuote && char !== delimiter && char !== "\n" && char !== "\r") {
      if (char === " " || char === "\t") continue;
      throw new Error("Unexpected character after closing quote near character " + (i + 1) + ".");
    }
    if (char === '"' && field === "" && !afterQuote) { quoted = true; continue; }
    if (char === '"') throw new Error("Unexpected quote near character " + (i + 1) + ".");
    if (char === delimiter) finishField();
    else if (char === "\r" || char === "\n") {
      finishRow();
      if (char === "\r" && text[i + 1] === "\n") i++;
    } else field += char;
  }
  if (quoted) throw new Error("Unclosed quoted value in delimited text.");
  if (record.length || field !== "" || afterQuote) finishRow();
  if (records.length === 0) throw new Error("No rows found.");
  // Skip trailing empty physical record only (not meaningful rows).
  while (records.length > 1 && records.at(-1).length === 1 && records.at(-1)[0] === "") records.pop();
  const maxColumns = Math.max(...records.map(r => r.length));
  if (maxColumns > LIMITS.columns) throw new Error("Maximum of 100 columns exceeded.");
  if (maxColumns < 1) throw new Error("Missing header row.");
  const headers = uniqueHeaders(records[0]);
  const rows = records.slice(1).map((values, i) => {
    if (values.length !== headers.length) throw new Error(
      "Row " + (i + 2) + " has " + values.length + " columns; expected " + headers.length + "."
    );
    return values;
  });
  return { headers, rows };
}
export function uniqueHeaders(raw, count = raw.length) {
  const used = new Set();
  return Array.from({ length: count }, (_, index) => {
    let name = String(raw[index] ?? "").trim() || "column_" + (index + 1);
    const base = name;
    let n = 2;
    while (used.has(name.toLowerCase())) name = base + "_" + n++;
    used.add(name.toLowerCase());
    return name;
  });
}
export function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
  const scores = [",", "\t", ";", "|"].map(d => {
    let total = 0;
    for (const line of lines) {
      let quoted = false, hits = 0;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          if (quoted && line[i+1] === '"') { i++; continue; }
          quoted = !quoted;
        } else if (!quoted && line[i] === d) hits++;
      }
      total += hits;
    }
    return { delimiter: d, score: total };
  });
  scores.sort((a,b)=>b.score-a.score);
  return scores[0].score > 0 ? scores[0].delimiter : ",";
}
export function parseJsonTable(text) {
  sizeGuard(text);
  let input;
  try { input = JSON.parse(text); }
  catch (err) { throw new Error("Invalid JSON: " + err.message); }
  if (!Array.isArray(input)) throw new Error("JSON input must be an array of objects.");
  if (!input.length) throw new Error("JSON array is empty.");
  if (input.length > LIMITS.rows) throw new Error("Maximum of 10,000 objects exceeded.");
  if (input.some(obj => !obj || typeof obj !== "object" || Array.isArray(obj))) {
    throw new Error("JSON must contain only objects. Nested fields are serialised as JSON text.");
  }
  const keys = [...new Set(input.flatMap(obj => Object.keys(obj)))];
  if (!keys.length) throw new Error("No object fields found.");
  if (keys.length > LIMITS.columns) throw new Error("Maximum of 100 columns exceeded.");
  const headers = uniqueHeaders(keys);
  const cellText = value => value === undefined || value === null ? "" :
    typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
  return { headers, rows: input.map(obj => keys.map(key => cellText(obj[key]))) };
}
export function importTable(text, filename = "") {
  if (/\.json$/i.test(filename) || /^[\s\ufeff]*[\[{]/.test(text)) {
    return { ...parseJsonTable(text), source: "JSON" };
  }
  const delimiter = /\.tsv$/i.test(filename) ? "\t" : detectDelimiter(text);
  return { ...parseDelimited(text, delimiter), source: delimiter === "\t" ? "TSV" : "CSV" };
}
function isEmpty(value) { return String(value ?? "").trim() === ""; }
export function getColumnType(values) {
  const set = values.filter(v => !isEmpty(v)).map(v => String(v).trim());
  if (!set.length) return "Empty";
  if (set.every(v => /^(true|false)$/i.test(v))) return "Boolean";
  if (set.every(v => /^-?(0|[1-9]\d*)(\.\d+)?$/.test(v))) {
    return set.every(v => /^-?(0|[1-9]\d*)$/.test(v)) ? "Integer" : "Number";
  }
  if (set.every(v => /^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(v) && !Number.isNaN(Date.parse(v)))) return "Date";
  return "Text";
}
export function profileTable(table) {
  const { headers, rows } = table;
  if (!Array.isArray(headers) || !Array.isArray(rows)) throw new Error("Invalid table.");
  const columns = headers.map((name, index) => {
    const values = rows.map(row => row[index] ?? "");
    const present = values.filter(v => !isEmpty(v));
    return {
      name, type: getColumnType(values), filled: present.length,
      missing: values.length - present.length,
      unique: new Set(present).size,
      sample: present.slice(0, 3)
    };
  });
  return {
    rowCount: rows.length, columnCount: headers.length,
    missingCells: columns.reduce((s,c)=>s+c.missing,0),
    duplicateRows: rows.length - new Set(rows.map(row => JSON.stringify(row))).size,
    columns
  };
}
export function cleanTable(table, options = {}) {
  const trim = !!options.trim, dropEmpty = !!options.dropEmpty;
  const dedupe = !!options.dedupe, slugHeaders = !!options.slugHeaders;
  let headers = [...table.headers];
  if (slugHeaders) headers = uniqueHeaders(headers.map((v,i) =>
    v.toLowerCase().trim().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"") || "column_" + (i+1)
  ));
  let rows = table.rows.map(row => row.map(value => trim ? String(value).trim() : String(value)));
  if (dropEmpty) rows = rows.filter(row => row.some(value => !isEmpty(value)));
  if (dedupe) {
    const seen = new Set();
    rows = rows.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  return { headers, rows };
}
/** Escape potentially executable spreadsheet formulas when exporting untrusted text. */
export function escapeSpreadsheetCell(value) {
  const str = String(value ?? "");
  if (/^\s*[=+@\-\t\r]/.test(str) && !/^\s*-?(?:\d+\.?\d*|\.\d+)$/.test(str.trim())) return "'" + str;
  return str;
}
export function stringifyDelimited(table, delimiter = ",", protectFormulas = true) {
  const format = (value) => {
    const v = protectFormulas ? escapeSpreadsheetCell(value) : String(value ?? "");
    return /["\r\n]/.test(v) || v.includes(delimiter) ? '"' + v.replace(/"/g,'""') + '"' : v;
  };
  return [table.headers, ...table.rows].map(row => row.map(format).join(delimiter)).join(NL) + NL;
}
export function stringifyJson(table) {
  return JSON.stringify(table.rows.map(row => Object.fromEntries(
    table.headers.map((head, i) => [head, row[i] ?? ""])
  )), null, 2);
}
/** Local, shareable summary without raw data rows. Column names remain visible. */
export function qualityReportMarkdown(table, title = "Dataset") {
  const p = profileTable(table);
  const safe = v => String(v).replace(/[|\r\n]/g, " ").trim();
  const lines = [
    "# Data quality report: " + safe(title), "",
    "Generated locally with DataPrep Desk.", "",
    "## Overview", "",
    "- Data rows: " + p.rowCount,
    "- Columns: " + p.columnCount,
    "- Missing cells: " + p.missingCells,
    "- Exact duplicate rows: " + p.duplicateRows, "",
    "## Column profile", "",
    "| Column | Inferred type | Filled | Missing | Unique |",
    "| --- | --- | ---: | ---: | ---: |"
  ];
  for (const c of p.columns) {
    lines.push("| " + safe(c.name) + " | " + c.type + " | " + c.filled + " | " + c.missing + " | " + c.unique + " |");
  }
  lines.push("", "## Notes", "",
    "- Inferred types are informational and do not enforce a schema.",
    "- Missing values include empty and whitespace-only cells.",
    "- Duplicate detection compares full row values exactly.",
    "- This report omits raw data rows; column names can still be sensitive.", "");
  return lines.join("\n");
}
