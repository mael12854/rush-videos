import { useEffect, useState } from 'react';
import { CATS, plural } from '../lib/format';
import { useDerived, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { Avatar, Duration, SubButton, metaLine, openVideo, thumbStyle } from '../components/ui';

export default function Search({ q, mobile }: { q: string; mobile: boolean }) {
  const { data, dark } = useStore();
  const { channel, subsCount, newest } = useDerived();
  const [local, setLocal] = useState(q);
  useEffect(() => setLocal(q), [q]);

  const qq = q.trim().toLowerCase();
  const res = qq
    ? data!.videos.filter((v) => v.visibility === 'Public')
        .filter((v) => (v.title + ' ' + (channel(v.channelId)?.name || '') + ' ' + v.cat).toLowerCase().includes(qq)).sort(newest)
    : [];
  const chRes = qq ? data!.channels.filter((c) => (c.name + ' ' + c.desc).toLowerCase().includes(qq)) : [];
  const go = (t: string) => navigate('/search' + (t.trim() ? '?q=' + encodeURIComponent(t.trim()) : ''), true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>
      {mobile && (
        <input
          value={local}
          autoFocus={!q}
          onChange={(e) => setLocal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go(local)}
          placeholder="Rechercher"
          enterKeyHint="search"
          style={{ height: 44, border: 0, outline: 0, borderRadius: 999, background: 'var(--surface2)', padding: '0 18px' }}
        />
      )}
      {qq && <span style={{ color: 'var(--muted)' }}>{res.length} vidéo{res.length > 1 ? 's' : ''} pour « {q.trim()} »</span>}
      {chRes.map((c) => (
        <div key={c.id} onClick={() => navigate(`/channel/${c.id}`)} style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 16, borderRadius: 16, background: 'var(--surface)', cursor: 'pointer', flexWrap: 'wrap' }}>
          <Avatar ch={c} size={72} font={22} />
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{plural(subsCount(c.id), 'abonné', 'abonnés')}</span>
            {c.desc && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{c.desc}</span>}
          </div>
          <SubButton chId={c.id} />
        </div>
      ))}
      {res.map((v) => {
        const ch = channel(v.channelId);
        return (
          <div key={v.id} className="h-fade85" onClick={() => openVideo(v)} style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(240px,360px) minmax(0,1fr)', gap: 18, cursor: 'pointer' }}>
            <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 14, ...thumbStyle(v, dark) }}>
              <Duration v={v} small />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, paddingTop: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{v.title}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{metaLine(v)}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--muted)' }}>
                <Avatar ch={ch} size={22} font={0} />
                {ch?.name}
              </span>
              <span className="clamp2" style={{ fontSize: 13, color: 'var(--muted)' }}>{v.desc || ch?.desc}</span>
            </div>
          </div>
        );
      })}
      {qq && res.length === 0 && chRes.length === 0 && <span style={{ color: 'var(--muted)' }}>Aucun résultat. Essaie un autre mot.</span>}
      {!qq && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontWeight: 700 }}>Idées de recherche</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATS.slice(1).map((t) => (
              <button key={t} onClick={() => go(t.toLowerCase())} style={{ height: 34, padding: '0 15px', borderRadius: 999, border: 0, background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600 }}>
                {t.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
