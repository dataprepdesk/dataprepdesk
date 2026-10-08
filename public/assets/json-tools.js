const $ = id => document.getElementById(id);
let result = null;
function status(message, error = false) {
  const field = $("json-status");
  field.textContent = message;
  field.classList.toggle("error", error);
}
function action(mode) {
  const raw = $("json-input").value;
  if (new TextEncoder().encode(raw).length > 3*1024*1024) {
    status("JSON input exceeds the 3 MB limit.", true); return;
  }
  try {
    const data = JSON.parse(raw);
    if (mode === "format") result = JSON.stringify(data, null, 2);
    else if (mode === "minify") result = JSON.stringify(data);
    else result = raw;
    $("json-output").textContent = result;
    $("copy").disabled = false; $("download").disabled = false;
    status("Valid JSON ✓ · " + new TextEncoder().encode(result).length.toLocaleString() + " bytes");
  } catch (err) {
    result = null;
    $("json-output").textContent = "Unable to parse JSON.";
    $("copy").disabled = true; $("download").disabled = true;
    status("Invalid JSON: " + err.message, true);
  }
}
for (const mode of ["validate","format","minify"]) $(mode).addEventListener("click", () => action(mode));
$("example").addEventListener("click", () => {
  $("json-input").value = JSON.stringify({
    project: "DataPrep Desk", active: true, features: ["inspect","clean","convert"],
    metadata: { format: "JSON", privateProcessing: true }
  },null,2);
  action("format");
});
$("copy").addEventListener("click", async () => {
  if (result === null) return;
  try {
    await navigator.clipboard.writeText(result);
    $("copy-status").textContent = "Copied to clipboard.";
  } catch {
    $("copy-status").textContent = "Clipboard unavailable. Select the output text manually.";
  }
});
$("download").addEventListener("click", () => {
  if (result === null) return;
  const url = URL.createObjectURL(new Blob([result],{type:"application/json;charset=utf-8"}));
  const a = document.createElement("a"); a.href = url; a.download = "dataprepdesk-formatted.json";
  a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  $("copy-status").textContent = "JSON downloaded.";
});
