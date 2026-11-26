// studio-agents' own overrides on top of the shared config.
export default [
  // Deliberately broken sample files the log checker must flag.
  { ignores: ['tests/fixtures/**'] },
  // The text-safety tools and their tests match control and odd-whitespace characters on purpose.
  {
    files: ['plugins/stakeholder/tools/**', 'tools/agent-runner.mjs', 'tests/stakeholder*.test.mjs'],
    rules: { 'no-control-regex': 'off', 'no-irregular-whitespace': 'off' },
  },
];
