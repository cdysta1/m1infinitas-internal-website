import { ID, Models } from 'appwrite';
import { account } from '@/lib/appwrite';
import { env } from '@/lib/env';
import { createProfile } from './profiles';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  wechat: string;
  inviteCode: string;
}

export class InviteCodeError extends Error {
  constructor() {
    super('邀请码不正确');
    this.name = 'InviteCodeError';
  }
}

// After createEmailPasswordSession resolves, the browser still needs a tick to
// apply the Set-Cookie header to subsequent fetches. Without this settle step,
// the very next account.get() / createProfile() can 401 even though the session
// is valid — which the UI then mis-reports as "wrong password".
// We poll account.get() with a short backoff and only give up after ~1.5s.
async function settleSession(): Promise<Models.User<Models.Preferences>> {
  const delays = [0, 150, 300, 500];
  let lastErr: unknown;
  for (const d of delays) {
    if (d > 0) await new Promise((r) => setTimeout(r, d));
    try {
      return await account.get();
    } catch (err) {
      lastErr = err;
      if (!isAppwriteUnauthorized(err)) throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Session settle failed');
}

// Create a new account after verifying the global invite code,
// then bootstrap the profile document with the same $id as the user.
export async function register(input: RegisterInput): Promise<Models.User<Models.Preferences>> {
  if (!env.inviteCode) {
    // Fail loud in dev if the invite code env var is not set.
    throw new Error('VITE_INVITE_CODE 未配置，无法开启注册');
  }
  if (input.inviteCode.trim() !== env.inviteCode.trim()) {
    throw new InviteCodeError();
  }

  const userId = ID.unique();
  await account.create(userId, input.email, input.password, input.name);
  // Immediately sign in so the caller has an active session.
  await account.createEmailPasswordSession(input.email, input.password);

  // Wait for the session cookie to be usable before any authenticated call.
  const user = await settleSession();

  try {
    await createProfile(userId, {
      name: input.name,
      wechat: input.wechat,
    });
  } catch (err) {
    // The auth user already exists; surface a clear hint instead of a generic
    // failure so the user knows to retry from /me rather than re-register.
    console.error('[auth] createProfile failed after register', err);
    throw new Error('账号已创建，但资料初始化失败，请刷新后到“我的”页面补全');
  }

  return user;
}

export async function login(email: string, password: string): Promise<Models.User<Models.Preferences>> {
  await account.createEmailPasswordSession(email, password);
  return settleSession();
}

export async function logout(): Promise<void> {
  try {
    await account.deleteSession('current');
  } catch {
    // Ignore: session may already be gone.
  }
}

// Returns null when there is no active session (Appwrite throws 401).
export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    return await account.get();
  } catch (err) {
    if (isAppwriteUnauthorized(err)) return null;
    throw err;
  }
}

export function isAppwriteUnauthorized(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 401;
}
