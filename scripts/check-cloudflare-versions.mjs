import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(new URL('../package.json', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const compatible = {
  next: '16.3.8',
  'eslint-config-next': '16.3.8',
  '@opennextjs/cloudflare': '1.20.10',
  wrangler: '4.149.0',
};
const errors = [];
for (const [name, expected] of Object.entries(compatible)) {
  const declared = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
  let installed;
  try {
    let directory = dirname(require.resolve(name));
    while (true) {
      const file = join(directory, 'package.json');
      if (existsSync(file)) {
        const metadata = JSON.parse(readFileSync(file, 'utf8'));
        if (metadata.name === name) { installed = metadata.version; break; }
      }
      const parent = dirname(directory);
      if (parent === directory) throw new Error('Package metadata not found');
      directory = parent;
    }
  } catch { installed = '未安装'; }
  if (declared !== expected || installed !== expected) {
    errors.push(`${name}: 要求 ${expected}，声明 ${declared}，已安装 ${installed}`);
  }
}
if (errors.length) {
  console.error(`Cloudflare 兼容版本检查失败：\n${errors.join('\n')}\n请先运行 npm ci，再重新构建。升级时需一起更新版本基线，并在 Workers preview 验证后发布。`);
  process.exit(1);
}
console.log('Cloudflare 兼容版本检查通过：Next.js 16.3.8 / OpenNext 1.20.10 / Wrangler 4.149.0');
