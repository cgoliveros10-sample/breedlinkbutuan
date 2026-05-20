#!/usr/bin/env node
// scripts/inject-env.js
//
// Run at build time (Netlify build command or Vercel build script).
// Replaces %%VARIABLE%% tokens in all target files with real env var values.
//
// Required env vars:
//   SUPABASE_URL       – your Supabase project URL
//   SUPABASE_ANON_KEY  – your project's anon/public key
//
// netlify.toml:
//   [build]
//     command = "node scripts/inject-env.js"

const fs   = require('fs');
const path = require('path');

const TARGETS = [
  path.join(__dirname, '..', 'scripts', 'shared', 'db.js'),
  path.join(__dirname, '..', 'scripts', 'pages', 'email-action-inline.js'),
  path.join(__dirname, '..', 'scripts', 'pages', 'verify-otp-inline.js'),
];

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];

const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`\n❌  Missing environment variable(s): ${missing.join(', ')}`);
  console.error('    Set them in Netlify/Vercel dashboard before deploying.\n');
  process.exit(1);
}

for (const TARGET of TARGETS) {
  let source = fs.readFileSync(TARGET, 'utf8');
  let changed = false;
  for (const key of REQUIRED) {
    const token = `%%${key}%%`;
    if (source.includes(token)) {
      source = source.replaceAll(token, process.env[key]);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(TARGET, source, 'utf8');
    console.log(`✅  Patched: ${path.relative(process.cwd(), TARGET)}`);
  } else {
    console.log(`⏭   No tokens found in: ${path.relative(process.cwd(), TARGET)}`);
  }
}
console.log('\n✅  inject-env.js complete.\n');
