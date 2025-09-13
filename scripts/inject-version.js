#!/usr/bin/env node

/**
 * Inject version from tauri.conf.json into splashscreen.html
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read version from tauri.conf.json
const tauriConfigPath = join(rootDir, 'src-tauri', 'tauri.conf.json');
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf-8'));
const version = tauriConfig.version;

console.log(`📦 Injecting version: ${version}`);

// Read splashscreen template
const splashscreenPath = join(rootDir, 'static', 'splashscreen.html');
let splashscreen = readFileSync(splashscreenPath, 'utf-8');

// Replace version placeholder
const versionRegex = /<div class="version">verze [\d.]+<\/div>/;
const newVersionLine = `<div class="version">verze ${version}</div>`;

if (versionRegex.test(splashscreen)) {
  splashscreen = splashscreen.replace(versionRegex, newVersionLine);
  writeFileSync(splashscreenPath, splashscreen);
  console.log(`✅ Version updated in splashscreen.html: ${version}`);
} else {
  console.error('❌ Could not find version line in splashscreen.html');
  process.exit(1);
}
