import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Channel, Video } from '../lib/db';
import { ago, avatarBg, fmtCount, fmtTime, initials, thumbGradient } from '../lib/format';
import { useDerived, useStore } from '../lib/store';
import { navigate } from '../lib/router';

export function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

export const useMobile = () => useWidth() < 760;

export function Avatar({ ch, size, font, style }: { ch?: Channel; size: number; font?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: ch ? avatarBg(ch.hue) : 'var(--surface2)',
        color: '#0e0f11',
        fontWeight: 700,
        fontSize: font ?? Math.round(size / 3),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {font === 0 ? null : ch ? initials(ch.name) : ''}
    </div>
  );
}

export function UserAvatar({ name, size, font, inv }: { name: string; size: number; font: number; inv?: boolean }) {
  return (
    <div
      style={{
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: inv ? 'var(--inv)' : 'var(--surface2)',
        color: inv ? 'var(--oninv)' : 'var(--text)',
        fontWeight: 700,
        fontSize: font,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials(name)}
    </div>
  );
}

export function thumbStyle(v: Video, dark: boolean): CSSProperties {
  return v.thumb
    ? { backgroundColor: '#0c0d0f', backgroundImage: `url(${v.thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: thumbGradient(v.hue, dark) };
}

export function Duration({ v, small }: { v: Video; small?: boolean }) {
  return (
    <span
      className="mono"
      style={{
        position: 'absolute',
        right: small ? 6 : 10,
        bottom: small ? 6 : 10,
        background: 'rgba(8,8,10,0.78)',
        color: '#f2f2f3',
        fontSize: small ? 10.5 : 11.5,
        fontWeight: 600,
        padding: small ? '2px 5px' : '3px 7px',
        borderRadius: small ? 5 : 6,
      }}
    >
      {fmtTime(v.duration)}
    </span>
  );
}

export const metaLine = (v: Video) => `${fmtCount(v.views)} vue${v.views > 1 ? 's' : ''} · ${ago(v.createdAt)}`;

export const openVideo = (v: Video) => navigate(`/watch/${v.id}`);
export const openChannel = (id: string) => navigate(`/channel/${id}`);

export function VideoCard({ v }: { v: Video }) {
  const { dark } = useStore();
  const { channel } = useDerived();
  const ch = channel(v.channelId);
  return (
    <div className="card" onClick={() => openVideo(v)} style={{ display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer', minWidth: 0 }}>
      <div className="thumb" style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', ...thumbStyle(v, dark) }}>
        <Duration v={v} />
        {v.visibility !== 'Public' && (
          <span style={{ position: 'absolute', left: 10, top: 10, background: 'rgba(8,8,10,0.78)', color: '#f2f2f3', fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 6 }}>
            {v.visibility}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar ch={ch} size={36} font={12} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div className="clamp2" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.32, letterSpacing: '-0.005em', textWrap: 'pretty' } as CSSProperties}>
            {v.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {ch?.name} · {metaLine(v)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Grid({ children, min = 270, gap = '36px 20px' }: { children: ReactNode; min?: number; gap?: string }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${min}px,1fr))`, gap }}>{children}</div>;
}

export function ShortCard({ v, width }: { v: Video; width: number | string }) {
  const { dark } = useStore();
  const { likesCount } = useDerived();
  return (
    <div onClick={() => navigate(`/shorts/${v.id}`)} style={{ flex: 'none', width, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
      <div style={{ aspectRatio: '9/16', borderRadius: 16, ...thumbStyle(v, dark) }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span className="clamp2" style={{ fontWeight: 600, lineHeight: 1.3 }}>
          {v.title}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtCount(likesCount(v.id))} j’aime</span>
      </div>
    </div>
  );
}

export const subBtn = (on: boolean) =>
  on ? { background: 'var(--surface2)', color: 'var(--text)', label: 'Abonné' } : { background: 'var(--inv)', color: 'var(--oninv)', label: 'S’abonner' };

export function SubButton({ chId, height = 38, padding = '0 18px' }: { chId: string; height?: number; padding?: string }) {
  const { user, actions } = useStore();
  const on = !!user?.subs.includes(chId);
  const b = subBtn(on);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!user) return navigate('/login');
        actions.toggleSub(chId);
      }}
      style={{ height, padding, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, background: b.background, color: b.color }}
    >
      {b.label}
    </button>
  );
}

export function Pill({
  on,
  onClick,
  children,
  height = 36,
  style,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height,
        padding: '0 14px',
        borderRadius: 999,
        border: 0,
        cursor: 'pointer',
        fontWeight: 600,
        background: on ? 'var(--inv)' : 'var(--surface2)',
        color: on ? 'var(--oninv)' : 'var(--text)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export const Muted = ({ children }: { children: ReactNode }) => <span style={{ color: 'var(--muted)' }}>{children}</span>;

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{children}</span>
);

export function Confirm({ title, text, onCancel, onConfirm }: { title: string; text: string; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onCancel]);
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', color: 'var(--text)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</span>
        <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{text}</span>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onCancel} style={{ height: 40, padding: '0 18px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: 'var(--surface2)' }}>
            Annuler
          </button>
          <button
            onClick={onConfirm}
            style={{ height: 40, padding: '0 18px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, background: 'var(--danger-btn)', color: '#fff' }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export type ConfirmState = { title: string; text: string; run: () => void } | null;
