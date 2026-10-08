import {
  EXAMPLE_CSV, LIMITS, importTable, profileTable, cleanTable,
  stringifyDelimited, stringifyJson, qualityReportMarkdown
} from "./data-core.mjs";

const $ = id => document.getElementById(id);
let original = null, current = null, filename = "dataset";
const actionIds = ["apply", "restore", "csv", "tsv", "json", "report"];
function status(id, text, error = false) {
  const node = $(id); node.textContent = text; node.classList.toggle("error", error);
}
function setReady(ready) { for (const id of actionIds) $(id).disabled = !ready; }
function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = String(text);
  if (className) el.className = className;
  return el;
}
function showTable(data) {
  const report = profileTable(data);
  $("summary-blank").hidden = true;
  $("preview-blank").hidden = true;
  $("summary").hidden = false;
  $("preview-content").hidden = false;
  $("row-count").textContent = report.rowCount.toLocaleString();
  $("col-count").textContent = String(report.columnCount);
  $("missing-count").textContent = report.missingCells.toLocaleString();
  $("duplicate-count").textContent = report.duplicateRows.toLocaleString();

  const body = $("columns"); body.replaceChildren();
  for (const col of report.columns) {
    const tr = node("tr");
    tr.append(node("td", col.name));
    const type = node("td"); type.append(node("span", col.type, "type-pill")); tr.append(type);
    tr.append(node("td", col.missing));
    tr.append(node("td", col.unique));
    body.append(tr);
  }
  const table = node("table");
  const thead = node("thead"), tr = node("tr");
  data.headers.forEach(h => tr.append(node("th", h)));
  thead.append(tr);
  table.append(thead);
  const tbody = node("tbody");
  data.rows.slice(0, 12).forEach(row => {
    const tr = node("tr");
    row.forEach(value => {
      const missing = String(value).trim().length === 0;
      tr.append(node("td", missing ? "—" : value, missing ? "missing" : ""));
    });
    tbody.append(tr);
  });
  table.append(tbody);
  $("table-preview").replaceChildren(table);
}
function clearSession() {
  original = null; current = null;
  setReady(false);
  $("summary-blank").hidden = false; $("preview-blank").hidden = false;
  $("summary").hidden = true; $("preview-content").hidden = true;
  $("file-indicator").textContent = "Nothing loaded";
  status("load-status", "No data loaded.");
  status("clean-status", "");
  status("export-status", "");
}
function inspect(text, name = "pasted-data.csv") {
  try {
    const data = importTable(text, name);
    original = { headers: data.headers, rows: data.rows };
    current = original;
    filename = (name || "dataset").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g,"-").slice(0,60) || "dataset";
    setReady(true); showTable(current);
    $("file-indicator").textContent = data.source + " · " + filename;
    status("load-status", "Loaded " + data.rows.length.toLocaleString() + " rows and " + data.headers.length + " columns.");
    status("clean-status", "Current table is unchanged.");
  } catch (error) {
    clearSession();
    status("load-status", error.message, true);
  }
}
$("inspect").addEventListener("click", () => {
  inspect($("paste").value, $("file").files[0]?.name || "pasted-data.csv");
});
$("sample").addEventListener("click", () => {
  $("file").value = "";
  $("paste").value = EXAMPLE_CSV;
  inspect(EXAMPLE_CSV, "sample-customers.csv");
});
$("clear").addEventListener("click", () => {
  $("file").value = ""; $("paste").value = ""; clearSession();
});
$("file").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > LIMITS.bytes) {
    clearSession(); status("load-status", "File exceeds the 3 MB limit.", true); return;
  }
  try {
    const text = await file.text();
    $("paste").value = text;
    inspect(text, file.name);
  } catch(error) {
    clearSession(); status("load-status", "Could not read file: " + error.message, true);
  }
});
const drop = $("drop-zone");
drop.addEventListener("dragover", event => { event.preventDefault(); drop.classList.add("drag-over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("drag-over"));
drop.addEventListener("drop", async event => {
  event.preventDefault(); drop.classList.remove("drag-over");
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  if (file.size > LIMITS.bytes) { clearSession(); status("load-status", "File exceeds the 3 MB limit.", true); return; }
  try {
    $("file").value = "";
    const text = await file.text();
    $("paste").value = text;
    inspect(text, file.name);
  } catch(error) { status("load-status", error.message, true); }
});
$("apply").addEventListener("click", () => {
  if (!original) return;
  current = cleanTable(original, {
    trim: $("trim").checked,
    dropEmpty: $("drop-empty").checked,
    dedupe: $("dedupe").checked,
    slugHeaders: $("slug-headers").checked
  });
  showTable(current);
  status("clean-status", "Preview updated. " + (original.rows.length - current.rows.length) +
    " rows removed. Original input has not changed.");
});
$("restore").addEventListener("click", () => {
  if (!original) return;
  current = original; showTable(current);
  status("clean-status", "Restored original dataset.");
});
function download(text, extension, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename + "-prepared." + extension;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
for (const id of ["csv", "tsv", "json", "report"]) {
  $(id).addEventListener("click", () => {
    if (!current) return;
    try {
      if (id === "csv") download("\ufeff" + stringifyDelimited(current, ","), "csv", "text/csv;charset=utf-8");
      if (id === "tsv") download("\ufeff" + stringifyDelimited(current, "\t"), "tsv", "text/tab-separated-values;charset=utf-8");
      if (id === "json") download(stringifyJson(current), "json", "application/json;charset=utf-8");
      if (id === "report") download(qualityReportMarkdown(current, filename), "md", "text/markdown;charset=utf-8");
      status("export-status", "File created successfully on your device.");
    } catch(error) { status("export-status", error.message, true); }
  });
}
clearSession();
