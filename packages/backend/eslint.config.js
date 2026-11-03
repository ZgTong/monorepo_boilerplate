import { defineConfig, globalIgnores } from 'eslint/config';
import { nodeConfig } from '@repo/eslint-config/node';

export default defineConfig([
    globalIgnores(['src/generated/**']),
    nodeConfig({ tsconfigRootDir: import.meta.dirname }),
]);
