import { createDefaultEsmPreset } from 'ts-jest';

/** @type {import('jest').Config} */
export default {
  ...createDefaultEsmPreset(),
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
};
