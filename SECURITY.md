# Security policy

We support the current `main` branch of this early-stage project.

For suspected security vulnerabilities, use GitHub's **Security → Report a vulnerability** private-reporting function if it has been enabled. If it isn't enabled, open a regular issue asking the maintainers to establish a private channel, **without exploit details**.

Do not post user data, confidential files, or credentials in public issues. Avoid testing against websites or accounts you do not own.

DataPrep Desk processes untrusted CSV and JSON. Particularly relevant security considerations include spreadsheet-formula injection in exports, malicious text content rendered in the browser, memory exhaustion and external links. The current app has no account backend and no authenticated API.
