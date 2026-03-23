const SUPPRESSED_WARNINGS = [
  'punycode',       // punycode deprecation from transitive dependencies
  'client.query()', // pg deprecation caused by TypeORM's internal query scheduling
];

process.on('warning', (warning) => {
  if (
    warning.name === 'DeprecationWarning' &&
    SUPPRESSED_WARNINGS.some((msg) => warning.message.includes(msg))
  ) {
    return;
  }
  console.warn(warning);
});
