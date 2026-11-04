import { inject } from 'vitest';

// Runs in each worker before every integration test file is imported. src/db.ts reads
// DATABASE_URL when it is first imported, so it has to be set here, not inside a test.
process.env['DATABASE_URL'] = inject('databaseUrl');
