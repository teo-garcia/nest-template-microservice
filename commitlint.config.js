export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Code style changes (formatting, etc)
        "refactor", // Code refactoring
        "perf", // Performance improvements
        "test", // Adding or modifying tests
        "build", // Build system or external dependencies
        "ci", // CI/CD configuration
        "chore", // Other changes
        "revert", // Revert previous commits
      ],
    ],
    "type-case": [2, "always", "lowerCase"],
    "type-empty": [2, "never"],
    "subject-case": [2, "always", ["sentence-case", "lower-case"]],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
  },
};
