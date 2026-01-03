import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  testMatch: ['**/*.test.ts'],
  verbose: true,
};

export default config;
