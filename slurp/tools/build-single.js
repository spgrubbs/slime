// Bundle the built app into one self-contained HTML file (dist/slurp.html),
// for hosts that serve a single page — e.g. a claude.ai Artifact you can open
// on a phone. Run after `vite build`:  npm run build:single
//
// The host wraps the file in its own <html>/<head>/<body>, so this emits only
// a title, styles, the root element and the script.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const assets = join(dist, 'assets');
const files = readdirSync(assets);
const css = files.filter(f => f.endsWith('.css')).map(f => readFileSync(join(assets, f), 'utf8')).join('\n');
const js = files.filter(f => f.endsWith('.js')).map(f => readFileSync(join(assets, f), 'utf8')).join('\n');

// A literal "</script" inside the bundle would end the inline script early.
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const html = `<title>Slurp</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;

writeFileSync(join(dist, 'slurp.html'), html);
console.log(`dist/slurp.html — ${(html.length / 1024).toFixed(0)} KB`);
