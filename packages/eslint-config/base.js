import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Rules shared by every TypeScript package: strict, type-aware typescript-eslint rules.
 * Formatting is left to Prettier, so eslint-config-prettier always comes last.
 *
 * @param {{ tsconfigRootDir: string }} options
 *   Directory of the consuming package's tsconfig.json. Pass `import.meta.dirname`.
 */
export function baseConfig({ tsconfigRootDir }) {
    return defineConfig([
        globalIgnores(['**/dist/**', '**/coverage/**']),
        js.configs.recommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
        {
            languageOptions: {
                parserOptions: {
                    projectService: true,
                    tsconfigRootDir,
                },
            },
            linterOptions: {
                reportUnusedDisableDirectives: 'error',
            },
            rules: {
                '@typescript-eslint/consistent-type-imports': 'error',
                '@typescript-eslint/no-import-type-side-effects': 'error',
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    {
                        argsIgnorePattern: '^_',
                        varsIgnorePattern: '^_',
                        caughtErrorsIgnorePattern: '^_',
                        destructuredArrayIgnorePattern: '^_',
                    },
                ],
                // Numbers stringify predictably, so allow them. Rule options replace the preset's
                // options rather than merging with them, so every other allow* flag must stay
                // explicitly false or it falls back to the rule's permissive defaults.
                '@typescript-eslint/restrict-template-expressions': [
                    'error',
                    {
                        allowNumber: true,
                        allowAny: false,
                        allowBoolean: false,
                        allowNever: false,
                        allowNullish: false,
                        allowRegExp: false,
                    },
                ],
            },
        },
        {
            // Config files and other plain JS are not part of any tsconfig.
            files: ['**/*.{js,mjs,cjs}'],
            extends: [tseslint.configs.disableTypeChecked],
        },
        prettier,
    ]);
}
