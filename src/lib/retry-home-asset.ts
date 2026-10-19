/** Retry failed transfers, never time out an otherwise healthy slow download. */
export async function retryHomeAsset<T>(load: () => Promise<T>, cancelled = () => false): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (cancelled()) throw new Error("Home scene disposed");
    try {
      return await load();
    } catch (error) {
      // Missing/forbidden resources cannot be repaired by retrying.
      const status = (error as { response?: { status?: number } } | null)?.response?.status;
      if (cancelled() || attempt >= 3 || (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429)) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}
