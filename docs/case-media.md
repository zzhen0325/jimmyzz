# Project media delivery

Project images and opaque videos have content-addressed display copies in
`public/assets/case-media/`, selected by `src/lib/case-media-manifest.json`.
Original uploads and CMS references are retained. Transparent videos retain
 their original format so layered designs keep their alpha channel.

`npm run optimize:case-media` incrementally prepares responsive WebP images;
this also runs before dev/build. Existing video derivatives are reused.
After adding/replacing videos, run:

```sh
FFMPEG_PATH=/absolute/path/to/ffmpeg npm run optimize:case-media -- --videos
```

FFmpeg with libx264 is required for that explicit video preparation step.
Videos use H.264, preserve display aspect ratio and audio, and put the MP4
index before media bytes (`faststart`). Commit the generated manifest and
files together. Publishing the application includes these static assets;
no rewrite of live CMS content is needed. Newly uploaded media not yet
prepared falls back to the existing upload delivery path.

Verify with `node --test scripts/case-media.test.mjs scripts/media-delivery.test.mjs`.
The manifest test checks file availability and MP4 index placement.

Detail galleries start their image requests together, with the opening image
at high priority. Videos buffer ahead of the viewport, display a first-frame
poster, and pause offscreen. Other projects are warmed on navigation intent.
