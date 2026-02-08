# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Vox, please report it responsibly.

**Do not open a public issue.** Instead, email **rodrigoluizscs@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

You should receive a response within 72 hours. We will work with you to understand and address the issue before any public disclosure.

## Scope

This policy applies to the Vox application code in this repository. Third-party dependencies are covered by their own security policies.

## Sensitive data handling

- API keys and credentials entered in Vox settings are encrypted at rest using the operating system keychain via Electron's `safeStorage` API
- Audio recordings are processed locally and never stored to disk
- Only transcribed text (not audio) is sent to the configured LLM provider when enhancement is enabled
