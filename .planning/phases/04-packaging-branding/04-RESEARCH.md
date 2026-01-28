# Phase 4: Packaging & Branding - Research

**Researched:** 2026-01-27
**Domain:** Electron application packaging, code signing, and distribution
**Confidence:** HIGH

## Summary

This phase covers packaging Ancestree as a distributable desktop application with proper branding and code signing. The project already has electron-builder 26.4.0 installed as a dev dependency. The standard workflow is: create icons in all required formats (icns/ico/png), configure electron-builder.yml with platform-specific settings, set up code signing certificates, and integrate notarization for macOS.

The key complexity lies in code signing. macOS requires both signing AND notarization (mandatory since Catalina) using Apple Developer certificates. Windows requires OV/EV certificates, with recent changes making traditional PFX signing less effective - cloud-based signing (Azure Trusted Signing, DigiCert KeyLocker) is now the recommended approach. Linux does not require code signing.

**Primary recommendation:** Use electron-builder.yml configuration with platform-specific targets (dmg for macOS, nsis for Windows, AppImage/deb for Linux), electron-icon-builder for icon generation, and @electron/notarize for macOS notarization via afterSign hook.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron-builder | ^26.4.0 | Build installers for all platforms | Already installed; standard Electron packaging tool |
| @electron/notarize | latest | macOS notarization | Official Electron package for Apple notarization |
| electron-icon-builder | ^2.0.1 | Generate icons from source PNG | Creates all required icon formats from single 1024x1024 PNG |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-builder-notarize | latest | Simplified notarization | Alternative to custom afterSign hook |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-builder | Electron Forge | electron-builder has better NSIS support, already in project |
| electron-icon-builder | electron-icon-maker | electron-icon-builder uses Sharp (faster, no PhantomJS) |
| Custom afterSign | electron-builder-notarize | Custom gives more control, but package is simpler |

**Installation:**
```bash
npm install -D @electron/notarize electron-icon-builder
```

## Architecture Patterns

### Recommended Project Structure
```
ancestree/
├── build/                      # Build resources for electron-builder
│   ├── icon.icns               # macOS application icon
│   ├── icon.ico                # Windows application icon
│   ├── icon.png                # Linux/fallback icon (512x512+)
│   ├── icons/                  # Linux icon sizes (generated)
│   │   ├── 16x16.png
│   │   ├── 32x32.png
│   │   ├── 48x48.png
│   │   ├── 64x64.png
│   │   ├── 128x128.png
│   │   ├── 256x256.png
│   │   └── 512x512.png
│   ├── background.png          # DMG background (540x380)
│   ├── entitlements.mac.plist  # macOS entitlements
│   └── installer.nsh           # Optional NSIS customization
├── electron-builder.yml        # electron-builder configuration
├── scripts/
│   └── notarize.js             # macOS notarization script
└── out/                        # electron-vite build output
    ├── main/
    ├── preload/
    └── renderer/
```

### Pattern 1: electron-builder.yml Configuration
**What:** YAML configuration file for electron-builder
**When to use:** Always - this is the standard configuration approach
**Example:**
```yaml
# Source: https://electron-vite.org/guide/distribution
appId: com.ancestree.app
productName: Ancestree
directories:
  buildResources: build
  output: dist

files:
  - out/**/*
  - "!**/*.ts"
  - "!**/node_modules/**/*.{md,txt}"

asar: true
asarUnpack:
  - resources/**

mac:
  category: public.app-category.lifestyle
  icon: build/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  target:
    - dmg
    - zip

win:
  icon: build/icon.ico
  target:
    - nsis

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: false

linux:
  icon: build/icons
  category: Utility
  target:
    - AppImage
    - deb

deb:
  depends:
    - libgtk-3-0
    - libnotify4
    - libnss3
    - libxss1
    - libxtst6
    - xdg-utils
    - libatspi2.0-0
    - libuuid1
    - libsecret-1-0
```

### Pattern 2: macOS Entitlements
**What:** Plist file declaring app capabilities for hardened runtime
**When to use:** Required for macOS notarization
**Example:**
```xml
<!-- Source: https://www.electron.build/code-signing-mac.html -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
</dict>
</plist>
```

### Pattern 3: Notarization Script (afterSign hook)
**What:** JavaScript script that runs after signing to notarize macOS apps
**When to use:** For macOS distribution outside App Store
**Example:**
```javascript
// Source: https://github.com/electron/notarize
// scripts/notarize.js
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log('Notarization complete');
};
```

### Anti-Patterns to Avoid
- **Disabling ASAR:** Never set `asar: false`. Use `asarUnpack` for files that need external access
- **Signing DMG:** Don't sign DMG files - leave unsigned and let Gatekeeper detect the signed .app inside
- **Hardcoding credentials:** Never put Apple ID passwords or certificates in source code
- **Building macOS on non-macOS:** macOS apps must be built on macOS for proper code signing

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon generation | Manual resize scripts | electron-icon-builder | Handles all sizes, formats, proper encoding |
| Windows installer | Custom NSIS script | electron-builder NSIS defaults | Well-tested, handles UAC, shortcuts, uninstaller |
| macOS notarization | Manual xcrun calls | @electron/notarize | Handles polling, retries, error messages |
| Cross-platform builds | Bash scripts | electron-builder matrix | Handles path differences, dependencies |
| DMG appearance | Manual hdiutil | electron-builder dmg config | Background, icon positions, licensing |

**Key insight:** Electron packaging has many platform-specific edge cases (code signing on Windows changed significantly in 2023-2024). electron-builder abstracts these away and stays current.

## Common Pitfalls

### Pitfall 1: Missing Hardened Runtime
**What goes wrong:** macOS app fails notarization with "The signature does not include a secure timestamp"
**Why it happens:** Hardened runtime not enabled in electron-builder config
**How to avoid:** Set `mac.hardenedRuntime: true` and provide entitlements file
**Warning signs:** Notarization fails immediately after upload

### Pitfall 2: Windows SmartScreen Warning
**What goes wrong:** Windows shows "Windows protected your PC" warning on first install
**Why it happens:** No code signing certificate, or using OV (not EV) certificate without reputation
**How to avoid:** For development, accept the warning. For production, use Azure Trusted Signing or EV certificate
**Warning signs:** All test users see the warning

### Pitfall 3: Icon Not Showing
**What goes wrong:** App shows default Electron icon instead of custom icon
**Why it happens:** Icon file wrong format, wrong size, wrong location, or improperly generated
**How to avoid:** Use electron-icon-builder from 1024x1024 PNG; verify icon.ico was created by proper tool (not renamed PNG)
**Warning signs:** Icon works on one platform but not another

### Pitfall 4: ASAR Unpack Issues
**What goes wrong:** App crashes when accessing native modules or external files
**Why it happens:** Binary files packed into ASAR cannot be executed
**How to avoid:** Use `asarUnpack` for any binaries, native modules, or files accessed by path
**Warning signs:** "ENOENT" errors for files that exist in development

### Pitfall 5: macOS Notarization Environment Variables
**What goes wrong:** Notarization fails with authentication errors in CI
**Why it happens:** Missing or misconfigured Apple credentials
**How to avoid:** Set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD (not Apple ID password!), APPLE_TEAM_ID
**Warning signs:** "Unable to authenticate" or "Invalid credentials" errors

### Pitfall 6: electron-vite Output Directory Mismatch
**What goes wrong:** electron-builder packages empty or incomplete app
**Why it happens:** electron-builder `files` config doesn't match electron-vite output directory
**How to avoid:** Verify `files` in electron-builder.yml includes `out/**/*` to match electron-vite default output
**Warning signs:** Built app launches but shows blank window or errors

## Code Examples

Verified patterns from official sources:

### Icon Generation Script
```json
// package.json scripts
// Source: https://www.npmjs.com/package/electron-icon-builder
{
  "scripts": {
    "icons": "electron-icon-builder --input=./assets/icon-source.png --output=./build"
  }
}
```

### Build Scripts for All Platforms
```json
// package.json scripts
// Source: https://electron-vite.org/guide/distribution
{
  "scripts": {
    "build:electron": "electron-vite build",
    "pack:win": "npm run build:electron && electron-builder --win --config",
    "pack:mac": "npm run build:electron && electron-builder --mac --config",
    "pack:linux": "npm run build:electron && electron-builder --linux --config"
  }
}
```

### Environment Variables for Code Signing
```bash
# macOS (App-specific password, not Apple ID password!)
# Source: https://www.electron.build/code-signing-mac.html
export APPLE_ID="developer@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# Windows (traditional certificate - if using)
# Source: https://www.electron.build/code-signing-win.html
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"

# Windows Azure Trusted Signing (modern approach)
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
```

### afterSign Configuration in electron-builder.yml
```yaml
# Source: https://www.electron.build/code-signing-mac.html
afterSign: scripts/notarize.js
mac:
  hardenedRuntime: true
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PFX-based Windows signing | Azure Trusted Signing / cloud HSM | 2024 | Traditional OV certs no longer prevent SmartScreen |
| Manual notarization | electron-builder built-in notarize | 2023+ | Set `notarize: true` + env vars |
| .icns file required | .icon file preferred | Xcode 26+ | Asset catalog compilation, better Retina support |
| Signed DMG | Unsigned DMG | electron-builder 20.43.0 | Gatekeeper works better with unsigned DMG containing signed app |

**Deprecated/outdated:**
- **electron-osx-sign standalone:** Now integrated into @electron/osx-sign, used internally by electron-builder
- **Traditional Windows OV certificates:** Still work but no longer prevent SmartScreen warning
- **DMG signing:** No longer recommended; causes issues with notarization

## Open Questions

Things that couldn't be fully resolved:

1. **Apple Developer Account Setup**
   - What we know: Requires $99/year Apple Developer Program membership, need to create Developer ID Application certificate
   - What's unclear: Exact steps may vary based on account type (individual vs organization)
   - Recommendation: Follow Apple's official guide when setting up; this is a one-time manual process

2. **Windows Code Signing Certificate Selection**
   - What we know: Azure Trusted Signing is Microsoft's recommended approach; DigiCert KeyLocker works for EV
   - What's unclear: Pricing and setup complexity for small projects
   - Recommendation: For initial release, accept SmartScreen warning; add signing when user base grows

3. **CI/CD Secrets Management**
   - What we know: GitHub Actions supports encrypted secrets; can base64-encode certificates
   - What's unclear: Best practice for managing Apple app-specific passwords rotation
   - Recommendation: Use GitHub Actions secrets; document rotation procedure

## Sources

### Primary (HIGH confidence)
- [electron-builder icons documentation](https://www.electron.build/icons.html) - Icon formats and configuration
- [electron-builder macOS code signing](https://www.electron.build/code-signing-mac.html) - Certificate requirements, notarization
- [electron-builder Windows code signing](https://www.electron.build/code-signing-win.html) - Certificate types, Azure Trusted Signing
- [electron-builder NSIS documentation](https://www.electron.build/nsis.html) - Windows installer options
- [electron-builder DMG documentation](https://www.electron.build/dmg.html) - macOS disk image options
- [electron-builder Linux documentation](https://www.electron.build/linux.html) - AppImage, deb configuration
- [electron-vite distribution guide](https://electron-vite.org/guide/distribution) - electron-builder.yml integration
- [@electron/notarize GitHub](https://github.com/electron/notarize) - Notarization API

### Secondary (MEDIUM confidence)
- [Electron official code signing tutorial](https://www.electronjs.org/docs/latest/tutorial/code-signing) - General guidance
- [electron-icon-builder npm](https://www.npmjs.com/package/electron-icon-builder) - Icon generation tool

### Tertiary (LOW confidence)
- Community GitHub gists for complete signing workflows - patterns may need adaptation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - electron-builder is the established standard, documentation is comprehensive
- Architecture: HIGH - electron-vite guide provides clear patterns, electron-builder docs are authoritative
- Pitfalls: HIGH - documented extensively in official docs and issue trackers
- Code signing process: MEDIUM - requires platform-specific accounts that couldn't be tested

**Research date:** 2026-01-27
**Valid until:** 60 days (electron-builder is stable; code signing requirements change slowly)
