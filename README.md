# dev-utilities

Internal developer utilities for the AECO platform. Each utility is self-contained in its own folder.

## Utilities

| Utility | Description | Type |
|---|---|---|
| [hubspot-sandbox-manager](./hubspot-sandbox-manager/) | Manage HubSpot sandbox companies and feature flags | Standalone HTML |

## Adding a new utility

1. Create a new folder: `your-utility-name/`
2. Add your files and a `README.md`
3. Add a row to the table above
4. Open a PR

## Guidelines

- Each utility must have its own `README.md`
- No secrets or API keys committed — use env vars or browser localStorage
- Utilities should be self-contained with minimal or zero dependencies