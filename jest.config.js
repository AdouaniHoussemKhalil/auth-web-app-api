/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  globalSetup: "<rootDir>/tests/helpers/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/helpers/globalTeardown.ts",
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts"],
  testTimeout: 30000,
};
