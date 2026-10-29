// Stockage local (IndexedDB) : comptes, chaînes, vidéos, fichiers vidéo, commentaires.
// Tout reste dans le navigateur de la personne : aucun serveur externe.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type Visibility = 'Public' | 'Non répertoriée' | 'Privée';

export interface User {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: number;
  subs: string[]; // chaînes suivies
  liked: string[]; // vidéos aimées
  saved: string[]; // vidéos enregistrées
  history: string[]; // vidéos vues, la plus récente en premier
}

export interface Channel {
  id: string;
  ownerId: string;
  name: string;
  hue: number;
  desc: string;
  createdAt: number;
  avatar?: string; // data URL (image carrée)
  banner?: string; // data URL (image 6:1)
}

export interface Video {
  id: string;
  channelId: string;
  title: string;
  desc: string;
  cat: string;
  duration: number; // secondes
  width: number;
  height: number;
  visibility: Visibility;
  createdAt: number;
  views: number;
  hue: number;
  thumb?: string; // data URL JPEG
  size: number;
  type: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  text: string;
  createdAt: number;
  likedBy: string[];
}

interface RushDB extends DBSchema {
  users: { key: string; value: User; indexes: { email: string } };
  channels: { key: string; value: Channel };
  videos: { key: string; value: Video };
  files: { key: string; value: Blob };
  comments: { key: string; value: Comment };
}

let dbp: Promise<IDBPDatabase<RushDB>> | null = null;

export function db() {
  if (!dbp) {
    dbp = openDB<RushDB>('rush', 1, {
      upgrade(d) {
        d.createObjectStore('users', { keyPath: 'id' }).createIndex('email', 'email', { unique: true });
        d.createObjectStore('channels', { keyPath: 'id' });
        d.createObjectStore('videos', { keyPath: 'id' });
        d.createObjectStore('files');
        d.createObjectStore('comments', { keyPath: 'id' });
      },
    });
  }
  return dbp;
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16);

export async function loadAll() {
  const d = await db();
  const [users, channels, videos, comments] = await Promise.all([
    d.getAll('users'),
    d.getAll('channels'),
    d.getAll('videos'),
    d.getAll('comments'),
  ]);
  return { users, channels, videos, comments };
}

export async function getFile(id: string) {
  return (await db()).get('files', id);
}
