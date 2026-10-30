import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { ago, fmtCount, fmtTime, plural } from '../lib/format';
import { isShort, useDerived, useStore, type Video } from '../lib/store';
import { navigate } from '../lib/router';
import { Avatar, Confirm, Duration, SubButton, UserAvatar, metaLine, openChannel, openVideo, thumbStyle, useWidth, useMobile, type ConfirmState } from '../components/ui';

function Player({ v }: { v: Video }) {
  const { dark } = useStore();
  const url = v.fileUrl;
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);
  const [t, setT] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const total = v.duration || 1;

  // Position fluide pendant la lecture.
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    const tick = () => {
      if (ref.current) setT(ref.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !url) return;
    el.play().catch(() => setPaused(true));
  }, [url]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => {});
    } else el.pause();
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const el = ref.current;
      if (!el) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') el.currentTime = Math.min(total, el.currentTime + 5);
      else if (e.key === 'ArrowLeft') el.currentTime = Math.max(0, el.currentTime - 5);
      setT(el.currentTime);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const seekStart = (e: RPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const bar = e.currentTarget;
    const at = (ev: { clientX: number }) => {
      const r = bar.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const time = p * total;
      setT(time);
      if (ref.current) ref.current.currentTime = time;
    };
    at(e);
    setSeeking(true);
    const mv = (ev: PointerEvent) => at(ev);
    const up = () => {
      setSeeking(false);
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const pct = ((Math.min(t, total) / total) * 100).toFixed(2) + '%';
  const barH = seeking ? 6 : 4;

  return (
    <div
      onClick={toggle}
      style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', ...thumbStyle(v, dark), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {url && (
        <video
          ref={ref}
          src={url}
          playsInline
          onPlay={() => setPaused(false)}
          onPause={() => {
            setPaused(true);
            if (ref.current) setT(ref.current.currentTime);
          }}
          onEnded={() => setPaused(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        />
      )}
      {paused && (
        <div style={{ position: 'relative', width: 76, height: 76, borderRadius: '50%', background: 'rgba(242,242,243,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 0, height: 0, borderLeft: '22px solid #0c0d0f', borderTop: '14px solid transparent', borderBottom: '14px solid transparent', marginLeft: 6 }} />
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 18px 14px', background: 'linear-gradient(transparent,rgba(0,0,0,0.6))', display: 'flex', flexDirection: 'column', gap: 10, color: '#f2f2f3' }}>
        <div onPointerDown={seekStart} onClick={(e) => e.stopPropagation()} style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: barH, borderRadius: 3, background: 'rgba(255,255,255,0.22)' }} />
          <div style={{ position: 'absolute', left: 0, width: pct, height: barH, borderRadius: 3, background: 'var(--accent)' }} />
          <div style={{ position: 'absolute', left: pct, width: 16, height: 16, marginLeft: -8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 3px rgba(0,0,0,0.25)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, fontWeight: 600 }}>
          <span>{paused ? 'Lecture' : 'Pause'}</span>
          <span className="mono" style={{ fontWeight: 400, opacity: 0.85 }}>
            {fmtTime(t)} / {fmtTime(v.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

const pillBtn = { height: 38, padding: '0 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: 'var(--surface2)' } as const;

export default function Watch({ id }: { id: string }) {
  const store = useStore();
  const { data, user, dark, actions, ownsChannel, canOpen } = store;
  const { channel, subsCount, likesCount, userById } = useDerived();
  const width = useWidth();
  const mobile = useMobile();
  const [descOpen, setDescOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [shared, setShared] = useState(false);
  const counted = useRef<string | null>(null);

  const v = data!.videos.find((x) => x.id === id);
  const ok = v && canOpen(v);

  useEffect(() => {
    if (ok && counted.current !== id) {
      counted.current = id;
      actions.view(id);
    }
  }, [id, ok]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!v || !ok) return <span style={{ color: 'var(--muted)' }}>Cette vidéo n’existe pas ou a été supprimée.</span>;

  const ch = channel(v.channelId);
  const mine = ownsChannel(v.channelId);
  const liked = !!user?.liked.includes(v.id);
  const saved = !!user?.saved.includes(v.id);
  const likes = likesCount(v.id);
  const comments = data!.comments.filter((c) => c.videoId === v.id).sort((a, b) => b.createdAt - a.createdAt);
  const desc = v.desc || 'Merci de regarder, sans aucune pub, comme toujours.';
  const firstLine = desc.split('\n')[0];
  const hasMore = desc !== firstLine;
  const upNext = data!.videos
    .filter((x) => x.id !== v.id && x.visibility === 'Public' && !isShort(x))
    .sort((a, b) => Number(b.channelId === v.channelId) - Number(a.channelId === v.channelId) || b.createdAt - a.createdAt)
    .slice(0, 10);
  const needLogin = () => navigate('/login');
  const post = () => {
    if (!user) return needLogin();
    if (!draft.trim()) return;
    actions.postComment(v.id, draft);
    setDraft('');
  };
  const share = async () => {
    const link = `${location.origin}/watch/${v.id}`;
    try {
      if (navigator.share && mobile) await navigator.share({ title: v.title, url: link });
      else await navigator.clipboard.writeText(link);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* annulé */
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: !mobile && width > 1180 ? 'minmax(0,1fr) 380px' : 'minmax(0,1fr)', gap: 28, alignItems: 'start', maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <Player key={v.id} v={v} />
        <h1 style={{ margin: '4px 0 0', fontSize: 22, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.02em', textWrap: 'pretty' } as CSSProperties}>{v.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div onClick={() => openChannel(v.channelId)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <Avatar ch={ch} size={42} font={14} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{ch?.name}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{plural(subsCount(v.channelId), 'abonné', 'abonnés')}</span>
            </div>
          </div>
          {!mine && <SubButton chId={v.channelId} />}
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => (user ? actions.toggleLike(v.id) : needLogin())}
              style={{ ...pillBtn, background: liked ? 'var(--inv)' : 'var(--surface2)', color: liked ? 'var(--oninv)' : 'var(--text)' }}
            >
              J’aime{likes ? ` · ${fmtCount(likes)}` : ''}
            </button>
            <button className="h-bg-hover" onClick={share} style={pillBtn}>
              {shared ? 'Lien copié' : 'Partager'}
            </button>
            <button className="h-bg-hover" onClick={() => (user ? actions.toggleSave(v.id) : needLogin())} style={pillBtn}>
              {saved ? 'Enregistrée' : 'Enregistrer'}
            </button>
            {mine && (
              <button
                className="h-bg-hover"
                onClick={() =>
                  setConfirm({
                    title: 'Supprimer cette vidéo ?',
                    text: `« ${v.title} » sera supprimée définitivement.`,
                    run: async () => {
                      await actions.deleteVideo(v.id);
                      navigate('/profile', true);
                    },
                  })
                }
                style={{ ...pillBtn, fontWeight: 700, color: 'var(--danger)' }}
              >
                Supprimer cette vidéo
              </button>
            )}
          </div>
        </div>
        <div
          onClick={() => hasMore && setDescOpen((x) => !x)}
          style={{ background: 'var(--surface)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, cursor: hasMore ? 'pointer' : 'default', lineHeight: 1.55 }}
        >
          <span style={{ fontWeight: 700 }}>
            {metaLine(v)}
            {v.cat ? ` · ${v.cat}` : ''}
            {v.visibility !== 'Public' ? ` · ${v.visibility}` : ''}
          </span>
          <span style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{descOpen ? desc : firstLine}</span>
          {hasMore && <span style={{ fontWeight: 700, color: 'var(--muted)' }}>{descOpen ? 'Moins' : 'Plus'}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {comments.length} commentaire{comments.length > 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <UserAvatar name={user?.name || '?'} size={36} font={12} />
            <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center', minWidth: 0, background: 'var(--surface)', borderRadius: 999, padding: '4px 4px 4px 18px' }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => !user && needLogin()}
                onKeyDown={(e) => e.key === 'Enter' && post()}
                placeholder={user ? 'Ajouter un commentaire…' : 'Connecte-toi pour commenter'}
                style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 0, padding: '8px 0' }}
              />
              <button
                onClick={post}
                style={{
                  flex: 'none', height: 34, padding: '0 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700,
                  background: draft.trim() ? 'var(--accent)' : 'var(--surface2)', color: draft.trim() ? 'var(--onaccent)' : 'var(--muted)',
                }}
              >
                Envoyer
              </button>
            </div>
          </div>
          {comments.map((c) => {
            const who = userById(c.userId)?.name || 'Compte supprimé';
            const on = c.likedByMe;
            return (
              <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                <UserAvatar name={who} size={36} font={12} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                    <b>{who}</b>
                    <span style={{ color: 'var(--muted)' }}>{ago(c.createdAt)}</span>
                  </span>
                  <span style={{ lineHeight: 1.5, overflowWrap: 'anywhere' }}>{c.text}</span>
                  <span
                    onClick={() => (user ? actions.toggleCommentLike(c.id) : needLogin())}
                    style={{ fontSize: 12.5, color: on ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', fontWeight: on ? 600 : 400 }}
                  >
                    {fmtCount(c.likes)} j'aime
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>À suivre</span>
        {upNext.length === 0 && <span style={{ color: 'var(--muted)' }}>Rien d’autre pour l’instant.</span>}
        {upNext.map((x) => (
          <div key={x.id} className="h-fade" onClick={() => openVideo(x)} style={{ display: 'flex', gap: 12, cursor: 'pointer' }}>
            <div style={{ position: 'relative', flex: 'none', width: 168, aspectRatio: '16/9', borderRadius: 10, ...thumbStyle(x, dark) }}>
              <Duration v={x} small />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span className="clamp2" style={{ fontWeight: 600, lineHeight: 1.3, fontSize: 14 }}>{x.title}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{channel(x.channelId)?.name}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{metaLine(x)}</span>
            </div>
          </div>
        ))}
      </div>
      {confirm && (
        <Confirm
          title={confirm.title}
          text={confirm.text}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const c = confirm;
            setConfirm(null);
            c.run();
          }}
        />
      )}
    </div>
  );
}
