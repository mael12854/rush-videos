// API de Rush : comptes, chaînes, vidéos, commentaires, abonnements.
// En ligne : Postgres (Neon, via DATABASE_URL) + Vercel Blob pour les fichiers.
// En local (sans ces variables) : Postgres embarqué (PGlite) + fichiers dans .data/.
import { randomBytes, pbkdf2, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);

// ---------- Stockage ----------

type Row = Record<string, unknown>;
type Sql = (text: string, params?: unknown[]) => Promise<Row[]>;

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const BLOB_ON = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
// Les modules de dev sont chargés par un nom calculé pour ne pas finir dans le paquet en ligne.
const devImport = (name: string) => import(/* @vite-ignore */ name);

let sqlP: Promise<Sql> | null = null;
function getSql(): Promise<Sql> {
  if (!sqlP) {
    sqlP = (async () => {
      let sql: Sql;
      if (DB_URL) {
        const { neon } = await import('@neondatabase/serverless');
        const q = neon(DB_URL);
        sql = (text, params = []) => q.query(text, params) as Promise<Row[]>;
      } else {
        const fs = await devImport('node:fs/promises');
        await fs.mkdir('.data', { recursive: true });
        const { PGlite } = await devImport('@electric-sql/pglite');
        const db = new PGlite(process.env.RUSH_DEV_DB || '.data/pg');
        sql = async (text, params = []) => (await db.query(text, params)).rows as Row[];
      }
      await migrate(sql);
      return sql;
    })().catch((e) => {
      sqlP = null;
      throw e;
    });
  }
  return sqlP;
}

async function migrate(sql: Sql) {
  const stmts = [
    `create table if not exists users (id text primary key, name text not null, email text not null unique, salt text not null, hash text not null, created_at bigint not null)`,
    `create table if not exists sessions (token text primary key, user_id text not null references users(id) on delete cascade, created_at bigint not null)`,
    `create table if not exists channels (id text primary key, owner_id text not null references users(id) on delete cascade, name text not null, hue int not null, descr text not null default '', avatar text, banner text, created_at bigint not null)`,
    `create table if not exists videos (id text primary key, channel_id text not null references channels(id) on delete cascade, title text not null, descr text not null default '', cat text not null, duration double precision not null, width int not null, height int not null, visibility text not null, created_at bigint not null, views int not null default 0, hue int not null, thumb text, file_url text not null, size bigint not null, type text not null)`,
    `create table if not exists subs (user_id text not null references users(id) on delete cascade, channel_id text not null references channels(id) on delete cascade, primary key (user_id, channel_id))`,
    `create table if not exists likes (user_id text not null references users(id) on delete cascade, video_id text not null references videos(id) on delete cascade, created_at bigint not null, primary key (user_id, video_id))`,
    `create table if not exists saved (user_id text not null references users(id) on delete cascade, video_id text not null references videos(id) on delete cascade, created_at bigint not null, primary key (user_id, video_id))`,
    `create table if not exists history (user_id text not null references users(id) on delete cascade, video_id text not null references videos(id) on delete cascade, viewed_at bigint not null, primary key (user_id, video_id))`,
    `create table if not exists comments (id text primary key, video_id text not null references videos(id) on delete cascade, user_id text not null references users(id) on delete cascade, text text not null, created_at bigint not null)`,
    `create table if not exists comment_likes (user_id text not null references users(id) on delete cascade, comment_id text not null references comments(id) on delete cascade, primary key (user_id, comment_id))`,
    `create index if not exists videos_channel on videos(channel_id)`,
    `create index if not exists comments_video on comments(video_id)`,
  ];
  for (const s of stmts) await sql(s);
  // Compte du propriétaire (mot de passe haché, jamais en clair).
  const owner = await sql(`select id from users where email = $1`, [OWNER.email]);
  if (!owner.length) {
    const id = uid();
    await sql(`insert into users (id, name, email, salt, hash, created_at) values ($1,$2,$3,$4,$5,$6) on conflict (email) do nothing`, [
      id, OWNER.name, OWNER.email, OWNER.salt, OWNER.hash, Date.now(),
    ]);
    const again = await sql(`select id from users where email = $1`, [OWNER.email]);
    if (again[0]?.id === id) await sql(`insert into channels (id, owner_id, name, hue, created_at) values ($1,$2,$3,$4,$5)`, [uid(), id, OWNER.name, 32, Date.now()]);
  }
}

const OWNER = {
  name: 'Maël Domenech',
  email: 'mael.domenech@gmail.com',
  salt: 'b4c60f971d0ea197872284b9f875dee8',
  hash: 'fed7ede4edbe8f5ad88742c2af815a5be8814c01a784beb64b8360bec52c6532',
};

// Fichiers : Vercel Blob en ligne, dossier .data/files en local.
async function putFile(pathname: string, body: Buffer, contentType: string): Promise<string> {
  if (BLOB_ON) {
    const { put } = await import('@vercel/blob');
    const r = await put(pathname, body, { access: 'public', contentType, addRandomSuffix: true });
    return r.url;
  }
  const fs = await devImport('node:fs/promises');
  const path = await devImport('node:path');
  const name = pathname.replace(/(\.[a-z0-9]+)$/i, `-${uid()}$1`);
  const full = path.join('.data/files', name);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
  return '/files/' + name;
}

async function delFiles(urls: (string | null | undefined)[]) {
  const list = urls.filter((u): u is string => !!u);
  if (!list.length) return;
  try {
    if (BLOB_ON) {
      const { del } = await import('@vercel/blob');
      await del(list.filter((u) => u.startsWith('https://')));
    } else {
      const fs = await devImport('node:fs/promises');
      for (const u of list) if (u.startsWith('/files/')) await fs.rm('.data/files/' + u.slice(7), { force: true });
    }
  } catch (e) {
    console.error('delFiles', e);
  }
}

// ---------- Outils ----------

const uid = () => randomBytes(8).toString('hex');
const num = (v: unknown) => Number(v ?? 0);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const fail = (status: number, msg: string): never => {
  throw new HttpError(status, msg);
};

async function hashPw(pw: string, salt?: string) {
  const s = salt ? Buffer.from(salt, 'hex') : randomBytes(16);
  const h = await pbkdf2Async(pw, s, 150000, 32, 'sha256');
  return { salt: s.toString('hex'), hash: h.toString('hex') };
}

function dataUrlToBuffer(d: string) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(d);
  if (!m) fail(400, 'Image invalide.');
  const buf = Buffer.from(m![2], 'base64');
  if (buf.length > 2_000_000) fail(400, 'Image trop lourde.');
  return { buf, type: m![1] };
}

const VIS = ['Public', 'Non répertoriée', 'Privée'];
const CATS = ['Musique', 'Gaming', 'Cuisine', 'Science', 'Sport', 'Tech', 'Humour', 'Voyage'];

// ---------- Session ----------

async function currentUser(sql: Sql, req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await sql(`select u.id, u.name, u.email from sessions s join users u on u.id = s.user_id where s.token = $1`, [token]);
  return r[0] ? { id: String(r[0].id), name: String(r[0].name), email: String(r[0].email), token } : null;
}
type Me = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

async function newSession(sql: Sql, userId: string) {
  const token = randomBytes(32).toString('hex');
  await sql(`insert into sessions (token, user_id, created_at) values ($1,$2,$3)`, [token, userId, Date.now()]);
  return token;
}

async function ownsChannel(sql: Sql, me: Me, chId: string) {
  const r = await sql(`select 1 from channels where id = $1 and owner_id = $2`, [chId, me.id]);
  if (!r.length) fail(403, 'Ce n’est pas ta chaîne.');
}

// ---------- Lecture de tout le site ----------

async function readAll(sql: Sql, me: Me | null) {
  const meId = me?.id || '';
  const [users, channels, videos, comments] = await Promise.all([
    sql(`select id, name from users`),
    sql(`select c.*, (select count(*) from subs s where s.channel_id = c.id) as subs from channels c`),
    sql(
      `select v.*, (select count(*) from likes l where l.video_id = v.id) as likes from videos v
       where v.visibility <> 'Privée' or v.channel_id in (select id from channels where owner_id = $1)`,
      [meId],
    ),
    sql(
      `select c.*, (select count(*) from comment_likes l where l.comment_id = c.id) as likes,
              exists(select 1 from comment_likes l where l.comment_id = c.id and l.user_id = $1) as mine
       from comments c`,
      [meId],
    ),
  ]);
  const videoIds = new Set(videos.map((v) => String(v.id)));
  let mine = null;
  if (me) {
    const [s, l, sv, h] = await Promise.all([
      sql(`select channel_id from subs where user_id = $1`, [meId]),
      sql(`select video_id from likes where user_id = $1 order by created_at desc`, [meId]),
      sql(`select video_id from saved where user_id = $1 order by created_at desc`, [meId]),
      sql(`select video_id from history where user_id = $1 order by viewed_at desc limit 24`, [meId]),
    ]);
    mine = {
      id: me.id,
      name: me.name,
      email: me.email,
      subs: s.map((r) => String(r.channel_id)),
      liked: l.map((r) => String(r.video_id)),
      saved: sv.map((r) => String(r.video_id)),
      history: h.map((r) => String(r.video_id)),
    };
  }
  return {
    storage: BLOB_ON ? 'blob' : 'local',
    me: mine,
    users: users.map((u) => ({ id: String(u.id), name: String(u.name) })),
    channels: channels.map((c) => ({
      id: String(c.id),
      ownerId: String(c.owner_id),
      name: String(c.name),
      hue: num(c.hue),
      desc: String(c.descr || ''),
      avatar: (c.avatar as string) || undefined,
      banner: (c.banner as string) || undefined,
      createdAt: num(c.created_at),
      subs: num(c.subs),
    })),
    videos: videos.map((v) => ({
      id: String(v.id),
      channelId: String(v.channel_id),
      title: String(v.title),
      desc: String(v.descr || ''),
      cat: String(v.cat),
      duration: num(v.duration),
      width: num(v.width),
      height: num(v.height),
      visibility: String(v.visibility),
      createdAt: num(v.created_at),
      views: num(v.views),
      hue: num(v.hue),
      thumb: (v.thumb as string) || undefined,
      fileUrl: String(v.file_url),
      size: num(v.size),
      type: String(v.type),
      likes: num(v.likes),
    })),
    comments: comments
      .filter((c) => videoIds.has(String(c.video_id)))
      .map((c) => ({
        id: String(c.id),
        videoId: String(c.video_id),
        userId: String(c.user_id),
        text: String(c.text),
        createdAt: num(c.created_at),
        likes: num(c.likes),
        likedByMe: !!c.mine,
      })),
  };
}

// ---------- Routes ----------

async function toggle(sql: Sql, table: 'subs' | 'likes' | 'saved' | 'comment_likes', col: string, userId: string, id: string) {
  const del = await sql(`delete from ${table} where user_id = $1 and ${col} = $2 returning 1`, [userId, id]);
  if (del.length) return false;
  const withTime = table === 'likes' || table === 'saved';
  await sql(
    withTime
      ? `insert into ${table} (user_id, ${col}, created_at) values ($1,$2,$3) on conflict do nothing`
      : `insert into ${table} (user_id, ${col}) values ($1,$2) on conflict do nothing`,
    withTime ? [userId, id, Date.now()] : [userId, id],
  );
  return true;
}

async function deleteVideos(sql: Sql, where: string, params: unknown[]) {
  const rows = await sql(`delete from videos where ${where} returning file_url, thumb`, params);
  await delFiles(rows.flatMap((r) => [r.file_url as string, r.thumb as string]));
  return rows.length;
}

async function route(req: Request, path: string[]): Promise<Response> {
  const sql = await getSql();
  const method = req.method;
  const me = await currentUser(sql, req);
  const isJson = (req.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await req.json().catch(() => ({})) : {};
  const needMe = () => me || fail(401, 'Connecte-toi pour continuer.');
  const ok = (extra: object = {}) => Response.json({ ok: true, ...extra });
  const [a, b, c] = path;

  // Tout le contenu visible
  if (method === 'GET' && a === 'data') return Response.json(await readAll(sql, me));

  // Comptes
  if (method === 'POST' && a === 'signup') {
    const name = String(body.name || '').trim().slice(0, 60);
    const email = String(body.email || '').trim().toLowerCase();
    const pw = String(body.password || '');
    if (!name) fail(400, 'Indique ton nom.');
    if (!/^\S+@\S+\.\S+$/.test(email)) fail(400, 'Adresse e-mail invalide.');
    if (pw.length < 8) fail(400, 'Le mot de passe doit faire au moins 8 caractères.');
    if ((await sql(`select 1 from users where email = $1`, [email])).length) fail(409, 'Un compte existe déjà avec cette adresse.');
    const { salt, hash } = await hashPw(pw);
    const id = uid();
    await sql(`insert into users (id, name, email, salt, hash, created_at) values ($1,$2,$3,$4,$5,$6)`, [id, name, email, salt, hash, Date.now()]);
    await sql(`insert into channels (id, owner_id, name, hue, created_at) values ($1,$2,$3,$4,$5)`, [uid(), id, name, Math.floor(Math.random() * 360), Date.now()]);
    return ok({ token: await newSession(sql, id) });
  }
  if (method === 'POST' && a === 'login') {
    const email = String(body.email || '').trim().toLowerCase();
    const r = await sql(`select id, salt, hash from users where email = $1`, [email]);
    const u = r[0];
    const good = u && timingSafeEqual(Buffer.from((await hashPw(String(body.password || ''), String(u.salt))).hash, 'hex'), Buffer.from(String(u.hash), 'hex'));
    if (!good) fail(401, 'E-mail ou mot de passe incorrect.');
    return ok({ token: await newSession(sql, String(u.id)) });
  }
  if (method === 'POST' && a === 'logout') {
    if (me) await sql(`delete from sessions where token = $1`, [me.token]);
    return ok();
  }

  // Abonnements, J'aime, enregistrées
  if (method === 'POST' && a === 'toggle') {
    const u = needMe();
    const id = String(body.id || '');
    if (b === 'sub') return ok({ on: await toggle(sql, 'subs', 'channel_id', u.id, id) });
    if (b === 'like') return ok({ on: await toggle(sql, 'likes', 'video_id', u.id, id) });
    if (b === 'save') return ok({ on: await toggle(sql, 'saved', 'video_id', u.id, id) });
    if (b === 'comment-like') return ok({ on: await toggle(sql, 'comment_likes', 'comment_id', u.id, id) });
  }

  // Vue (compteur + historique)
  if (method === 'POST' && a === 'view') {
    const id = String(body.id || '');
    await sql(`update videos set views = views + 1 where id = $1`, [id]);
    if (me) await sql(`insert into history (user_id, video_id, viewed_at) values ($1,$2,$3) on conflict (user_id, video_id) do update set viewed_at = excluded.viewed_at`, [me.id, id, Date.now()]);
    return ok();
  }

  // Commentaires
  if (method === 'POST' && a === 'comments') {
    const u = needMe();
    const text = String(body.text || '').trim().slice(0, 2000);
    if (!text) fail(400, 'Commentaire vide.');
    await sql(`insert into comments (id, video_id, user_id, text, created_at) values ($1,$2,$3,$4,$5)`, [uid(), String(body.videoId), u.id, text, Date.now()]);
    return ok();
  }

  // Chaînes
  if (a === 'channels') {
    const u = needMe();
    if (method === 'POST' && !b) {
      const name = String(body.name || '').trim().slice(0, 60);
      if (!name) fail(400, 'Donne un nom à ta chaîne.');
      const id = uid();
      await sql(`insert into channels (id, owner_id, name, hue, created_at) values ($1,$2,$3,$4,$5)`, [id, u.id, name, Math.floor(Math.random() * 360), Date.now()]);
      return ok({ id });
    }
    if (b) await ownsChannel(sql, u, b);
    if (method === 'PATCH' && b) {
      if (typeof body.name === 'string' && body.name.trim()) await sql(`update channels set name = $1 where id = $2`, [body.name.trim().slice(0, 60), b]);
      if (typeof body.desc === 'string') await sql(`update channels set descr = $1 where id = $2`, [body.desc.trim().slice(0, 2000), b]);
      for (const kind of ['avatar', 'banner'] as const) {
        if (!(kind in body)) continue;
        const old = (await sql(`select ${kind} from channels where id = $1`, [b]))[0]?.[kind] as string | undefined;
        let url: string | null = null;
        if (body[kind]) {
          const { buf, type } = dataUrlToBuffer(String(body[kind]));
          url = await putFile(`images/${b}-${kind}.jpg`, buf, type);
        }
        await sql(`update channels set ${kind} = $1 where id = $2`, [url, b]);
        await delFiles([old]);
      }
      return ok();
    }
    if (method === 'DELETE' && b && c === 'videos') return ok({ deleted: await deleteVideos(sql, 'channel_id = $1', [b]) });
    if (method === 'DELETE' && b && !c) {
      await deleteVideos(sql, 'channel_id = $1', [b]);
      const r = await sql(`delete from channels where id = $1 returning avatar, banner`, [b]);
      await delFiles([r[0]?.avatar as string, r[0]?.banner as string]);
      return ok();
    }
  }

  // Envoi direct d'un fichier vidéo vers Vercel Blob (jeton à usage unique).
  if (method === 'POST' && a === 'upload') {
    if (!BLOB_ON) fail(400, 'Stockage en ligne non configuré.');
    const { handleUpload } = await import('@vercel/blob/client');
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, payload) => {
        const p = JSON.parse(payload || '{}');
        const u = await currentUser(sql, new Request(req.url, { headers: { authorization: 'Bearer ' + (p.token || '') } }));
        if (!u) fail(401, 'Connecte-toi pour publier.');
        if (!pathname.startsWith('videos/')) fail(400, 'Chemin invalide.');
        return { allowedContentTypes: ['video/*'], maximumSizeInBytes: 4 * 1024 ** 3, addRandomSuffix: true };
      },
    });
    return Response.json(json);
  }

  // Envoi local (développement seulement).
  if (method === 'PUT' && a === 'local-upload') {
    if (BLOB_ON) fail(404, 'Introuvable.');
    needMe();
    const buf = Buffer.from(await req.arrayBuffer());
    return ok({ url: await putFile(`videos/${uid()}.${String(new URL(req.url).searchParams.get('ext') || 'mp4').replace(/\W/g, '')}`, buf, 'video/mp4') });
  }

  // Vidéos
  if (a === 'videos') {
    const u = needMe();
    if (method === 'POST' && !b) {
      const channelId = String(body.channelId || '');
      await ownsChannel(sql, u, channelId);
      const fileUrl = String(body.fileUrl || '');
      const okUrl = BLOB_ON ? /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/videos\//.test(fileUrl) : fileUrl.startsWith('/files/videos/');
      if (!okUrl) fail(400, 'Fichier vidéo invalide.');
      const title = String(body.title || '').trim().slice(0, 120);
      if (!title) fail(400, 'Donne un titre à ta vidéo.');
      const visibility = VIS.includes(body.visibility) ? body.visibility : 'Public';
      const cat = CATS.includes(body.cat) ? body.cat : 'Tech';
      const id = uid();
      let thumb: string | null = null;
      if (body.thumb) {
        const { buf, type } = dataUrlToBuffer(String(body.thumb));
        thumb = await putFile(`thumbs/${id}.jpg`, buf, type);
      }
      const ch = await sql(`select hue from channels where id = $1`, [channelId]);
      await sql(
        `insert into videos (id, channel_id, title, descr, cat, duration, width, height, visibility, created_at, views, hue, thumb, file_url, size, type)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12,$13,$14,$15)`,
        [
          id, channelId, title, String(body.desc || '').trim().slice(0, 5000), cat,
          Math.max(0, Number(body.duration) || 0), Math.round(Number(body.width) || 0), Math.round(Number(body.height) || 0),
          visibility, Math.min(Date.now(), Number(body.createdAt) || Date.now()), (num(ch[0]?.hue) + Math.floor(Math.random() * 45)) % 360, thumb, fileUrl,
          Math.round(Number(body.size) || 0), String(body.type || 'video/mp4').slice(0, 60),
        ],
      );
      return ok({ id });
    }
    if (method === 'DELETE' && b) {
      const n = await deleteVideos(sql, 'id = $1 and channel_id in (select id from channels where owner_id = $2)', [b, u.id]);
      if (!n) fail(403, 'Ce n’est pas ta vidéo.');
      return ok();
    }
  }

  return fail(404, 'Introuvable.');
}

export async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.searchParams.get('p') ?? url.pathname.replace(/^\/api\/?/, '');
  try {
    return await route(req, p.split('/').filter(Boolean));
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: 'Erreur du serveur. Réessaie dans un instant.' }, { status: 500 });
  }
}

export default { fetch: handle };
