# App Icon Creation Guide

This guide covers the full process of creating the llm Chatter app icon from scratch and applying it to the Electron build.

## Design Concept

The icon combines a **chat bubble** with a **spark** to represent AI-powered conversation.

Recommended style:
- Rounded square base (macOS app icon shape)
- Soft white chat bubble centered on a dark blue gradient background
- Cyan or amber four-point spark centered inside or emerging from the bubble
- Subtle glow and highlight for a polished app-icon look

## Step 1: Create the Master Image

Create your logo in any design tool (Affinity Photo, Figma, GIMP, etc.) with these requirements:

- **Canvas size:** 1024 × 1024 px
- **Color mode:** RGB
- **Format:** PNG
- **Filename:** `icon-1024.png`

For a macOS-style app icon, keep the main artwork centered with some padding inside the canvas so it does not touch the edges.

Save the final image as `icon-1024.png` in the project root.

## Step 2: Generate the macOS Icon Set

Run these commands from the project root:

```bash
mkdir AppIcon.iconset
sips -z 16 16     icon-1024.png --out AppIcon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out AppIcon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out AppIcon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out AppIcon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out AppIcon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out AppIcon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out AppIcon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out AppIcon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out AppIcon.iconset/icon_512x512.png
cp icon-1024.png AppIcon.iconset/icon_512x512@2x.png
iconutil -c icns AppIcon.iconset -o AppIcon.icns
```

The folder name must end with `.iconset`, and the `iconutil` command must reference that exact folder name.

## Step 3: Generate the Windows Icon

Install ImageMagick if you do not have it:

```bash
brew install imagemagick
```

Generate the `.ico` file:

```bash
magick icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 electron/build/icon.ico
```

## Step 4: Apply the Icons

The Electron builder configuration expects icons in `electron/build/`.

Copy the generated files:

```bash
cp AppIcon.icns electron/build/icon.icns
cp icon-1024.png electron/build/icon.png
```

The Windows icon is already placed by the previous command.

## Step 5: Set the Web App Icon

For the Next.js web app, place the icon files directly in `src/app/`:

```bash
magick electron/build/icon.png -define icon:auto-resize=256,128,64,48,32,16 src/app/favicon.ico
magick electron/build/icon.png -resize 180x180 src/app/apple-icon.png
```

Next.js will automatically use:
- `src/app/favicon.ico` as the browser favicon
- `src/app/apple-icon.png` as the Apple touch icon

## Step 6: Build the App

Run the appropriate build command:

```bash
# macOS
pnpm electron:build:mac

# Windows
pnpm electron:build:win

# Linux
pnpm electron:build:linux
```

For the web app:

```bash
pnpm build
```

## Step 7: Clean Up Temporary Files

After the build succeeds, remove only the temporary files that are no longer needed:

```bash
rm -rf AppIcon.iconset
rm AppIcon.icns
rm icon-1024.png
```

Do **not** delete the files in `electron/build/`. Those are required for the Electron build and must be committed to Git.

The final icons remain in:

```
electron/build/icon.icns
electron/build/icon.ico
electron/build/icon.png
```

These files should be committed to Git. The `.gitignore` has been updated so that `electron/build` is tracked, while a root-level `build` directory remains ignored.

To commit the updated icons, run:

```bash
git add electron/build/icon.icns electron/build/icon.ico electron/build/icon.png
# If you also updated the tray icon:
git add electron/build/tray-icon.png
# Web icons:
git add src/app/favicon.ico src/app/apple-icon.png
# Gitignore fix:
git add .gitignore
git commit -m "chore: update app icons for desktop and web"
```

## Troubleshooting

### `iconutil: Invalid Iconset`

The folder name must end with `.iconset`. Make sure you created `AppIcon.iconset`, not `AppIcon` or `iconset`.

### `iconutil: Iconset not found`

Make sure the `iconutil` command uses the exact folder name. If the folder is `AppIcon.iconset`, run:

```bash
iconutil -c icns AppIcon.iconset -o AppIcon.icns
```

### `zsh: command not found: magick`

ImageMagick is not installed. Install it with:

```bash
brew install imagemagick
```

Or export the Windows `.ico` manually from Affinity Photo with sizes 16, 32, 48, 128, and 256.

### Icon does not update after rebuild

Electron builder may cache icons. Try a clean rebuild:

```bash
rm -rf dist-electron out release
pnpm electron:build:mac
```
