import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// ---------- Types partagés avec le serveur (api/index.ts) ----------

export type Visibility = 'Public' | 'Non répertoriée' | 'Privée';

export interface Channel {
  id: string;
  ownerId: string;
  name: string;
  hue: number;
  desc: string;
  createdAt: number;
  avatar?: string;
  banner?: string;
  subs: number;
}

export interface Video {
  id: string;
  channelId: string;
  title: string;
  desc: string;
  cat: string;
  duration: number;
  width: number;
  height: number;
  visibility: Visibility;
  createdAt: number;
  views: number;
  hue: number;
  thumb?: string;
  fileUrl: string;
  size: number;
  type: string;
  likes: number;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  text: string;
  createdAt: number;
  likes: number;
  likedByMe: boolean;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  subs: string[];
  liked: string[];
  saved: string[];
  history: string[];
}

type Data = {
  storage: 'blob' | 'local';
  me: Me | null;
  users: { id: string; name: string }[];
  channels: Channel[];
  videos: Video[];
  comments: Comment[];
};

type ThemePref = 'system' | 'dark' | 'light';

const TOKEN_KEY = 'rush.token';
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

// ---------- Appels au serveur ----------

let token = safeGet(TOKEN_KEY);

export async function api<T = { ok: true }>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch('/api/' + path, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Pas de connexion. Vérifie ton réseau et réessaie.');
  }
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || 'Erreur du serveur. Réessaie dans un instant.');
  return json as T;
}

// Envoie un fichier vidéo avec la progression réelle. Renvoie son URL.
export async function uploadVideo(file: Blob, name: string, storage: Data['storage'], onPct: (p: number) => void, signal?: AbortSignal): Promise<string> {
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || 'mp4').toLowerCase();
  if (storage === 'blob') {
    const { upload } = await import('@vercel/blob/client');
    const r = await upload(`videos/video.${ext}`, file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      clientPayload: JSON.stringify({ token }),
      contentType: file.type || 'video/mp4',
      multipart: file.size > 50 * 1024 * 1024,
      onUploadProgress: (e) => onPct(Math.floor(e.percentage)),
      abortSignal: signal,
    });
    onPct(100);
    return r.url;
  }
  // Mode local (développement)
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', '/api/local-upload?ext=' + ext);
    if (token) x.setRequestHeader('authorization', 'Bearer ' + token);
    x.upload.onprogress = (e) => e.lengthComputable && onPct(Math.floor((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? (onPct(100), resolve(JSON.parse(x.responseText).url)) : reject(new Error('Échec de l’envoi.')));
    x.onerror = () => reject(new Error('Échec de l’envoi.'));
    signal?.addEventListener('abort', () => x.abort());
    x.send(file);
  });
}

// ---------- État global ----------

function useStoreValue() {
  const [data, setData] = useState<Data | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [themePref, setThemePref] = useState<ThemePref>(() => (safeGet(THEME_KEY) as ThemePref) || 'system');
  const [sysDark, setSysDark] = useState(() => !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches);

  const reload = useCallback(async () => {
    try {
      const d = await api<Data>('data');
      // Jeton expiré ou supprimé : on oublie la session.
      if (token && !d.me) {
        token = null;
        safeSet(TOKEN_KEY, null);
      }
      setData(d);
      setLoadErr('');
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    reload();
    // Rafraîchit quand on revient sur l'app (nouvelles vidéos des autres).
    const on = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
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

  const user = data?.me || null;
  const setToken = (t: string | null) => {
    token = t;
    safeSet(TOKEN_KEY, t);
  };

  const ownsChannel = (chId: string) => !!user && !!data?.channels.find((c) => c.id === chId && c.ownerId === user.id);

  // Change tout de suite l'écran, puis confirme avec le serveur.
  const optimisticToggle = async (key: 'subs' | 'liked' | 'saved', kind: string, id: string) => {
    if (!user) return;
    setData((d) => {
      if (!d?.me) return d;
      const list = d.me[key];
      const on = !list.includes(id);
      const me = { ...d.me, [key]: on ? [...list, id] : list.filter((x) => x !== id) };
      const delta = on ? 1 : -1;
      return {
        ...d,
        me,
        channels: key === 'subs' ? d.channels.map((c) => (c.id === id ? { ...c, subs: c.subs + delta } : c)) : d.channels,
        videos: key === 'liked' ? d.videos.map((v) => (v.id === id ? { ...v, likes: v.likes + delta } : v)) : d.videos,
      };
    });
    try {
      await api('toggle/' + kind, 'POST', { id });
    } finally {
      await reload();
    }
  };

  const actions = {
    reload,
    toggleTheme: () => {
      const next = dark ? 'light' : 'dark';
      safeSet(THEME_KEY, next);
      setThemePref(next);
    },

    async signUp(name: string, email: string, password: string) {
      const r = await api<{ token: string }>('signup', 'POST', { name, email, password });
      setToken(r.token);
      await reload();
    },
    async signIn(email: string, password: string) {
      const r = await api<{ token: string }>('login', 'POST', { email, password });
      setToken(r.token);
      await reload();
    },
    async signOut() {
      await api('logout', 'POST', {}).catch(() => {});
      setToken(null);
      await reload();
    },

    toggleSub: (chId: string) => optimisticToggle('subs', 'sub', chId),
    toggleLike: (vid: string) => optimisticToggle('liked', 'like', vid),
    toggleSave: (vid: string) => optimisticToggle('saved', 'save', vid),

    async view(vid: string) {
      await api('view', 'POST', { id: vid }).catch(() => {});
      await reload();
    },

    async postComment(vid: string, text: string) {
      if (!user || !text.trim()) return;
      await api('comments', 'POST', { videoId: vid, text });
      await reload();
    },
    async toggleCommentLike(cid: string) {
      if (!user) return;
      setData((d) => d && { ...d, comments: d.comments.map((c) => (c.id === cid ? { ...c, likedByMe: !c.likedByMe, likes: c.likes + (c.likedByMe ? -1 : 1) } : c)) });
      try {
        await api('toggle/comment-like', 'POST', { id: cid });
      } finally {
        await reload();
      }
    },

    async createChannel(name: string) {
      if (!user || !name.trim()) return null;
      const r = await api<{ id: string }>('channels', 'POST', { name });
      await reload();
      return r.id;
    },
    // avatar / banner : data URL pour changer, null pour retirer.
    async updateChannel(chId: string, patch: { name?: string; desc?: string; avatar?: string | null; banner?: string | null }) {
      await api('channels/' + chId, 'PATCH', patch);
      await reload();
    },

    async publish(p: {
      channelId: string;
      title: string;
      desc: string;
      cat: string;
      visibility: Visibility;
      fileUrl: string;
      duration: number;
      width: number;
      height: number;
      size: number;
      type: string;
      thumb?: string;
      createdAt?: number;
    }) {
      const r = await api<{ id: string }>('videos', 'POST', p);
      await reload();
      return r.id;
    },

    async deleteVideo(vid: string) {
      await api('videos/' + vid, 'DELETE');
      await reload();
    },
    async deleteChannelVideos(chId: string) {
      await api(`channels/${chId}/videos`, 'DELETE');
      await reload();
    },
    async deleteChannel(chId: string) {
      await api('channels/' + chId, 'DELETE');
      await reload();
    },
  };

  const canSee = (v: Video) => v.visibility === 'Public' || ownsChannel(v.channelId);
  const canOpen = (v: Video) => v.visibility !== 'Privée' || ownsChannel(v.channelId);

  return { data, loadErr, user, dark, actions, ownsChannel, canSee, canOpen };
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

export function useDerived() {
  const s = useStore();
  return useMemo(() => {
    const d = s.data!;
    const channel = (id: string) => d.channels.find((c) => c.id === id);
    const subsCount = (chId: string) => channel(chId)?.subs || 0;
    const likesCount = (vid: string) => d.videos.find((v) => v.id === vid)?.likes || 0;
    const userById = (id: string) => d.users.find((u) => u.id === id);
    const newest = (a: Video, b: Video) => b.createdAt - a.createdAt;
    return { channel, subsCount, likesCount, userById, newest };
  }, [s.data]);
}
