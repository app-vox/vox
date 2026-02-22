import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";

const RESULTS_DIR = join(process.cwd(), "tests", "pipeline", ".results");

export interface ScenarioResult {
  id: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  rawSTT?: string;
  similarity: number;
  minSimilarity: number;
  failedAssertions: string[];
}

export interface CategoryResult {
  category: string;
  mode: string;
  timestamp: string;
  results: ScenarioResult[];
}

export function getResultsDir(): string {
  return RESULTS_DIR;
}

export function cleanResultsDir(): void {
  rmSync(RESULTS_DIR, { recursive: true, force: true });
  mkdirSync(RESULTS_DIR, { recursive: true });
}

export function writeCategoryResult(result: CategoryResult): void {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const filePath = join(RESULTS_DIR, `${result.category}.json`);
  writeFileSync(filePath, JSON.stringify(result, null, 2));
}

export function readAllResults(): CategoryResult[] {
  try {
    const files = readdirSync(RESULTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();
    return files.map((f) => {
      const content = readFileSync(join(RESULTS_DIR, f), "utf-8");
      return JSON.parse(content) as CategoryResult;
    });
  } catch {
    return [];
  }
}
