# Cloudflare deployment

The Next.js application runs on the `zzmax` Worker using OpenNext. Public files
are Worker assets; CMS content and uploads are stored in the private
`zzmax-content` R2 bucket through the `CONTENT_BUCKET` binding. Plain `next dev`
and `next start` retain the local `data/` storage behavior.

## Publish changes

```sh
npm ci
npx wrangler whoami
npm run deploy:cloudflare
```

The configuration is in `wrangler.jsonc`. Deployment does not overwrite the
remote CMS content. The initial migration copied `data/content.json` and
`data/uploads/` into R2; do not repeat that import over newer online edits.

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
ranges. Next.js image optimization uses the Cloudflare `IMAGES` binding.

## Local Workers preview

```sh
npm run preview:cloudflare
```

This uses local R2 state, separate from the production bucket. Put local secrets
in `.dev.vars` if needed; that file is ignored by Git.
