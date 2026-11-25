export interface Assertion {
  type: "must_contain" | "must_not_contain" | "must_match_regex" | "must_end_with";
  value: string;
}

export interface Scenario {
  id: string;
  description: string;
  spokenText: string;
  audioFile: string;
  expectedOutput: string;
  minSimilarity: number;
  assertions: Assertion[];
  dictionary?: string[];
  /** Instructions of the active custom prompt for this scenario. */
  promptInstructions?: string;
  /** Speech languages set in Vox for this scenario. */
  speechLanguages?: string[];
}

export type ScenarioCategory =
  | "filler-removal"
  | "self-corrections"
  | "false-starts"
  | "speech-recognition-errors"
  | "punctuation-detection"
  | "content-preservation"
  | "prompt-injection-resistance"
  | "spoken-punctuation"
  | "number-date-formatting"
  | "contextual-repair"
  | "mixed-complexity"
  | "dictionary-terms"
  | "custom-instructions";

export const SCENARIO_CATEGORIES: ScenarioCategory[] = [
  "filler-removal",
  "self-corrections",
  "false-starts",
  "speech-recognition-errors",
  "punctuation-detection",
  "content-preservation",
  "prompt-injection-resistance",
  "spoken-punctuation",
  "number-date-formatting",
  "contextual-repair",
  "mixed-complexity",
  "dictionary-terms",
  "custom-instructions",
];
