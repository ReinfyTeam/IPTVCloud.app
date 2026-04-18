export interface EpgProgram {
  start: string | null;
  stop: string | null;
  title: string;
  desc: string;
}

export interface EpgLookupResult {
  found: boolean;
  url?: string | null;
  now?: EpgProgram | null;
  next?: EpgProgram | null;
  raw?: string;
  error?: string;
}
