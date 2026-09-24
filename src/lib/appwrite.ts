import { Account, Client, Databases, Storage } from 'appwrite';
import { env } from './env';

// Appwrite SDK singletons.
// All modules import from here instead of instantiating their own client.
export const client = new Client()
  .setEndpoint(env.appwrite.endpoint)
  .setProject(env.appwrite.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// In appwrite v16 the Web SDK exposes realtime via client.subscribe().
// Re-export a thin wrapper so call sites read like the legacy Realtime service.
export const realtime = {
  subscribe: client.subscribe.bind(client),
};

export const DATABASE_ID = env.appwrite.databaseId;
export const BUCKET_ID = env.appwrite.bucketId;
export const COLLECTIONS = env.appwrite.collections;
