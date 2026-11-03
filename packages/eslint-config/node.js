import { defineConfig } from 'eslint/config';
import globals from 'globals';
import { baseConfig } from './base.js';

/**
 * For Node.js services and tooling packages.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function nodeConfig({ tsconfigRootDir }) {
    return defineConfig([
        baseConfig({ tsconfigRootDir }),
        {
            languageOptions: {
                globals: globals.node,
            },
        },
    ]);
}
