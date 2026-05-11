const ESM_PACKAGES = [
  'dmn-moddle',
  'feelin',
  'min-dash',
  'moddle',
  'moddle-xml',
  'saxen',
  'tiny-svg',
];
const ESM_NAMES = ESM_PACKAGES.join('|');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.[jt]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  transformIgnorePatterns: [
    // npm / yarn flat layout: skip everything under node_modules except our ESM deps and the pnpm store.
    `node_modules/(?!\\.pnpm/|${ESM_NAMES})`,
    // pnpm strict layout: skip pnpm-store entries that aren't one of our ESM deps.
    `\\.pnpm/(?!.*(?:${ESM_NAMES}))`,
  ],
  collectCoverageFrom: ['src/**/*.ts'],
};
