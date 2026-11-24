import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React Testing Library only unmounts automatically when test globals are enabled.
// We import describe/it/expect explicitly instead, so clean up by hand.
afterEach(() => {
    cleanup();
});
