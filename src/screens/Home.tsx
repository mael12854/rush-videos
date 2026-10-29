import { useState } from 'react';
import { CATS } from '../lib/format';
import { isShort, useDerived, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { Grid, ShortCard, VideoCard, useMobile } from '../components/ui';

export default function Home() {
  const { data } = useStore();
  const { newest } = useDerived();
  const mobile = useMobile();
  const [cat, setCat] = useState('Tout');
  const visible = data!.videos.filter((v) => v.visibility === 'Public').sort(newest);
  const filt = visible.filter((v) => !isShort(v) && (cat === 'Tout' || v.cat === cat));
  const shorts = visible.filter(isShort);
  const showShelf = cat === 'Tout' && shorts.length > 0;
  const empty = filt.length === 0 && !showShelf;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              flex: 'none', height: 34, padding: '0 15px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13.5,
              background: cat === c ? 'var(--inv)' : 'var(--surface2)', color: cat === c ? 'var(--oninv)' : 'var(--text)',
            }}
          >
            {c}
          </button>
        ))}
      </div>
      {filt.length > 0 && <Grid>{filt.slice(0, 8).map((v) => <VideoCard key={v.id} v={v} />)}</Grid>}
      {showShelf && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Shorts</span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>moins d'une minute</span>
          </div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
            {shorts.map((v) => <ShortCard key={v.id} v={v} width={mobile ? 150 : 190} />)}
          </div>
        </div>
      )}
      {filt.length > 8 && <Grid>{filt.slice(8).map((v) => <VideoCard key={v.id} v={v} />)}</Grid>}
      {empty &&
        (cat === 'Tout' && visible.length === 0 ? (
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>Aucune vidéo pour l’instant.</span>
            <span style={{ color: 'var(--muted)' }}>Rush vient d’ouvrir. Publie la première vidéo, sans aucune pub.</span>
            <button onClick={() => navigate('/upload')} style={{ height: 40, padding: '0 20px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, background: 'var(--accent)', color: 'var(--onaccent)' }}>
              Publier une vidéo
            </button>
          </div>
        ) : (
          <span style={{ color: 'var(--muted)' }}>Rien dans cette catégorie pour l'instant.</span>
        ))}
    </div>
  );
}
