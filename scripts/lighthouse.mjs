import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import { profiles, pages, common } from "./lighthouse.config.mjs";
const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4173",
  directory = "reports/lighthouse";
await mkdir(directory, { recursive: true });
const measurements = [];
for (const [page, path] of Object.entries(pages))
  for (const [profile, settings] of Object.entries(profiles))
    for (let run = 1; run <= 3; run++) {
      const chrome = await launch({
        chromePath: process.env.CHROME_PATH || chromium.executablePath(),
        chromeFlags: [
          "--headless",
          "--disable-gpu",
          "--no-first-run",
          // Ubuntu hosted runners restrict user namespaces. Only the ephemeral
          // CI browser auditing our loopback preview needs this launch option.
          ...(process.env.CI && process.platform === "linux"
            ? ["--no-sandbox"]
            : []),
        ],
      });
      try {
        const result = await lighthouse(new URL(path, base).href, {
          ...common,
          ...settings,
          port: chrome.port,
        });
        if (!result || result.lhr.runtimeError)
          throw new Error(
            result?.lhr.runtimeError?.message || "Lighthouse sem resultado",
          );
        const stem = `${page}-${profile}-${run}`;
        await writeFile(`${directory}/${stem}.html`, result.report[0]);
        await writeFile(`${directory}/${stem}.json`, result.report[1]);
        const row = {
          page,
          profile,
          run,
          ...Object.fromEntries(
            Object.entries(result.lhr.categories).map(([key, value]) => [
              key,
              Math.round(value.score * 100),
            ]),
          ),
          LCP: result.lhr.audits["largest-contentful-paint"].numericValue,
          CLS: result.lhr.audits["cumulative-layout-shift"].numericValue,
          TBT: result.lhr.audits["total-blocking-time"].numericValue,
        };
        measurements.push(row);
        console.log(JSON.stringify(row));
        await writeFile(
          `${directory}/measurements.json`,
          JSON.stringify(measurements, null, 2),
        );
      } finally {
        await chrome.kill();
      }
    }
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const medians = [];
for (const page of Object.keys(pages))
  for (const profile of Object.keys(profiles)) {
    const rows = measurements.filter(
      (r) => r.page === page && r.profile === profile,
    );
    medians.push({
      page,
      profile,
      ...Object.fromEntries(
        [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
          "LCP",
          "CLS",
          "TBT",
        ].map((key) => [key, median(rows.map((r) => r[key]))]),
      ),
    });
  }
await writeFile(
  `${directory}/summary.json`,
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus()[0]?.model,
        lighthouse: "13.6.0",
        base,
      },
      medians,
    },
    null,
    2,
  ),
);
console.table(medians);
