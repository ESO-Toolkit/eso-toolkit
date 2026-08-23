# Security Policy

## Supported Versions

We apply security fixes to the latest version of the application. Older versions are not actively patched.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Join the [ESO Toolkit Discord](https://discord.gg/mMjwcQYFdc) and privately contact a project maintainer.
Do not include vulnerability details in a public channel, GitHub issue, or Discussion. GitHub private
vulnerability reporting is not currently enabled for this repository.

### What to include

- A description of the vulnerability
- Steps to reproduce or a proof-of-concept
- The potential impact
- Any suggested mitigations (optional)

### What to expect

- **Acknowledgement** within 48 hours.
- **Status update** within 7 days with an assessment and expected timeline.
- **Credit** in the release notes if you'd like (optional).

We ask that you give us reasonable time to address the issue before any public disclosure.

## Scope

The project includes a browser application, Cloudflare Worker APIs, a Discord bot, CI/CD workflows,
and game-data tooling. Areas of particular interest include:

- Authentication / OAuth handling
- Cross-site scripting (XSS) via log data parsing
- Authorization, data exposure, and abuse controls in the roster/build APIs
- Discord interaction verification and bot permissions
- CI/CD, dependency, and deployment-supply-chain weaknesses
- Dependency vulnerabilities (though these should be reported to the upstream package maintainers first)

## Out of Scope

- Issues in ESO Logs' own API (report those to ESO Logs directly)
- Bugs that are not security-relevant (open a regular issue instead)
