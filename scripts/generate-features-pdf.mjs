import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const mdPath = path.join(root, "docs", "VET_CLINIC_FEATURES.md");
const pdfPath = path.join(root, "docs", "VET_CLINIC_FEATURES.pdf");

const md = fs.readFileSync(mdPath, "utf8");

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function mdToHtml(markdown) {
  const lines = markdown.split("\n");
  const out = [];
  let inTable = false;
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("# ")) {
      closeList();
      closeTable();
      out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      closeTable();
      out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      closeTable();
      out.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("|")) {
      closeList();
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c.replace(/:/g, "")))) continue;
      if (!inTable) {
        out.push('<table><thead><tr>');
        cells.forEach((c) => out.push(`<th>${inline(c)}</th>`));
        out.push("</tr></thead><tbody>");
        inTable = true;
      } else {
        out.push("<tr>");
        cells.forEach((c) => out.push(`<td>${inline(c)}</td>`));
        out.push("</tr>");
      }
      continue;
    } else {
      closeTable();
    }

    if (line === "---") {
      closeList();
      out.push("<hr />");
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    closeList();

    if (line === "") {
      out.push("<br />");
      continue;
    }

    if (line.startsWith("*") && line.endsWith("*")) {
      out.push(`<p><em>${escapeHtml(line.slice(1, -1))}</em></p>`);
      continue;
    }

    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  closeTable();
  return out.join("\n");
}

function inline(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ClinixDev / VetFlow — Features</title>
  <style>
    @page { margin: 20mm 18mm; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #1a1a1a;
      max-width: 100%;
    }
    h1 { font-size: 22pt; margin: 0 0 12pt; color: #0f4c5c; border-bottom: 2px solid #0f4c5c; padding-bottom: 6pt; }
    h2 { font-size: 14pt; margin: 18pt 0 8pt; color: #1b4332; page-break-after: avoid; }
    h3 { font-size: 12pt; margin: 12pt 0 6pt; color: #333; }
    p, li { margin: 4pt 0; }
    ul { margin: 6pt 0 10pt 18pt; padding: 0; }
    hr { border: none; border-top: 1px solid #ccc; margin: 14pt 0; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 10pt; }
    th, td { border: 1px solid #ccc; padding: 5pt 7pt; text-align: left; vertical-align: top; }
    th { background: #f0f4f8; font-weight: 600; }
    tr { page-break-inside: avoid; }
    strong { font-weight: 600; }
    em { color: #555; font-size: 10pt; }
  </style>
</head>
<body>
${mdToHtml(md)}
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "20mm", right: "18mm", bottom: "20mm", left: "18mm" },
});
await browser.close();

console.log(`Wrote ${pdfPath}`);
