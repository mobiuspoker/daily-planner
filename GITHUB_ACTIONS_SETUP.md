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

1. **Update version numbers** (both in package.json and src-tauri/Cargo.toml):
   ```bash
   # For bug fixes (0.1.0 -> 0.1.1)
   npm run version:patch
   
   # For new features (0.1.0 -> 0.2.0)
   npm run version:minor
   
   # For breaking changes (0.1.0 -> 1.0.0)
   npm run version:major
   ```
   
   Note: You'll need to install `cargo-edit` first:
   ```bash
   cargo install cargo-edit
   ```

2. **Commit the version changes**:
   ```bash
   git add .
   git commit -m "chore: bump version to v0.2.0"
   git push
   ```

3. **Create and push a tag**:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. **GitHub Actions will automatically**:
   - Build the app for all platforms
   - Create a draft release
   - Upload all executables to the release

5. **Go to GitHub Releases**:
   - Edit the draft release
   - Add release notes
   - Publish the release

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

### If builds fail:
1. Check the Actions tab for error logs
2. Common issues:
   - **macOS**: May need to update signing certificates (optional)
   - **Linux**: Missing system dependencies (automatically installed)
   - **Windows**: Usually works without issues

### Code Signing (Optional)
For production releases, you may want to:
- **macOS**: Add Apple Developer certificates
- **Windows**: Add code signing certificate
- See [Tauri's signing guide](https://tauri.app/v1/guides/distribution/sign/)

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

## Cost

GitHub Actions provides:
- **Free**: 2,000 minutes/month for private repos
- **Free**: Unlimited for public repos
- Each platform build takes ~5-10 minutes

## Next Steps

1. Push this code to GitHub
2. Create your first release tag
3. Watch the magic happen! 🎉