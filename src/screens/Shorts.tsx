import { useEffect, useRef, useState } from 'react';
import { fmtCount } from '../lib/format';
import { isShort, useDerived, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { Avatar, subBtn, thumbStyle } from '../components/ui';

export default function Shorts({ id, mobile }: { id?: string; mobile: boolean }) {
  const { data, user, dark, actions, ownsChannel } = useStore();
  const { channel, likesCount, newest } = useDerived();
  const list = data!.videos.filter((v) => isShort(v) && v.visibility === 'Public').sort(newest);
  const found = id ? list.findIndex((v) => v.id === id) : 0;
  const idx = Math.max(0, found);
  const sh = list[idx];
  const url = sh?.fileUrl;
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const viewed = useRef<string | null>(null);
  const touchY = useRef<number | null>(null);

  const go = (d: number) => {
    if (!list.length) return;
    const n = list[(idx + d + list.length) % list.length];
    navigate(`/shorts/${n.id}`, true);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  useEffect(() => {
    if (sh && viewed.current !== sh.id) {
      viewed.current = sh.id;
      actions.view(sh.id);
    }
  }, [sh?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (url && ref.current) ref.current.play().catch(() => setPaused(true));
  }, [url]);

  if (!sh)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '64px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>Pas encore de Shorts.</span>
        <span style={{ color: 'var(--muted)' }}>Un Short, c’est une vidéo verticale de moins d’une minute.</span>
        <button onClick={() => navigate('/upload')} style={{ height: 40, padding: '0 20px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, background: 'var(--accent)', color: 'var(--onaccent)' }}>
          Publier un Short
        </button>
      </div>
    );

  const ch = channel(sh.channelId);
  const liked = !!user?.liked.includes(sh.id);
  const sub = subBtn(!!user?.subs.includes(sh.channelId));
  const needLogin = () => navigate('/login');
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };
  const round = { width: 52, height: 52, borderRadius: '50%', border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 11 } as const;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, paddingTop: 8 }}>
        <div
          onClick={toggle}
          onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
          onTouchEnd={(e) => {
            if (touchY.current === null) return;
            const dy = e.changedTouches[0].clientY - touchY.current;
            touchY.current = null;
            if (Math.abs(dy) > 60) go(dy < 0 ? 1 : -1);
          }}
          style={{
            position: 'relative',
            height: mobile ? 'calc(100dvh - 140px - env(safe-area-inset-top) - env(safe-area-inset-bottom))' : 'calc(100vh - 100px)',
            aspectRatio: '9/16',
            maxWidth: '100%',
            borderRadius: mobile ? 0 : 20,
            overflow: 'hidden',
            cursor: 'pointer',
            ...thumbStyle(sh, dark),
          }}
        >
          {url && (
            <video
              key={sh.id}
              ref={ref}
              src={url}
              loop
              playsInline
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
            />
          )}
          {paused && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: '50%', background: 'rgba(242,242,243,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '18px solid #0c0d0f', borderTop: '11px solid transparent', borderBottom: '11px solid transparent', marginLeft: 5 }} />
            </div>
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '60px 76px 18px 16px', background: 'linear-gradient(transparent,rgba(0,0,0,0.65))', color: '#f2f2f3', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/channel/${sh.channelId}`);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700 }}
              >
                <Avatar ch={ch} size={30} font={0} />
                {ch?.name}
              </span>
              {!ownsChannel(sh.channelId) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user) return needLogin();
                    actions.toggleSub(sh.channelId);
                  }}
                  style={{ height: 30, padding: '0 12px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, background: '#f2f2f3', color: '#0c0d0f' }}
                >
                  {sub.label}
                </button>
              )}
            </div>
            <span style={{ fontWeight: 600, lineHeight: 1.35 }}>{sh.title}</span>
          </div>
          <div style={{ position: 'absolute', right: 12, bottom: 20, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => (user ? actions.toggleLike(sh.id) : needLogin())}
              style={{ ...round, background: liked ? 'var(--accent)' : 'var(--surface2)', color: liked ? 'var(--onaccent)' : 'var(--text)' }}
            >
              J'aime
            </button>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f2f2f3' }}>{fmtCount(likesCount(sh.id))}</span>
            <button
              onClick={async () => {
                const link = `${location.origin}/shorts/${sh.id}`;
                try {
                  if (navigator.share) await navigator.share({ title: sh.title, url: link });
                  else await navigator.clipboard.writeText(link);
                } catch {
                  /* annulé */
                }
              }}
              style={{ ...round, background: 'rgba(242,242,243,0.18)', color: '#f2f2f3' }}
            >
              Partager
            </button>
          </div>
        </div>
        {!mobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button onClick={() => go(-1)} aria-label="Précédent" style={{ width: 48, height: 48, borderRadius: '50%', border: 0, cursor: 'pointer', background: 'var(--surface2)', fontWeight: 700 }}>
              ↑
            </button>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {idx + 1} / {list.length}
            </span>
            <button onClick={() => go(1)} aria-label="Suivant" style={{ width: 48, height: 48, borderRadius: '50%', border: 0, cursor: 'pointer', background: 'var(--surface2)', fontWeight: 700 }}>
              ↓
            </button>
          </div>
        )}
      </div>
      {mobile && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '10px 0 0' }}>
          <button onClick={() => go(-1)} style={{ height: 38, padding: '0 16px', borderRadius: 999, border: 0, background: 'var(--surface2)', fontWeight: 600 }}>
            Précédent
          </button>
          <button onClick={() => go(1)} style={{ height: 38, padding: '0 16px', borderRadius: 999, border: 0, background: 'var(--surface2)', fontWeight: 600 }}>
            Suivant
          </button>
        </div>
      )}
    </>
  );
}
