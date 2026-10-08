import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../public");
test("every HTML document has a title and lang", () => {
  for (const file of readdirSync(base).filter(n=>n.endsWith(".html"))) {
    const content = readFileSync(path.join(base,file),"utf8");
    assert.match(content,/<html\s+lang=["']en["']/i,file);
    assert.match(content,/<title>[^<]+<\/title>/i,file);
  }
});
test("internal HTML links and static assets resolve", () => {
  const pages = readdirSync(base).filter(n=>n.endsWith(".html"));
  for (const file of pages) {
    const html=readFileSync(path.join(base,file),"utf8");
    for (const [, value] of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
      if (!value.startsWith("/")) continue;
      const u=new URL(value,"https://dataprepdesk.com");
      const ext=path.extname(u.pathname);
      const fileName=u.pathname==="/"?"index.html":u.pathname.slice(1)+(ext?"":".html");
      assert.ok(existsSync(path.join(base,fileName)),file+" links to missing "+value);
    }
  }
});
test("no embedded dynamic Worker backend or missing source placeholders", () => {
  const config=JSON.parse(readFileSync(path.resolve(base,"../wrangler.jsonc"),"utf8"));
  assert.equal(config.main,undefined);
  assert.equal(config.assets.directory,"./public");
  const homepage=readFileSync(path.join(base,"index.html"),"utf8");
  assert.doesNotMatch(homepage,/YOUR_USERNAME|TODO|FIXME|placeholder/);
  assert.match(homepage,/dataprepdesk.com/);
});
