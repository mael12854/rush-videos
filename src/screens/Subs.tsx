import { useDerived, useStore, isShort } from '../lib/store';
import { navigate } from '../lib/router';
import { Avatar, Grid, VideoCard } from '../components/ui';

export default function Subs() {
  const { data, user } = useStore();
  const { channel, newest } = useDerived();
  const chans = user!.subs.map(channel).filter(Boolean);
  const vids = data!.videos.filter((v) => user!.subs.includes(v.channelId) && v.visibility === 'Public' && !isShort(v)).sort(newest);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', gap: 22, overflowX: 'auto', paddingBottom: 4 }}>
        {chans.map((c) => (
          <div key={c!.id} onClick={() => navigate(`/channel/${c!.id}`)} style={{ flex: 'none', width: 84, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Avatar ch={c} size={64} font={18} />
            <span style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.25 }}>{c!.name}</span>
          </div>
        ))}
      </div>
      {chans.length === 0 ? (
        <span style={{ color: 'var(--muted)' }}>Tu n'es abonné(e) à aucune chaîne pour l'instant.</span>
      ) : (
        <>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Dernières vidéos</span>
          <Grid>{vids.map((v) => <VideoCard key={v.id} v={v} />)}</Grid>
          {vids.length === 0 && <span style={{ color: 'var(--muted)' }}>Aucune vidéo pour l'instant.</span>}
        </>
      )}
    </div>
  );
}
