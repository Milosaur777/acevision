import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseBrowser() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build/prerender, env vars may not be available
    // Return a mock that won't crash but won't work
    return new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        if (prop === "from") {
          return () => ({
            select: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
            upsert: () => Promise.resolve({ data: null, error: null }),
            delete: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          });
        }
        return () => {};
      },
    }) as SupabaseClient;
  }

  client = createClient(url, key);
  return client;
}

// Alias for convenience
export const supabase = typeof window !== "undefined"
  ? (null as unknown as SupabaseClient) // will be replaced on first use
  : (null as unknown as SupabaseClient);

// Lazy getter that only runs in browser
let _supabase: SupabaseClient | null = null;
export function getSupabase() {
  if (typeof window === "undefined") return getSupabaseBrowser();
  if (!_supabase) _supabase = getSupabaseBrowser();
  return _supabase;
}
