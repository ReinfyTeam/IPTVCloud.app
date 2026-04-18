export interface EpgProgram {
  start: string | null;
  stop: string | null;
  title: string;
  desc: string;
  image?: string | null;
  category?: string | null;
}

export interface EpgLookupResult {
  found: boolean;
  url?: string | null;
  now?: EpgProgram | null;
  next?: EpgProgram | null;
  schedule?: EpgProgram[];
  raw?: string;
  error?: string;
}
