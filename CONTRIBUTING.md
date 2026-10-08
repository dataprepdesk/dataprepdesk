# Contributing

Thanks for helping improve DataPrep Desk. The project favours small, accessible, maintainable utilities that run in ordinary browsers.

## Development

```bash
npm ci
npm run dev
npm run check
```

Please open an issue first for major architectural changes.

## Pull requests

- Explain which user problem your change solves.
- Prefer built-in browser APIs and dependency-free algorithms.
- Add tests for parsers, validation and exports.
- Test in modern browsers, keyboard navigation and narrow screens.
- Do not introduce remote data uploads, analytics, API keys or tracking without documenting and reviewing the change.
- Avoid adding large frameworks to small browser-only utilities.
- Never include confidential datasets, passwords or tokens in tests or issues.

See [SECURITY.md](SECURITY.md) for security reporting. Code contributions are under [MIT](LICENSE).
