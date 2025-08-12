# GitHub Actions Setup for Cross-Platform Builds

This project uses GitHub Actions to automatically build the Daily Planner app for Windows, macOS, and Linux.

## Workflows

### 1. **Release Workflow** (`.github/workflows/release.yml`)
- **Triggers on**: Git tags starting with `v` (e.g., `v1.0.0`)
- **Creates**: Draft releases with built executables for all platforms
- **Platforms**: 
  - Windows (.msi, .exe)
  - macOS Intel (.dmg)
  - macOS Apple Silicon (.dmg)
  - Linux (.deb, .AppImage)

### 2. **Test Build Workflow** (`.github/workflows/test-build.yml`)
- **Triggers on**: Every push to `main` and pull requests
- **Purpose**: Verify the app builds successfully on all platforms
- **Uploads**: Build artifacts as workflow artifacts (not releases)

## How to Create a Release

### ⚠️ IMPORTANT: Update versions BEFORE creating tags!
The version numbers in your config files MUST be updated before pushing a tag, otherwise the installers will have incorrect version numbers.

1. **Update version numbers in ALL THREE places**:
   ```bash
   # Manual update (recommended for clarity):
   # Edit these files and change version to match your release (e.g., "0.1.4"):
   # - package.json (line ~4: "version": "0.1.4")
   # - src-tauri/tauri.conf.json (line ~4: "version": "0.1.4")
   # - src-tauri/Cargo.toml (line ~3: version = "0.1.4")
   
   # OR use automated scripts:
   # For bug fixes (0.1.0 -> 0.1.1)
   npm run version:patch
   
   # For new features (0.1.0 -> 0.2.0)
   npm run version:minor
   
   # For breaking changes (0.1.0 -> 1.0.0)
   npm run version:major
   ```
   
   Note: For automated scripts, you'll need to install `cargo-edit` first:
   ```bash
   cargo install cargo-edit
   ```

2. **Commit and push the version changes**:
   ```bash
   git add .
   git commit -m "chore: bump version to v0.2.0"
   git push
   ```

3. **ONLY NOW create and push a tag**:
   ```bash
   git tag v0.2.0 -m "Release description"
   git push origin v0.2.0
   ```
   
   **If you need to update a tag** (e.g., forgot to update versions):
   ```bash
   # First, update the version numbers in all config files
   # Then commit and push those changes
   git add . && git commit -m "chore: bump version to v0.2.0" && git push
   
   # Now delete and recreate the tag
   git tag -d v0.2.0                    # Delete local tag
   git push origin :refs/tags/v0.2.0    # Delete remote tag
   git tag v0.2.0 -m "Updated release"  # Recreate tag
   git push origin v0.2.0                # Push new tag
   ```

4. **GitHub Actions will automatically**:
   - Build the app for all platforms with the correct version
   - Create a draft release named "Daily Planner vX.X.X"
   - Upload all executables to the draft release

5. **Publish the release**:
   - Go to [GitHub Releases](https://github.com/mobiuspoker/daily-planner/releases)
   - Find the draft release (marked as "Draft")
   - Click "Edit" → Review the assets have correct version numbers
   - Add release notes
   - Click "Publish release"

## Manual Trigger

You can also manually trigger the release workflow:
1. Go to Actions tab in GitHub
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter a tag name (must start with 'v')

## Platform-Specific Builds

The workflow builds:
- **Windows**: 
  - `.msi` installer (recommended)
  - `.exe` installer (NSIS)
- **macOS**:
  - `.dmg` for Intel Macs (x86_64)
  - `.dmg` for Apple Silicon (M1/M2/M3)
- **Linux**:
  - `.deb` for Debian/Ubuntu
  - `.AppImage` for universal Linux

## Troubleshooting

### Version Mismatch in Installers
If your installers show the wrong version (e.g., v0.1.0 when you released v0.1.4):
1. You forgot to update version numbers before creating the tag
2. **Fix**: 
   - Update all three version files (package.json, tauri.conf.json, Cargo.toml)
   - Commit and push the changes
   - Delete and recreate the tag (see step 3 above)
   - Wait for GitHub Actions to rebuild (~10 minutes)
   - The new draft release will have correct versions

### Multiple Draft Releases
If you see multiple draft releases for the same version:
- GitHub Actions creates a new draft each time the workflow runs
- Simply delete the old drafts and keep the newest one
- Check asset filenames to ensure they have the correct version

### If builds fail:
1. Check the Actions tab for error logs
2. Common issues:
   - **macOS**: May need to update signing certificates (optional)
   - **Linux**: Missing system dependencies (automatically installed)
   - **Windows**: Usually works without issues

### macOS "Damaged App" or "Cannot Check for Malicious Software" Errors

These are normal for unsigned apps. Users need to:

1. **Right-click method** (Recommended):
   - Right-click the app in Applications
   - Select "Open" from the menu
   - Click "Open" in the security dialog
   - This only needs to be done once

2. **System Settings method**:
   - Try to open the app normally (it will be blocked)
   - Go to System Settings → Privacy & Security
   - Click "Open Anyway" next to the app name
   - Enter password and click "Open"

### Important Notes for macOS Distribution

- **Which installer to send**:
  - Apple Silicon (M1/M2/M3/M4 Macs): Use `aarch64-apple-darwin.dmg`
  - Intel Macs (2019 and earlier): Use `x86_64-apple-darwin.dmg`
  - Users can check: Apple Menu → About This Mac → look for "Chip" or "Processor"

- **Installation steps for macOS**:
  1. Download the .dmg file
  2. Open the .dmg
  3. **Drag the app to Applications folder** (important!)
  4. Eject the .dmg
  5. Open Applications folder
  6. Right-click the app and select "Open"

- **Apps won't appear in Launchpad**: This is normal for unsigned apps. Use Spotlight (Cmd+Space) instead.

### Code Signing (Optional but Recommended for Distribution)
For production releases without security warnings:
- **macOS**: $99/year Apple Developer Program for signing + notarization
- **Windows**: Code signing certificate from a CA
- See [Tauri's signing guide](https://tauri.app/v1/guides/distribution/sign/)

### Working with Private Repos

- Private repos have private releases (404 error for non-authenticated users)
- To share builds from private repos:
  1. Download installers: `gh release download v0.1.0 --pattern "*.dmg"`
  2. Share via Dropbox/Google Drive (ZIP first to preserve permissions)
  3. Or make repo public: `gh repo edit owner/repo --visibility public --accept-visibility-change-consequences`

## Testing Locally

Before pushing to GitHub, test the build locally:
```bash
# Windows
npm run tauri:build

# macOS
npm run tauri:build -- --target x86_64-apple-darwin
npm run tauri:build -- --target aarch64-apple-darwin

# Linux
npm run tauri:build
```

### Quick Commands Reference

```bash
# View releases
gh release list
gh release view v0.1.0 --web

# Download release assets
gh release download v0.1.0 --pattern "*.dmg"

# Watch build progress
gh run list --workflow=release.yml
gh run watch

# Check build status
gh run list --limit 1
```

## Cost

GitHub Actions provides:
- **Free**: 2,000 minutes/month for private repos
- **Free**: Unlimited for public repos
- Each platform build takes ~5-10 minutes

## Next Steps

1. Push this code to GitHub
2. Create your first release tag
3. Watch the magic happen! 🎉