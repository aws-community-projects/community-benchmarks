import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/*.spec.ts'],
      include: ['constructs', 'src', 'stacks'],
    },
    setupFiles: 'vitest.setup.ts',
  },
});
