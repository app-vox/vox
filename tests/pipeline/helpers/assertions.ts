import type { Assertion } from "../scenarios/types";

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  message: string;
}

export function runAssertions(output: string, assertions: Assertion[]): AssertionResult[] {
  return assertions.map((assertion) => {
    switch (assertion.type) {
      case "must_contain":
        return {
          assertion,
          passed: output.includes(assertion.value),
          message: output.includes(assertion.value)
            ? `Contains "${assertion.value}"`
            : `Missing "${assertion.value}" in output`,
        };
      case "must_not_contain":
        return {
          assertion,
          passed: !output.includes(assertion.value),
          message: !output.includes(assertion.value)
            ? `Does not contain "${assertion.value}"`
            : `Unexpectedly contains "${assertion.value}" in output`,
        };
      case "must_match_regex":
        return {
          assertion,
          passed: new RegExp(assertion.value).test(output),
          message: new RegExp(assertion.value).test(output)
            ? `Matches regex /${assertion.value}/`
            : `Does not match regex /${assertion.value}/`,
        };
      case "must_end_with":
        return {
          assertion,
          passed: output.endsWith(assertion.value),
          message: output.endsWith(assertion.value)
            ? `Ends with "${assertion.value}"`
            : `Does not end with "${assertion.value}", ends with "${output.slice(-20)}"`,
        };
    }
  });
}
