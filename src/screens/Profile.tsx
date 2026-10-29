import { useState } from 'react';
import type { Video } from '../lib/db';
import { plural } from '../lib/format';
import { useDerived, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { Avatar, Grid, SectionTitle, UserAvatar, VideoCard } from '../components/ui';

export default function Profile() {
  const { data, user, actions, canOpen } = useStore();
  const { subsCount } = useDerived();
  const [newCh, setNewCh] = useState('');
  const u = user!;
  const myCh = data!.channels.filter((c) => c.ownerId === u.id).sort((a, b) => a.createdAt - b.createdAt);
  const myVideos = data!.videos.filter((v) => myCh.some((c) => c.id === v.channelId));
  const pick = (ids: string[]) => ids.map((id) => data!.videos.find((v) => v.id === id)).filter((v) => v && canOpen(v)) as Video[];
  const history = pick(u.history);
  const liked = pick(u.liked);
  const saved = pick(u.saved);
  const create = async () => {
    if (!newCh.trim()) return;
    await actions.createChannel(newCh);
    setNewCh('');
  };
  const stats: [number, string, string][] = [
    [myCh.length, 'chaîne', 'chaînes'],
    [myVideos.length, 'vidéo', 'vidéos'],
    [u.subs.length, 'abonnement', 'abonnements'],
    [history.length, 'vue récente', 'vues récentes'],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <UserAvatar name={u.name} size={84} font={26} inv />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>Mon compte</span>
          <span style={{ color: 'var(--muted)' }}>
            {u.name} · {u.email}
          </span>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: 'var(--muted)' }}>
            {stats.map(([n, one, many]) => (
              <span key={one}>
                <b style={{ color: 'var(--text)' }}>{n}</b> {n > 1 ? many : one}
              </span>
            ))}
          </div>
        </div>
        <button
          className="h-bg-hover"
          onClick={() => {
            actions.signOut();
            navigate('/', true);
          }}
          style={{ height: 38, padding: '0 18px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: 'var(--surface2)' }}
        >
          Se déconnecter
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle>Mes chaînes</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 14 }}>
          {myCh.map((c) => (
            <div
              key={c.id}
              className="h-bg-surface2"
              onClick={() => navigate(`/channel/${c.id}`)}
              style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16, borderRadius: 16, background: 'var(--surface)', cursor: 'pointer' }}
            >
              <Avatar ch={c} size={52} font={17} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span className="ellipsis" style={{ fontWeight: 700 }}>{c.name}</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  {plural(data!.videos.filter((v) => v.channelId === c.id).length, 'vidéo', 'vidéos')} · {plural(subsCount(c.id), 'abonné', 'abonnés')}
                </span>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 16, border: '1.5px dashed var(--line)' }}>
            <input
              value={newCh}
              maxLength={60}
              onChange={(e) => setNewCh(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Nom de la nouvelle chaîne"
              style={{ height: 38, border: 0, outline: 0, borderRadius: 10, background: 'var(--surface2)', padding: '0 12px' }}
            />
            <button
              onClick={create}
              style={{
                height: 38, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700,
                background: newCh.trim() ? 'var(--accent)' : 'var(--surface2)', color: newCh.trim() ? 'var(--onaccent)' : 'var(--muted)',
              }}
            >
              Créer une chaîne
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle>Historique</SectionTitle>
        {history.length ? (
          <Grid min={230} gap="28px 18px">{history.map((v) => <VideoCard key={v.id} v={v} />)}</Grid>
        ) : (
          <span style={{ color: 'var(--muted)' }}>Les vidéos que tu regardes apparaîtront ici.</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle>Vidéos aimées</SectionTitle>
        {liked.length ? (
          <Grid min={230} gap="28px 18px">{liked.map((v) => <VideoCard key={v.id} v={v} />)}</Grid>
        ) : (
          <span style={{ color: 'var(--muted)' }}>Les vidéos que tu aimes apparaîtront ici.</span>
        )}
      </div>
      {saved.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionTitle>Enregistrées</SectionTitle>
          <Grid min={230} gap="28px 18px">{saved.map((v) => <VideoCard key={v.id} v={v} />)}</Grid>
        </div>
      )}
    </div>
  );
}
