import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import i18next from "eslint-plugin-i18next";

export default tseslint.config(
  { ignores: ["out/", "dist/", "build/", "resources/"] },

  eslint.configs.recommended,
  tseslint.configs.recommended,

  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    files: ["src/main/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["src/renderer/**/*.tsx"],
    plugins: { "react-hooks": reactHooks, i18next },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "i18next/no-literal-string": [
        "error",
        {
          markupOnly: true,
          ignoreAttribute: [
            "className",
            "style",
            "type",
            "id",
            "key",
            "href",
            "src",
            "alt",
            "htmlFor",
            "viewBox",
            "fill",
            "stroke",
            "strokeWidth",
            "strokeLinecap",
            "strokeLinejoin",
            "xmlns",
            "d",
            "cx",
            "cy",
            "r",
            "x",
            "x1",
            "x2",
            "y",
            "y1",
            "y2",
            "rx",
            "ry",
            "width",
            "height",
            "points",
            "draggable",
          ],
          words: {
            exclude: [
              "Vox",
              "\\d+",
              "Microsoft Foundry",
              "AWS Bedrock",
              "OpenAI",
              "DeepSeek",
              "LiteLLM",
            ],
          },
          onlyAttribute: [],
        },
      ],
    },
  },

  {
    files: ["src/renderer/**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
