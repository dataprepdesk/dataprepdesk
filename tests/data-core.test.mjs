import test from "node:test";
import assert from "node:assert/strict";
import {
  EXAMPLE_CSV, parseDelimited, detectDelimiter, parseJsonTable,
  importTable, profileTable, cleanTable, stringifyDelimited, stringifyJson,
  escapeSpreadsheetCell, getColumnType, LIMITS, qualityReportMarkdown
} from "../public/assets/data-core.mjs";

test("CSV parses quoted delimiters, escaped quotes and CRLF", () => {
  const table = parseDelimited('name,note\r\n"A, B","line 1\nline ""two"""\r\n');
  assert.deepEqual(table.headers, ["name", "note"]);
  assert.deepEqual(table.rows, [["A, B", 'line 1\nline "two"']]);
});
test("delimiter guessing recognises TSV and semicolon", () => {
  assert.equal(detectDelimiter("a\tb\nx\ty"), "\t");
  assert.equal(detectDelimiter("a;b\nx;y"), ";");
  assert.equal(detectDelimiter('"a,b";c\n"x,y";z'), ";");
});
test("CSV empty final field and one-row input", () => {
  assert.deepEqual(parseDelimited("a,b\n1,\n").rows, [["1", ""]]);
  assert.deepEqual(parseDelimited("a,b").rows, []);
});
test("CSV enforces consistent number of columns", () => {
  assert.throws(() => parseDelimited("a,b\n1,2,3"), /Row 2/);
});
test("unclosed quotes and stray quotes are rejected", () => {
  assert.throws(() => parseDelimited('a,b\n"x,2'), /Unclosed/);
  assert.throws(() => parseDelimited('a,b\nx"y,2'), /Unexpected quote/);
});
test("missing and duplicate headers are made unique", () => {
  assert.deepEqual(parseDelimited("Name,name,,Name\nx,y,z,w").headers, [
    "Name", "name_2", "column_3", "Name_3"
  ]);
});
test("JSON input supports object arrays and nested values", () => {
  const table = parseJsonTable('[{"a":1,"b":{"c":2}},{"b":null,"d":true}]');
  assert.deepEqual(table.headers, ["a", "b", "d"]);
  assert.deepEqual(table.rows, [["1", '{"c":2}', ""], ["", "", "true"]]);
});
test("JSON root requires a non-empty array of objects", () => {
  assert.throws(() => parseJsonTable("{}"), /array/);
  assert.throws(() => parseJsonTable("[]"), /empty/);
  assert.throws(() => parseJsonTable("[1]"), /only objects/);
});
test("CSV, TSV, JSON detection", () => {
  assert.equal(importTable(EXAMPLE_CSV, "example.csv").source, "CSV");
  assert.equal(importTable("a\tb\n1\t2", "example.tsv").source, "TSV");
  assert.equal(importTable('[{"a":"b"}]', "example.json").source, "JSON");
});
test("inspection counts missing cells and duplicate records", () => {
  const report = profileTable(importTable(EXAMPLE_CSV, "example.csv"));
  assert.equal(report.rowCount, 10);
  assert.equal(report.columnCount, 6);
  assert.equal(report.duplicateRows, 1);
  assert.equal(report.columns.find(c => c.name === "monthly_spend").type, "Number");
  assert.ok(report.missingCells >= 2);
});
test("type inference is advisory", () => {
  assert.equal(getColumnType(["0","3","-2"]), "Integer");
  assert.equal(getColumnType(["10.4","-2"]), "Number");
  assert.equal(getColumnType(["true","false"]), "Boolean");
  assert.equal(getColumnType(["2026-10-08"]), "Date");
  assert.equal(getColumnType([""]), "Empty");
  assert.equal(getColumnType(["01","2"]), "Text");
});
test("cleanup trims values and removes duplicates and empty rows", () => {
  const table = {headers:["Customer Name","Value"],rows:[
    [" Acme "," 1 "],["Acme","1"],["",""],[" Beta "," 2 "]
  ]};
  const out = cleanTable(table,{trim:true,dropEmpty:true,dedupe:true,slugHeaders:true});
  assert.deepEqual(out.headers,["customer_name","value"]);
  assert.deepEqual(out.rows,[["Acme","1"],["Beta","2"]]);
  assert.equal(table.rows.length,4,"original not mutated");
});
test("CSV/JSON roundtrip retains quoted characters and leading zeros", () => {
  const original = {headers:["id","comment"],rows:[["001","hello, world"],["002","line\none"],["003",'a "quote"']]};
  const csv = stringifyDelimited(original);
  assert.deepEqual(parseDelimited(csv), original);
  const json = stringifyJson(original);
  assert.deepEqual(parseJsonTable(json), original);
});
test("formula-like data is protected when exporting CSV", () => {
  assert.equal(escapeSpreadsheetCell("=CMD()"), "'=CMD()");
  assert.equal(escapeSpreadsheetCell("+SUM(1,2)"), "'+SUM(1,2)");
  assert.equal(escapeSpreadsheetCell("-42.5"), "-42.5");
  assert.equal(escapeSpreadsheetCell("@hello"), "'@hello");
  const csv = stringifyDelimited({headers:["test"],rows:[["=HYPERLINK(\"x\")"]]});
  assert.match(csv, /^test\n"'=HYPERLINK/);
});
test("input size and column limits", () => {
  assert.throws(() => parseDelimited("x".repeat(LIMITS.bytes + 1)), /too large/);
  assert.throws(() => parseDelimited(Array.from({length:101},(_,i)=>"field_"+i).join(",")), /100 columns/);
});
test("quality report contains useful metrics but not raw data", () => {
  const report = qualityReportMarkdown({ headers: ["internal_id", "secret_text"], rows: [["001", "top-secret-value"], ["002", ""]] }, "review.csv");
  assert.match(report, /Data quality report: review.csv/);
  assert.match(report, /Missing cells: 1/);
  assert.match(report, /\| internal_id \|/);
  assert.doesNotMatch(report, /top-secret-value/);
});
