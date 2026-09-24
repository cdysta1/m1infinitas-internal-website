// Strongly-typed access to Vite env variables.
// Fails fast during app bootstrap when required values are missing.

const raw = import.meta.env;

function read(name: string, fallback?: string): string {
  const value = (raw as Record<string, string | undefined>)[name];
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env variable: ${name}`);
}

function readOptional(name: string): string | undefined {
  const value = (raw as Record<string, string | undefined>)[name];
  return value && value !== '' ? value : undefined;
}

export const env = {
  appwrite: {
    endpoint: read('VITE_APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1'),
    projectId: read('VITE_APPWRITE_PROJECT_ID'),
    databaseId: read('VITE_APPWRITE_DATABASE_ID'),
    bucketId: read('VITE_APPWRITE_BUCKET_ID'),
    collections: {
      profiles: read('VITE_APPWRITE_COLLECTION_PROFILES', 'profiles'),
      projects: read('VITE_APPWRITE_COLLECTION_PROJECTS', 'projects'),
      updates: read('VITE_APPWRITE_COLLECTION_UPDATES', 'updates'),
    },
  },
  inviteCode: readOptional('VITE_INVITE_CODE'),
  basePath: readOptional('VITE_BASE_PATH') ?? '/',
} as const;

export type Env = typeof env;
