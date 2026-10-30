import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CATS, thumbGradient } from '../lib/format';
import { uploadVideo, useStore, type Visibility } from '../lib/store';
import { navigate } from '../lib/router';
import { Avatar, Pill } from '../components/ui';

const MAX = 4 * 1024 ** 3;
const ACCEPT = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v';

type Meta = { duration: number; width: number; height: number; thumb?: string };

// Lit durée, dimensions et capture une miniature.
function readMeta(file: File): Promise<Meta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.muted = true;
    el.playsInline = true;
    el.preload = 'auto';
    let meta: Meta | null = null;
    const done = (thumb?: string) => {
      URL.revokeObjectURL(url);
      if (meta) resolve({ ...meta, thumb });
    };
    const timer = setTimeout(() => (meta ? done() : (URL.revokeObjectURL(url), reject(new Error('Format vidéo non lu par ce navigateur.')))), 15000);
    el.onloadedmetadata = () => {
      const duration = isFinite(el.duration) ? el.duration : 0;
      meta = { duration, width: el.videoWidth, height: el.videoHeight };
      el.currentTime = Math.min(1, duration / 3 || 0);
    };
    el.onseeked = () => {
      clearTimeout(timer);
      try {
        const w = Math.min(640, el.videoWidth || 640);
        const h = Math.round((w * (el.videoHeight || 360)) / (el.videoWidth || 640));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d')!.drawImage(el, 0, 0, w, h);
        done(c.toDataURL('image/jpeg', 0.78));
      } catch {
        done();
      }
    };
    el.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error('Format vidéo non lu par ce navigateur.'));
    };
    el.src = url;
  });
}

const label = { display: 'flex', flexDirection: 'column', gap: 8 } as CSSProperties;
const field = { border: 0, outline: 0, borderRadius: 12, background: 'var(--surface2)' } as CSSProperties;

export default function Upload() {
  const { data, user, dark, actions } = useStore();
  const myCh = data!.channels.filter((c) => c.ownerId === user!.id);
  const [stage, setStage] = useState<'pick' | 'form' | 'done'>('pick');
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Tech');
  const [vis, setVis] = useState<Visibility>('Public');
  const [chId, setChId] = useState(myCh[0]?.id || '');
  const [pct, setPct] = useState(0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ size: number; type: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ id: string; channelId: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const job = useRef(0);

  // Si la chaîne choisie disparaît, prendre la première restante.
  useEffect(() => {
    if (!myCh.some((c) => c.id === chId)) setChId(myCh[0]?.id || '');
  }, [myCh, chId]);

  useEffect(() => () => abort.current?.abort(), []);

  const reset = () => {
    job.current++;
    abort.current?.abort();
    setStage('pick');
    setTitle('');
    setDesc('');
    setPct(0);
    setFileUrl(null);
    setMeta(null);
    setErr('');
  };

  const take = (file?: File | null) => {
    if (!file) return;
    setErr('');
    if (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) return setErr('Choisis un fichier vidéo (MP4, MOV ou WebM).');
    if (file.size > MAX) return setErr('Fichier trop lourd : 4 Go maximum.');
    const my = ++job.current;
    setStage('form');
    setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim());
    setPct(0);
    setFileUrl(null);
    setMeta(null);
    setFileInfo({ size: file.size, type: file.type || 'video/mp4' });
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    readMeta(file)
      .then((m) => my === job.current && setMeta(m))
      .catch((e) => {
        if (my !== job.current) return;
        ctl.abort();
        setErr(e.message);
        setStage('pick');
      });
    uploadVideo(file, file.name, data!.storage, (p) => my === job.current && setPct(Math.min(p, 99)), ctl.signal)
      .then((url) => {
        if (my !== job.current) return;
        setFileUrl(url);
        setPct(100);
      })
      .catch((e) => {
        if (my !== job.current || ctl.signal.aborted) return;
        setErr('L’envoi a échoué : ' + ((e as Error).message || 'réessaie.'));
        setStage('pick');
      });
  };

  const valid = myCh.some((c) => c.id === chId);
  const can = pct >= 100 && !!fileUrl && !!meta && title.trim() !== '' && valid && !busy;
  const publish = async () => {
    if (!can) return;
    setBusy(true);
    try {
      const id = await actions.publish({ channelId: chId, title, desc, cat, visibility: vis, fileUrl: fileUrl!, ...fileInfo!, ...meta! });
      setLast({ id, channelId: chId });
      setStage('done');
    } catch (e) {
      setErr((e as Error).message || 'Échec de la publication.');
    } finally {
      setBusy(false);
    }
  };

  if (myCh.length === 0 && stage !== 'done')
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>Publier une vidéo</span>
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Crée d’abord une chaîne.</span>
          <span style={{ color: 'var(--muted)' }}>Chaque vidéo est publiée sur une de tes chaînes.</span>
          <button onClick={() => navigate('/profile')} style={{ height: 40, padding: '0 20px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, background: 'var(--accent)', color: 'var(--onaccent)' }}>
            Créer une chaîne
          </button>
        </div>
      </div>
    );

  const preview: CSSProperties = meta?.thumb
    ? { backgroundImage: `url(${meta.thumb})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundColor: '#0c0d0f' }
    : { background: thumbGradient(32, dark) };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>Publier une vidéo</span>
      {err && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{err}</span>}
      {stage === 'pick' && (
        <div
          className="h-bg-surface"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            take(e.dataTransfer.files[0]);
          }}
          style={{
            border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 20, padding: '64px 24px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'center', background: drag ? 'var(--surface)' : 'transparent',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700 }}>Glisse ta vidéo ici</span>
          <span style={{ color: 'var(--muted)' }}>MP4, MOV ou WebM · jusqu'à 4 Go</span>
          <span style={{ height: 40, padding: '0 20px', borderRadius: 999, background: 'var(--accent)', color: 'var(--onaccent)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>Choisir un fichier</span>
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              take(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      )}
      {stage === 'form' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 28, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Pas de <label> autour des boutons de chaîne : sinon tous les clics vont au premier. */}
            <div style={label}>
              <span style={{ fontWeight: 600 }}>Chaîne</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {myCh.map((c) => (
                  <Pill key={c.id} on={chId === c.id} onClick={() => setChId(c.id)} style={{ padding: '0 14px 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar ch={c} size={24} font={0} />
                    {c.name}
                  </Pill>
                ))}
              </div>
            </div>
            <label style={label}>
              <span style={{ fontWeight: 600 }}>Titre</span>
              <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} style={{ ...field, height: 46, padding: '0 14px' }} />
            </label>
            <label style={label}>
              <span style={{ fontWeight: 600 }}>Description</span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Raconte de quoi parle ta vidéo"
                style={{ ...field, minHeight: 120, padding: '12px 14px', resize: 'vertical' }}
              />
            </label>
            <div style={label}>
              <span style={{ fontWeight: 600 }}>Catégorie</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATS.slice(1).map((c) => (
                  <Pill key={c} on={cat === c} onClick={() => setCat(c)}>
                    {c}
                  </Pill>
                ))}
              </div>
            </div>
            <div style={label}>
              <span style={{ fontWeight: 600 }}>Visibilité</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['Public', 'Non répertoriée', 'Privée'] as Visibility[]).map((o) => (
                  <Pill key={o} on={vis === o} onClick={() => setVis(o)}>
                    {o}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface)', borderRadius: 18, padding: 14 }}>
            <div style={{ aspectRatio: '16/9', borderRadius: 12, ...preview }} />
            <div style={{ height: 4, borderRadius: 2, background: 'var(--surface2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{pct < 100 || !fileUrl ? `Envoi… ${pct} %` : meta ? 'Vidéo prête' : 'Analyse de la vidéo…'}</span>
            <button
              onClick={publish}
              style={{ height: 44, borderRadius: 999, border: 0, cursor: can ? 'pointer' : 'default', fontWeight: 700, background: can ? 'var(--accent)' : 'var(--surface2)', color: can ? 'var(--onaccent)' : 'var(--muted)' }}
            >
              {busy ? 'Publication…' : 'Publier'}
            </button>
            <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>Aucune pub ne sera ajoutée à ta vidéo.</span>
            <button onClick={reset} style={{ height: 36, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: 'transparent', color: 'var(--muted)' }} className="h-text">
              Changer de fichier
            </button>
          </div>
        </div>
      )}
      {stage === 'done' && last && (
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700 }}>C'est en ligne.</span>
          <span style={{ color: 'var(--muted)' }}>Ta vidéo est publiée sur {data!.channels.find((c) => c.id === last.channelId)?.name}.</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/watch/${last.id}`)}
              style={{ height: 40, padding: '0 20px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, background: 'var(--accent)', color: 'var(--onaccent)' }}
            >
              Voir la vidéo
            </button>
            <button onClick={reset} style={{ height: 40, padding: '0 20px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: 'var(--surface2)' }}>
              En publier une autre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
