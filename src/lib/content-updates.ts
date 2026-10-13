export const CONTENT_UPDATE_KEY = 'jimmyzz:content-update:v1';

export function notifyContentSaved() {
  try {
    localStorage.setItem(CONTENT_UPDATE_KEY, crypto.randomUUID());
  } catch {
    // Preview notifications must not turn a successful save into an error.
  }
}
