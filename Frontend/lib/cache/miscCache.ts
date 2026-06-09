const VERSION_KEY = 'misc-version';
const DATA_KEY = 'misc-data';

type MiscData = {
  abilities: any;
  items: any;
  natures: any;
  moves: any;
  types: any;
  statuses: any;
};

export const readMiscCache = (version: string): MiscData | null => {
  try {
    const cachedVersion = localStorage.getItem(VERSION_KEY);
    if (cachedVersion !== version) return null;
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MiscData;
  } catch {
    return null;
  }
};

export const writeMiscCache = (version: string, data: MiscData): void => {
  try {
    localStorage.setItem(VERSION_KEY, version);
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded — continue without cache
  }
};
