// Ancienne version de Rush : tout était stocké dans le navigateur (IndexedDB).
// Ce module retrouve ces chaînes et vidéos et les met en ligne.
import { db, type Channel as OldChannel, type Video as OldVideo } from './db';
import { api, uploadVideo } from './store';

const DONE_KEY = 'rush.imported';

const doneIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) || '[]');
  } catch {
    return [];
  }
};
const markDone = (id: string) => {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...doneIds(), id]));
  } catch {
    /* rien */
  }
};

export type LegacyFind = { channels: OldChannel[]; videos: OldVideo[] };

// Contenu local appartenant au compte `email`, pas encore mis en ligne.
export async function findLegacy(email: string): Promise<LegacyFind | null> {
  try {
    if (indexedDB.databases) {
      const list = await indexedDB.databases();
      if (!list.some((d) => d.name === 'rush')) return null;
    }
    const d = await db();
    const users = await d.getAll('users');
    const me = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!me) return null;
    const done = doneIds();
    const allChannels = (await d.getAll('channels')).filter((c) => c.ownerId === me.id);
    const allVideos = (await d.getAll('videos')).filter((v) => allChannels.some((c) => c.id === v.channelId));
    const videos = allVideos.filter((v) => !done.includes(v.id));
    // Une chaîne est à importer si elle n'est pas faite, ou si elle a encore des vidéos à importer.
    const channels = allChannels.filter((c) => !done.includes(c.id) || videos.some((v) => v.channelId === c.id));
    // La chaîne créée automatiquement, vide et sans réglages, n'a pas besoin d'être importée.
    const useful = channels.filter((c) => c.desc || c.avatar || c.banner || videos.some((v) => v.channelId === c.id) || c.name !== me.name);
    if (!useful.length) return null;
    return { channels: useful, videos: videos.filter((v) => useful.some((c) => c.id === v.channelId)) };
  } catch {
    return null;
  }
}

type Server = { channels: { id: string; ownerId: string; name: string }[]; me: { id: string } | null; storage: 'blob' | 'local' };

export async function importLegacy(found: LegacyFind, server: Server, onStep: (msg: string) => void) {
  const d = await db();
  const map = new Map<string, string>(); // ancien id -> id en ligne
  const myOnline = server.channels.filter((c) => c.ownerId === server.me?.id);

  for (const c of found.channels) {
    const same = myOnline.find((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase());
    let id = same?.id;
    if (!id) {
      onStep(`Chaîne « ${c.name} »…`);
      id = (await api<{ id: string }>('channels', 'POST', { name: c.name })).id;
    }
    const patch: Record<string, string> = {};
    if (c.desc) patch.desc = c.desc;
    if (c.avatar) patch.avatar = c.avatar;
    if (c.banner) patch.banner = c.banner;
    if (Object.keys(patch).length && !doneIds().includes(c.id)) await api('channels/' + id, 'PATCH', patch);
    map.set(c.id, id);
    markDone(c.id);
  }

  let i = 0;
  for (const v of found.videos) {
    i++;
    const file = await d.get('files', v.id);
    if (!file) {
      markDone(v.id);
      continue;
    }
    const fileUrl = await uploadVideo(file, `video.${(v.type.split('/')[1] || 'mp4').replace('quicktime', 'mov')}`, server.storage, (p) =>
      onStep(`Vidéo ${i}/${found.videos.length} « ${v.title} » : ${p} %`),
    );
    await api('videos', 'POST', {
      channelId: map.get(v.channelId),
      title: v.title,
      desc: v.desc,
      cat: v.cat,
      visibility: v.visibility,
      fileUrl,
      duration: v.duration,
      width: v.width,
      height: v.height,
      size: v.size,
      type: v.type,
      thumb: v.thumb,
      createdAt: v.createdAt,
    });
    markDone(v.id);
  }
}
