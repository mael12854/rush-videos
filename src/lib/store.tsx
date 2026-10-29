import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db, loadAll, uid, type Channel, type Comment, type User, type Video, type Visibility } from './db';
import { OWNER_ACCOUNT, checkPassword, hashPassword } from './auth';

type Data = { users: User[]; channels: Channel[]; videos: Video[]; comments: Comment[] };
type ThemePref = 'system' | 'dark' | 'light';

const SESSION_KEY = 'rush.session';
const THEME_KEY = 'rush.theme';

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* stockage indisponible */
  }
};

export const isShort = (v: Video) => v.duration > 0 && v.duration <= 60 && v.height > v.width;

function newChannel(ownerId: string, name: string, existing: number): Channel {
  return {
    id: uid(),
    ownerId,
    name,
    hue: (32 + existing * 47 + Math.floor(Math.random() * 40)) % 360,
    desc: '',
    createdAt: Date.now(),
  };
}

async function ensureOwnerAccount() {
  const d = await db();
  const found = await d.getFromIndex('users', 'email', OWNER_ACCOUNT.email);
  if (found) return;
  const user: User = {
    id: uid(),
    ...OWNER_ACCOUNT,
    createdAt: Date.now(),
    subs: [],
    liked: [],
    saved: [],
    history: [],
  };
  const tx = d.transaction(['users', 'channels'], 'readwrite');
  await tx.objectStore('users').add(user);
  await tx.objectStore('channels').add(newChannel(user.id, OWNER_ACCOUNT.name, 0));
  await tx.done;
}

function useStoreValue() {
  const [data, setData] = useState<Data | null>(null);
  const [userId, setUserId] = useState<string | null>(() => safeGet(SESSION_KEY));
  const [themePref, setThemePref] = useState<ThemePref>(() => (safeGet(THEME_KEY) as ThemePref) || 'system');
  const [sysDark, setSysDark] = useState(() => !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches);

  const reload = useCallback(async () => setData(await loadAll()), []);

  useEffect(() => {
    ensureOwnerAccount().catch(console.error).finally(reload);
  }, [reload]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const dark = themePref === 'system' ? sysDark : themePref === 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.getElementById('theme-color')?.setAttribute('content', dark ? '#0c0d0f' : '#f7f7f6');
  }, [dark]);

  const user = data?.users.find((u) => u.id === userId) || null;

  const setSession = (id: string | null) => {
    safeSet(SESSION_KEY, id);
    setUserId(id);
  };

  const updateUser = async (fn: (u: User) => User) => {
    if (!user) return;
    const d = await db();
    const fresh = await d.get('users', user.id);
    if (!fresh) return;
    await d.put('users', fn(fresh));
    await reload();
  };

  const toggleIn = (key: 'subs' | 'liked' | 'saved', id: string) =>
    updateUser((u) => ({ ...u, [key]: u[key].includes(id) ? u[key].filter((x) => x !== id) : [...u[key], id] }));

  // Supprime vidéos + fichiers + commentaires, et nettoie listes des comptes.
  const removeVideos = async (ids: string[]) => {
    if (!ids.length) return;
    const d = await db();
    const users = await d.getAll('users');
    const comments = (await d.getAll('comments')).filter((c) => ids.includes(c.videoId));
    const tx = d.transaction(['videos', 'files', 'comments', 'users'], 'readwrite');
    for (const id of ids) {
      tx.objectStore('videos').delete(id);
      tx.objectStore('files').delete(id);
    }
    for (const c of comments) tx.objectStore('comments').delete(c.id);
    for (const u of users) {
      const clean = (l: string[]) => l.filter((x) => !ids.includes(x));
      tx.objectStore('users').put({ ...u, liked: clean(u.liked), saved: clean(u.saved), history: clean(u.history) });
    }
    await tx.done;
  };

  const ownsChannel = (chId: string) => !!user && !!data?.channels.find((c) => c.id === chId && c.ownerId === user.id);

  const actions = {
    reload,
    toggleTheme: () => {
      const next = dark ? 'light' : 'dark';
      safeSet(THEME_KEY, next);
      setThemePref(next);
    },

    async signUp(name: string, email: string, password: string) {
      email = email.trim().toLowerCase();
      name = name.trim();
      if (!name) throw new Error('Indique ton nom.');
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Adresse e-mail invalide.');
      if (password.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères.');
      const d = await db();
      if (await d.getFromIndex('users', 'email', email)) throw new Error('Un compte existe déjà avec cette adresse.');
      const { salt, hash } = await hashPassword(password);
      const u: User = { id: uid(), name, email, salt, hash, createdAt: Date.now(), subs: [], liked: [], saved: [], history: [] };
      const tx = d.transaction(['users', 'channels'], 'readwrite');
      await tx.objectStore('users').add(u);
      await tx.objectStore('channels').add(newChannel(u.id, name, (data?.channels.length || 0) + 1));
      await tx.done;
      await reload();
      setSession(u.id);
    },

    async signIn(email: string, password: string) {
      const d = await db();
      const u = await d.getFromIndex('users', 'email', email.trim().toLowerCase());
      if (!u || !(await checkPassword(password, u.salt, u.hash))) throw new Error('E-mail ou mot de passe incorrect.');
      setSession(u.id);
    },

    signOut: () => setSession(null),

    toggleSub: (chId: string) => toggleIn('subs', chId),
    toggleLike: (vid: string) => toggleIn('liked', vid),
    toggleSave: (vid: string) => toggleIn('saved', vid),

    // Compte une vue et met à jour l'historique.
    async view(vid: string) {
      const d = await db();
      const v = await d.get('videos', vid);
      if (!v) return;
      await d.put('videos', { ...v, views: v.views + 1 });
      if (user) {
        const fresh = await d.get('users', user.id);
        if (fresh) await d.put('users', { ...fresh, history: [vid, ...fresh.history.filter((x) => x !== vid)].slice(0, 24) });
      }
      await reload();
    },

    async postComment(vid: string, text: string) {
      if (!user || !text.trim()) return;
      await (await db()).add('comments', { id: uid(), videoId: vid, userId: user.id, text: text.trim(), createdAt: Date.now(), likedBy: [] });
      await reload();
    },

    async toggleCommentLike(cid: string) {
      if (!user) return;
      const d = await db();
      const c = await d.get('comments', cid);
      if (!c) return;
      const on = c.likedBy.includes(user.id);
      await d.put('comments', { ...c, likedBy: on ? c.likedBy.filter((x) => x !== user.id) : [...c.likedBy, user.id] });
      await reload();
    },

    async createChannel(name: string) {
      if (!user || !name.trim()) return null;
      const ch = newChannel(user.id, name.trim(), data?.channels.length || 0);
      await (await db()).add('channels', ch);
      await reload();
      return ch;
    },

    async updateChannel(chId: string, patch: Partial<Pick<Channel, 'name' | 'desc' | 'avatar' | 'banner'>>) {
      if (!ownsChannel(chId)) return;
      const d = await db();
      const ch = await d.get('channels', chId);
      if (ch) await d.put('channels', { ...ch, ...patch });
      await reload();
    },

    async publish(p: {
      channelId: string;
      title: string;
      desc: string;
      cat: string;
      visibility: Visibility;
      blob: Blob;
      duration: number;
      width: number;
      height: number;
      thumb?: string;
    }) {
      if (!ownsChannel(p.channelId)) throw new Error('Chaîne invalide.');
      const ch = data!.channels.find((c) => c.id === p.channelId)!;
      const v: Video = {
        id: uid(),
        channelId: p.channelId,
        title: p.title.trim(),
        desc: p.desc.trim(),
        cat: p.cat,
        duration: p.duration,
        width: p.width,
        height: p.height,
        visibility: p.visibility,
        createdAt: Date.now(),
        views: 0,
        hue: (ch.hue + Math.floor(Math.random() * 45)) % 360,
        thumb: p.thumb,
        size: p.blob.size,
        type: p.blob.type,
      };
      const d = await db();
      const tx = d.transaction(['videos', 'files'], 'readwrite');
      await tx.objectStore('files').put(p.blob, v.id);
      await tx.objectStore('videos').add(v);
      await tx.done;
      await reload();
      return v;
    },

    async deleteVideo(vid: string) {
      const v = data?.videos.find((x) => x.id === vid);
      if (!v || !ownsChannel(v.channelId)) return;
      await removeVideos([vid]);
      await reload();
    },

    async deleteChannelVideos(chId: string) {
      if (!ownsChannel(chId)) return;
      await removeVideos(data!.videos.filter((v) => v.channelId === chId).map((v) => v.id));
      await reload();
    },

    async deleteChannel(chId: string) {
      if (!ownsChannel(chId)) return;
      await removeVideos(data!.videos.filter((v) => v.channelId === chId).map((v) => v.id));
      const d = await db();
      await d.delete('channels', chId);
      const users = await d.getAll('users');
      for (const u of users) if (u.subs.includes(chId)) await d.put('users', { ...u, subs: u.subs.filter((x) => x !== chId) });
      await reload();
    },
  };

  // Ce qu'un visiteur a le droit de voir.
  const canSee = (v: Video) => v.visibility === 'Public' || ownsChannel(v.channelId);
  const canOpen = (v: Video) => v.visibility !== 'Privée' || ownsChannel(v.channelId);

  return { data, user, dark, actions, ownsChannel, canSee, canOpen };
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider manquant');
  return s;
}

// Helpers dérivés
export function useDerived() {
  const s = useStore();
  return useMemo(() => {
    const d = s.data!;
    const channel = (id: string) => d.channels.find((c) => c.id === id);
    const subsCount = (chId: string) => d.users.filter((u) => u.subs.includes(chId)).length;
    const likesCount = (vid: string) => d.users.filter((u) => u.liked.includes(vid)).length;
    const userById = (id: string) => d.users.find((u) => u.id === id);
    const newest = (a: Video, b: Video) => b.createdAt - a.createdAt;
    return { channel, subsCount, likesCount, userById, newest };
  }, [s.data]);
}
