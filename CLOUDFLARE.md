# Cloudflare deployment

The Next.js application runs on the `zzmax` Worker using OpenNext. Public files
are Worker assets; CMS content and uploads are stored in the private
`zzmax-content` R2 bucket through the `CONTENT_BUCKET` binding. Plain `next dev`
and `next start` retain the local `data/` storage behavior.

## Compatible dependency versions

Next.js and eslint-config-next are pinned to `16.3.8`, OpenNext to `1.20.10`,
and Wrangler to `4.149.0`. Both npm and pnpm lockfiles use these versions.
`build:cloudflare` (including preview and deployment) runs `check:cloudflare`
first and refuses to build with a different declared or installed version.
Use `npm ci` for reproducible deployment installs. If using pnpm, use
`pnpm install --frozen-lockfile`.

Do not upgrade Next.js independently: Next.js 16.4.0 built successfully but
failed in Workers with `Unexpected loadManifest(/.next/server/preview-props.json)`.
To upgrade, update the compatible baseline in `scripts/check-cloudflare-versions.mjs`,
the package versions and both lockfiles together, then verify the homepage and
project details in Workers preview before deploying.

## Publish changes

After installing locked dependencies with `npm ci` and signing into Cloudflare,
use one command for both code and the latest local content:

```sh
npm run deploy:cloudflare
```

This checks compatible dependency versions, builds the application, deploys the
Worker and public assets, then runs `sync:content -- --publish`. Local
`data/content.json` and its referenced uploads are the source of truth on every
deployment, including when online content differs. The configuration is in
`wrangler.jsonc`.

Each step runs only if the preceding step succeeds. If content sync fails after
code deployment, the code is already live; the command reports failure and does
not automatically roll back code. Fix the reported issue and retry content sync.
The content sync still backs up online content and uploads media before replacing
the content configuration.

To compare or publish content independently without deploying code:

```sh
# Read-only comparison and a timestamped backup of online content
npm run sync:content
# Upload missing media, then publish local content and read it back to verify
npm run sync:content -- --publish
```

The sync command targets `zzmax-content` and `https://zzmax.icu`. It backs up both
content snapshots under ignored `output/cloudflare/content-sync-*/`, checks every
referenced local upload, verifies existing media size and MD5, uploads missing
media first, and only then replaces `content.json`. Existing remote media is
retained so the backup remains usable. It refuses to overwrite a media filename
with different bytes because media is cached as immutable.

Avoid editing either admin during the sync: the command rechecks local and remote
content immediately before publishing and stops if either changed, but this is
not an atomic lock against a simultaneous admin save. If local content references
new files in `public/assets`, deploy code/assets first. Online admin saves apply
directly to R2 without a deployment. Local admin saves are published by the next
`deploy:cloudflare` run or an independent `sync:content -- --publish` run.
Deployments use local content as the source of truth, so bring any desired
online-only edits into local content before deploying.

The `zzmax.icu/*` Worker route serves the production domain. The existing proxied
DNS record and older `aigaoji` Pages deployment are retained; removing this Worker
route restores the previous origin. The direct deployment URL is
https://zzmax.zzhen0325.workers.dev.

## Administration

Open `/admin` and enter any username with the configured `ADMIN_PASSWORD`.
The initial password is saved locally at `output/cloudflare/admin-password.txt`
(ignored by Git). To rotate it, put the new password in a private local file
and run `npx wrangler secret put ADMIN_PASSWORD < /path/to/password-file`.

The `/media/` endpoint serves private-bucket uploads and supports video byte
ranges. Static asset image optimization uses the Cloudflare `IMAGES` binding.
CMS `/media/` images use the shared `ContentImage` component with `unoptimized`:
OpenNext resolves local optimizer inputs through `ASSETS`, which cannot read the
dynamic R2 media route. Check actual rendered image URLs and browser image decoding
after content sync, not just the original file endpoints.

## Local Workers preview

```sh
npm run preview:cloudflare
```

This uses local R2 state, separate from the production bucket. Put local secrets
in `.dev.vars` if needed; that file is ignored by Git.
