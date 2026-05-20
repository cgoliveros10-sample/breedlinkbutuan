#!/usr/bin/env node
// scripts/inject-env.js
//
// Run at build time via Vercel/Netlify buildCommand.
// 1. Replaces %%VARIABLE%% tokens in JS files with real env var values.
// 2. Generates vercel.json from vercel.template.json, substituting the
//    Supabase host into the CSP header (Vercel reads vercel.json before
//    buildCommand, so headers must be pre-baked into the output file).
//
// Required env vars:
//   SUPABASE_URL       – your Supabase project URL (https://xxxx.supabase.co)
//   SUPABASE_ANON_KEY  – your project's anon/public key
//
// Vercel setup: set buildCommand = "node scripts/inject-env.js" in vercel.json
// Netlify setup: set command = "node scripts/inject-env.js" in netlify.toml

const fs   = require('fs');
const path = require('path');

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`\n❌  Missing environment variable(s): ${missing.join(', ')}`);
  console.error('    Set them in Netlify/Vercel dashboard before deploying.\n');
  process.exit(1);
}

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
// Extract just the hostname (e.g. xxxx.supabase.co) from the full URL
const SUPABASE_HOST = SUPABASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

// ── Step 1: Generate vercel.json from template ────────────────────────────
const templatePath = path.join(__dirname, '..', 'vercel.template.json');
const vercelOutPath = path.join(__dirname, '..', 'vercel.json');

if (fs.existsSync(templatePath)) {
  let template = fs.readFileSync(templatePath, 'utf8');
  template = template.replaceAll('SUPABASE_HOST_PLACEHOLDER', SUPABASE_HOST);
  fs.writeFileSync(vercelOutPath, template, 'utf8');
  console.log('✅  Generated vercel.json from template (CSP host substituted)');
} else {
  console.warn('⚠️   vercel.template.json not found — skipping CSP host substitution');
}

// ── Step 2: Inject tokens into JS files ──────────────────────────────────
const JS_TARGETS = [
  path.join(__dirname, '..', 'scripts', 'shared', 'db.js'),
  path.join(__dirname, '..', 'scripts', 'pages', 'email-action-inline.js'),
  path.join(__dirname, '..', 'scripts', 'pages', 'verify-otp-inline.js'),
];

const VARS = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
};

for (const TARGET of JS_TARGETS) {
  let source = fs.readFileSync(TARGET, 'utf8');
  let changed = false;
  for (const [key, value] of Object.entries(VARS)) {
    const token = `%%${key}%%`;
    if (source.includes(token)) {
      source = source.replaceAll(token, value);
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
