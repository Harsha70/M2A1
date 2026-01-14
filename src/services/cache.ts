const redirectCache: Record<string, string> = {};

export const cacheService = {
  get: (code: string) => redirectCache[code],
  set: (code: string, entry: any) => {
    redirectCache[code] = entry;
  },
  clear: () => {
    for (const key in redirectCache) delete redirectCache[key];
  }
};