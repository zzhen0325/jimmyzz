/** Uploaded media URLs keep their validated file extension. */
export const isVideoAsset = (src: string) => /\.(mp4|webm|mov)$/i.test(src);
