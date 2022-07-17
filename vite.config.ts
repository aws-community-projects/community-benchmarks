import reactRefresh from '@vitejs/plugin-react-refresh';
import linaria from 'vite-plugin-linaria';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [linaria(), reactRefresh()],
  test: {
    coverage: {
      exclude: ['**/*.spec.ts'],
      include: ['constructs', 'src', 'stacks'],
    },
    setupFiles: 'vitest.setup.ts',
  },
});
