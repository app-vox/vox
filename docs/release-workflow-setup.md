# Release Workflow Setup

Manual GitHub Actions workflow that builds, signs, notarizes, and publishes Vox as a GitHub Release with DMG and zip artifacts.

## Prerequisites

- Apple Developer Program membership (paid)
- Developer ID Application certificate in your local Keychain
- Access to [App Store Connect](https://appstoreconnect.apple.com)

## 1. Export your Developer ID certificate as .p12

Open **Keychain Access** on your Mac:

1. In the sidebar, select the **login** keychain
2. Click the **My Certificates** category
3. Find your **"Developer ID Application: Your Name (TEAM_ID)"** certificate
4. Right-click it > **Export...**
5. Choose format **Personal Information Exchange (.p12)**
6. Set a strong password (you'll need it for the GitHub secret)
7. Save the file (e.g., `certificate.p12`)

Base64-encode it:

```bash
base64 -i certificate.p12 | pbcopy
```

The encoded value is now in your clipboard — this is `CERTIFICATE_P12_BASE64`.

## 2. Create an App Store Connect API key

1. Go to [App Store Connect > Users and Access > Integrations > App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. Click **"+"** to generate a new key
3. Name: **"Vox CI Notarization"** (or similar)
4. Role: **Developer** (minimum required for notarization)
5. Download the `.p8` file — **you can only download it once**
6. Note the **Key ID** (shown in the table) and the **Issuer ID** (shown at the top of the page)

Base64-encode the .p8 file:

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
```

## 3. Export your Provisioning Profile

The app requires a Mac App Store / Developer ID provisioning profile for signing. Since the profile is not stored in the repository, it must be provided as a GitHub secret.

1. Locate your provisioning profile (e.g., `Vox_Profile.provisionprofile`)
2. Base64-encode it:

```bash
base64 -i Vox_Profile.provisionprofile | pbcopy
```

The encoded value is now in your clipboard — this is `PROVISIONING_PROFILE_BASE64`.

## 4. Add secrets to GitHub

Go to your repo > **Settings > Secrets and variables > Actions** and add:

| Secret name              | Value                                          |
| ------------------------ | ---------------------------------------------- |
| `CERTIFICATE_P12_BASE64` | Base64-encoded .p12 certificate from step 1   |
| `CERTIFICATE_PASSWORD`   | Password set when exporting the .p12           |
| `APPLE_API_KEY_ID`       | Key ID from step 2 (e.g., `ABC123DEFG`)       |
| `APPLE_API_ISSUER_ID`    | Issuer ID from step 2 (UUID format)            |
| `APPLE_API_KEY_BASE64`   | Base64-encoded .p8 API key file from step 2    |
| `PROVISIONING_PROFILE_BASE64` | Base64-encoded provisioning profile from step 3 |

## Running the workflow

1. Go to **Actions > Release** in your GitHub repo
2. Click **"Run workflow"**
3. Optionally enter a version tag (e.g., `v1.0.0`) — leave blank to use `package.json` version
4. Toggle **"Dry run"** to test the build without creating a GitHub Release
5. Click **"Run workflow"**

The workflow will:

- Build the Electron app with `electron-vite build`
- Sign with your Developer ID certificate
- Notarize with Apple via the App Store Connect API key
- Package as DMG and zip
- Create a GitHub Release with both artifacts attached and auto-generated release notes

## Local development

Local builds (`npm run dist` / `make release`) continue to work as before using your keychain profile `vox-notarize`. In CI, electron-builder handles notarization natively via the `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER` env vars, and the `afterSign` hook (`build/notarize.cjs`) skips automatically.
