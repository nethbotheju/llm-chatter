# Code Signing Guide

## macOS

### Requirements
- Apple Developer account ($99/year)
- App-Specific Password

### Setup

1. Enroll in the Apple Developer Program at [developer.apple.com](https://developer.apple.com/).

2. Generate an App-Specific Password:
   - Go to [appleid.apple.com](https://appleid.apple.com/)
   - Sign in → App-Specific Passwords → Generate

3. Add GitHub Secrets:
   | Secret | Value |
   |---|---|
   | `APPLE_ID` | Your Apple ID email |
   | `APPLE_ID_PASSWORD` | The app-specific password |
   | `APPLE_TEAM_ID` | Your 10-character Team ID (found in Membership details) |

### Local build
The notarization script (`apps/desktop/scripts/notarize.mjs`) reads these from environment variables. Either export them or put them in a `.env` file (already gitignored).

```bash
APPLE_ID=you@example.com APPLE_ID_PASSWORD=xxxx-xxxx-xxxx-xxxx APPLE_TEAM_ID=XXXXXXXXXX pnpm desktop:build:mac
```

## Windows

### Requirements
- A code-signing certificate (`.pfx` / `.p12`)

### Obtaining a certificate
- **Paid:** DigiCert, Sectigo, Certum (~$70–200/year)
- **Free for open-source:** [SignPath.io](https://signpath.io/) — apply with your public repo

### Setup

1. Base64-encode your `.pfx` file:
   ```bash
   base64 -i certificate.pfx -o certificate.base64
   ```

2. Add GitHub Secrets:
   | Secret | Value |
   |---|---|
   | `WINDOWS_CERT_BASE64` | Contents of `certificate.base64` |
   | `WINDOWS_CERT_PASSWORD` | Certificate password |

### Local build
Set the environment variables before building:

```bash
CSC_LINK=/path/to/certificate.pfx CSC_KEY_PASSWORD=your-password pnpm desktop:build:win
```

### Without a certificate (development)
The build will succeed but Windows will show a SmartScreen warning. Users can click "More info" → "Run anyway".

## Linux

Linux builds do not require code signing. AppImages, .deb, and .rpm files work unsigned.
