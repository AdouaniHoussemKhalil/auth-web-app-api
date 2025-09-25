module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "prettier"],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:prettier/recommended", // Use 'plugin:prettier/recommended' instead of 'prettier'
    ],
    rules: {
      "prettier/prettier": "error", // Enable ESLint to show Prettier errors as ESLint errors
      "@typescript-eslint/no-explicit-any": "off", // Disable the rule disallowing `any` type
    },
  };
  