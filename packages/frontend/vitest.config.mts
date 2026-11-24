import { defineConfig } from 'vitest/config';

// Component tests (ADR 0013): React Testing Library in jsdom.
// .mts because this package is CommonJS (no "type": "module"); Vite's upcoming native
// config loader would otherwise load ESM syntax in a .ts file as CommonJS.
// No @vitejs/plugin-react: Vite 8 transforms JSX with Oxc using tsconfig's `jsx: react-jsx`,
// and the plugin's main feature (Fast Refresh) is irrelevant to tests.
export default defineConfig({
    resolve: {
        // Same @components/*, @utils/*, ... aliases as Next.js, read from tsconfig.json.
        tsconfigPaths: true,
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
        setupFiles: ['./vitest.setup.ts'],
    },
});
