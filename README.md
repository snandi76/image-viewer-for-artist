# Line & Light

A cross-platform reference viewer for artists, built with Angular and Tauri/Rust.

## What is included

- Angular standalone frontend with a dark studio workspace
- Tauri v2 desktop shell powered by Rust
- Local image import with thumbnail and image dimensions
- Zoom controls and fit-to-view reset
- Toggleable graph paper and center guides
- Pixel-to-unit calibration and image measurement readout
- Notes area for study observations

## Prerequisites

Install the current Node.js LTS release and Rust toolchain before running the project. Tauri on Windows also requires Microsoft C++ Build Tools and WebView2.

## Run in development

```powershell
npm install
npm run tauri:dev
```

For frontend-only development:

```powershell
npm start
```

## Build a desktop bundle

```powershell
npm run tauri:build
```

The application entrypoint is `src/app/app.ts`; the Rust shell lives in `src-tauri`.
