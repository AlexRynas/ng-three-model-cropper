import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "angular-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint.config(
    {
        files: ["**/*.ts"],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
            ...angular.configs.tsRecommended,
            eslintPluginPrettier,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            "@angular-eslint/directive-selector": [
                "error",
                {
                    type: "attribute",
                    prefix: ["app", "ntmc"],
                    style: "camelCase",
                },
            ],
            "@angular-eslint/component-selector": [
                "error",
                {
                    type: "element",
                    prefix: ["app", "ntmc"],
                    style: "kebab-case",
                },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "prettier/prettier": "error",
        },
    },
    {
        files: ["**/*.html"],
        extends: [
            ...angular.configs.templateRecommended,
            ...angular.configs.templateAccessibility,
        ],
        rules: {
            "@angular-eslint/template/click-events-have-key-events": "off",
            "@angular-eslint/template/interactive-supports-focus": "off",
        },
    },
    {
        ignores: [
            "node_modules/",
            "dist/",
            ".angular/",
            "coverage/",
            "*.config.js",
            "*.config.mjs",
        ],
    }
);
