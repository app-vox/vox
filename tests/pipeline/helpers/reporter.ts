import { writeFileSync } from "fs";
import { join } from "path";
import type {
  CategoryResult,
  ScenarioResult,
} from "./results-store";
import { readAllResults, getResultsDir, cleanResultsDir } from "./results-store";

function pct(n: number, total: number): string {
  if (total === 0) return "0.0";
  return ((n / total) * 100).toFixed(1);
}

function pad(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function printConsoleReport(categories: CategoryResult[]): void {
  const totalScenarios = categories.reduce((s, c) => s + c.results.length, 0);
  const totalPassed = categories.reduce(
    (s, c) => s + c.results.filter((r) => r.passed).length,
    0,
  );
  const totalFailed = totalScenarios - totalPassed;
  const mode = categories[0]?.mode ?? "unknown";

  const BOX_WIDTH = 61;
  const failSuffix = totalFailed > 0 ? ` · ${totalFailed} failed` : "";
  const statsLine = `Mode: ${mode}  ${totalPassed}/${totalScenarios} passed (${pct(totalPassed, totalScenarios)}%)${failSuffix}`;

  const lines: string[] = [];
  lines.push("");
  lines.push(`┌${"─".repeat(BOX_WIDTH)}┐`);
  lines.push(`│  ${pad("Pipeline Test Report", BOX_WIDTH - 3)}│`);
  lines.push(`│  ${pad(statsLine, BOX_WIDTH - 3)}│`);
  lines.push(`└${"─".repeat(BOX_WIDTH)}┘`);
  lines.push("");

  const maxNameLen = Math.max(...categories.map((c) => c.category.length));

  for (const cat of categories) {
    const passed = cat.results.filter((r) => r.passed).length;
    const total = cat.results.length;
    const allPassed = passed === total;
    const icon = allPassed ? "✓" : "✗";
    const dots = ".".repeat(Math.max(2, maxNameLen + 8 - cat.category.length));
    const count = `${passed}/${total}`;
    const suffix = allPassed ? "" : `  (${total - passed} failed)`;
    lines.push(`  ${icon} ${cat.category} ${dots} ${count}${suffix}`);
  }

  const allFailures = categories.flatMap((c) =>
    c.results.filter((r) => !r.passed),
  );

  if (allFailures.length > 0) {
    lines.push("");
    lines.push(`  ─── Failures (${allFailures.length}) ───`);

    for (const f of allFailures) {
      lines.push("");
      lines.push(`  ✗ ${f.id}`);
      if (f.rawSTT !== undefined) {
        lines.push(`    Raw STT:    ${f.rawSTT}`);
      }
      lines.push(`    Expected:   ${f.expected}`);
      lines.push(`    Actual:     ${f.actual}`);
      lines.push(
        `    Similarity: ${(f.similarity * 100).toFixed(1)}% (min: ${(f.minSimilarity * 100).toFixed(1)}%)`,
      );
      for (const msg of f.failedAssertions) {
        lines.push(`    ✗ ${msg}`);
      }
    }
  }

  const reportPath = join(getResultsDir(), "report.html");
  lines.push("");
  lines.push(`  HTML report: ${reportPath}`);
  lines.push("");

  console.log(lines.join("\n"));
}

function generateMarkdownReport(categories: CategoryResult[]): string {
  const totalScenarios = categories.reduce((s, c) => s + c.results.length, 0);
  const totalPassed = categories.reduce(
    (s, c) => s + c.results.filter((r) => r.passed).length,
    0,
  );
  const totalFailed = totalScenarios - totalPassed;
  const mode = categories[0]?.mode ?? "unknown";
  const icon = totalFailed === 0 ? ":white_check_mark:" : ":x:";

  const lines: string[] = [];
  lines.push(`## ${icon} Pipeline Test Report`);
  lines.push("");
  lines.push(`**Mode:** ${mode} | **Result:** ${totalPassed}/${totalScenarios} passed (${pct(totalPassed, totalScenarios)}%)`);
  lines.push("");

  lines.push("| Category | Score | Status |");
  lines.push("|----------|-------|--------|");
  for (const cat of categories) {
    const passed = cat.results.filter((r) => r.passed).length;
    const total = cat.results.length;
    const allPassed = passed === total;
    const status = allPassed ? ":white_check_mark:" : `:x: ${total - passed} failed`;
    lines.push(`| ${cat.category} | ${passed}/${total} | ${status} |`);
  }

  const allFailures = categories.flatMap((cat) =>
    cat.results.filter((r) => !r.passed).map((r) => ({ ...r, category: cat.category })),
  );

  if (allFailures.length > 0) {
    lines.push("");
    lines.push("### Failures");
    for (const f of allFailures) {
      lines.push("");
      lines.push(`<details><summary><b>${f.id}</b> — ${f.category}</summary>`);
      lines.push("");
      if (f.rawSTT !== undefined) {
        lines.push(`**Raw STT:** ${f.rawSTT}`);
        lines.push("");
      }
      lines.push(`**Expected:** ${f.expected}`);
      lines.push("");
      lines.push(`**Actual:** ${f.actual}`);
      lines.push("");
      lines.push(`**Similarity:** ${(f.similarity * 100).toFixed(1)}% (min: ${(f.minSimilarity * 100).toFixed(1)}%)`);
      if (f.failedAssertions.length > 0) {
        lines.push("");
        for (const msg of f.failedAssertions) {
          lines.push(`- :x: ${msg}`);
        }
      }
      lines.push("");
      lines.push("</details>");
    }
  }

  lines.push("");
  return lines.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateHtmlReport(categories: CategoryResult[]): string {
  const totalScenarios = categories.reduce((s, c) => s + c.results.length, 0);
  const totalPassed = categories.reduce(
    (s, c) => s + c.results.filter((r) => r.passed).length,
    0,
  );
  const totalFailed = totalScenarios - totalPassed;
  const mode = categories[0]?.mode ?? "unknown";
  const timestamp = categories[0]?.timestamp ?? new Date().toISOString();

  const categoryRows = categories
    .map((cat) => {
      const passed = cat.results.filter((r) => r.passed).length;
      const total = cat.results.length;
      const allPassed = passed === total;
      const barPct = total > 0 ? (passed / total) * 100 : 100;
      return `
      <tr class="${allPassed ? "pass" : "fail"}">
        <td class="cat-name">${escapeHtml(cat.category)}</td>
        <td class="cat-count">${passed}/${total}</td>
        <td class="cat-bar">
          <div class="bar-bg">
            <div class="bar-fill ${allPassed ? "bar-pass" : "bar-fail"}" style="width:${barPct}%"></div>
          </div>
        </td>
        <td class="cat-status">${allPassed ? "✓" : `${total - passed} failed`}</td>
      </tr>`;
    })
    .join("\n");

  const failureCards = categories
    .flatMap((cat) =>
      cat.results
        .filter((r) => !r.passed)
        .map((r) => renderFailureCard(r, cat.category)),
    )
    .join("\n");

  const passDetails = categories
    .flatMap((cat) =>
      cat.results
        .filter((r) => r.passed)
        .map(
          (r) => `
      <tr>
        <td>${escapeHtml(r.id)}</td>
        <td>${(r.similarity * 100).toFixed(1)}%</td>
        <td>${(r.minSimilarity * 100).toFixed(1)}%</td>
      </tr>`,
        ),
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pipeline Test Report</title>
<style>
  :root {
    --bg: #ffffff; --fg: #1a1a2e; --muted: #6b7280;
    --card: #f8f9fa; --border: #e5e7eb;
    --pass: #059669; --pass-bg: #ecfdf5;
    --fail: #dc2626; --fail-bg: #fef2f2;
    --bar-bg: #e5e7eb; --bar-pass: #34d399; --bar-fail: #fca5a5;
    --mono: 'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f172a; --fg: #e2e8f0; --muted: #94a3b8;
      --card: #1e293b; --border: #334155;
      --pass: #34d399; --pass-bg: #064e3b;
      --fail: #f87171; --fail-bg: #450a0a;
      --bar-bg: #334155; --bar-pass: #059669; --bar-fail: #dc2626;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--sans); background: var(--bg); color: var(--fg); padding: 2rem; max-width: 960px; margin: 0 auto; }
  h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
  .meta { color: var(--muted); font-size: 0.875rem; margin-bottom: 1.5rem; display: flex; gap: 1.5rem; flex-wrap: wrap; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; text-align: center; }
  .stat-value { font-size: 1.75rem; font-weight: 700; }
  .stat-value.pass { color: var(--pass); }
  .stat-value.fail { color: var(--fail); }
  .stat-label { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
  h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
  th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .cat-name { font-weight: 500; }
  .cat-count { font-family: var(--mono); font-size: 0.875rem; white-space: nowrap; }
  .cat-bar { width: 40%; }
  .bar-bg { background: var(--bar-bg); border-radius: 4px; height: 8px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .bar-pass { background: var(--bar-pass); }
  .bar-fail { background: var(--bar-fail); }
  .cat-status { font-size: 0.875rem; white-space: nowrap; }
  tr.pass .cat-status { color: var(--pass); }
  tr.fail .cat-status { color: var(--fail); font-weight: 500; }
  .failure-card { background: var(--fail-bg); border: 1px solid var(--fail); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
  .failure-card h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--fail); }
  .failure-card .desc { color: var(--muted); font-size: 0.8rem; margin-bottom: 0.75rem; }
  .failure-detail { font-family: var(--mono); font-size: 0.8rem; line-height: 1.6; }
  .failure-detail dt { color: var(--muted); font-weight: 500; display: inline; }
  .failure-detail dd { display: inline; margin-left: 0; margin-bottom: 0.25rem; }
  .failure-detail .row { margin-bottom: 0.25rem; }
  .assertion-fail { color: var(--fail); margin-top: 0.25rem; font-size: 0.8rem; }
  details { margin-bottom: 2rem; }
  summary { cursor: pointer; font-weight: 600; font-size: 1.1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
  summary:hover { color: var(--pass); }
  .pass-table td { font-family: var(--mono); font-size: 0.8rem; }
</style>
</head>
<body>
  <h1>Pipeline Test Report</h1>
  <div class="meta">
    <span>Mode: <strong>${escapeHtml(mode)}</strong></span>
    <span>${escapeHtml(timestamp.replace("T", " ").slice(0, 19))} UTC</span>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-value">${totalScenarios}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card">
      <div class="stat-value pass">${totalPassed}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value${totalFailed > 0 ? " fail" : ""}">${totalFailed}</div>
      <div class="stat-label">Failed</div>
    </div>
  </div>

  <h2>Categories</h2>
  <table>
    <thead>
      <tr><th>Category</th><th>Score</th><th>Progress</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>

  ${
    failureCards
      ? `<h2>Failures</h2>\n${failureCards}`
      : '<p style="color:var(--pass);font-weight:600;">All scenarios passed!</p>'
  }

  ${
    passDetails
      ? `
  <details>
    <summary>Passed Scenarios (${totalPassed})</summary>
    <table class="pass-table">
      <thead><tr><th>Scenario</th><th>Similarity</th><th>Min Required</th></tr></thead>
      <tbody>${passDetails}</tbody>
    </table>
  </details>`
      : ""
  }
</body>
</html>`;
}

function renderFailureCard(r: ScenarioResult, category: string): string {
  const assertionHtml = r.failedAssertions
    .map((msg) => `<div class="assertion-fail">✗ ${escapeHtml(msg)}</div>`)
    .join("\n");

  return `
  <div class="failure-card">
    <h3>${escapeHtml(r.id)}</h3>
    <div class="desc">${escapeHtml(category)} · ${escapeHtml(r.description)}</div>
    <div class="failure-detail">
      ${r.rawSTT !== undefined ? `<div class="row"><dt>Raw STT: </dt><dd>${escapeHtml(r.rawSTT)}</dd></div>` : ""}
      <div class="row"><dt>Expected: </dt><dd>${escapeHtml(r.expected)}</dd></div>
      <div class="row"><dt>Actual: </dt><dd>${escapeHtml(r.actual)}</dd></div>
      <div class="row"><dt>Similarity: </dt><dd>${(r.similarity * 100).toFixed(1)}% (min: ${(r.minSimilarity * 100).toFixed(1)}%)</dd></div>
      ${assertionHtml}
    </div>
  </div>`;
}

export default class PipelineReporter {
  onInit(): void {
    cleanResultsDir();
  }

  onTestRunEnd(): void {
    const categories = readAllResults();
    if (categories.length === 0) return;

    printConsoleReport(categories);

    const resultsDir = getResultsDir();
    writeFileSync(join(resultsDir, "report.html"), generateHtmlReport(categories));
    writeFileSync(join(resultsDir, "report.md"), generateMarkdownReport(categories));
  }
}
