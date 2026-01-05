// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  '**/*.{js,ts}': ['prettier --write', 'eslint --fix'],
  '**/*.{json,md,yml,yaml}': ['prettier --write'],
}
