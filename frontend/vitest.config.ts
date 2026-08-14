import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Monthly Report Repository test configuration.
 *
 * jsdom environment + React Testing Library for component tests; pure
 * hook/utility tests run in the same environment for consistency. The
 * tailwindcss Vite plugin is intentionally not loaded here — none of the
 * tests depend on Tailwind output.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
    clearMocks: true,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/modules/tasks/utils/monthlyReportNumeric.ts',
        'src/modules/tasks/hooks/useMonthlyReportMatrixEditor.ts',
        'src/modules/tasks/hooks/useAgingOfFundsEditor.ts',
        'src/modules/tasks/hooks/useMatrixKeyboardNavigation.ts',
        'src/modules/tasks/hooks/useHorizontalScrollAffordance.ts',
        'src/modules/tasks/components/monthly-report/agingOfFunds.types.ts',
        'src/modules/tasks/components/monthly-report/agingOfFundsColumns.ts',
        'src/modules/tasks/components/monthly-report/customerAttendanceColumns.ts',
        'src/modules/tasks/components/monthly-report/monthlyReportMatrixCell.ts',
        'src/modules/tasks/components/monthly-report/monthlyReportAnnualMatrix.config.ts',
        'src/modules/catalog/utils/attendanceClassification.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
