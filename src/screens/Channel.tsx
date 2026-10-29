import { useRef, useState } from 'react';
import { plural, thumbGradient } from '../lib/format';
import { isShort, useDerived, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { Avatar, Confirm, cropImage, Grid, ShortCard, SubButton, VideoCard, type ConfirmState } from '../components/ui';

export default function ChannelPage({ id }: { id: string }) {
  const { data, dark, ownsChannel, canSee, actions } = useStore();
  const { channel, subsCount, newest } = useDerived();
  const [tab, setTab] = useState<'videos' | 'shorts' | 'about'>('videos');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState('');
  const [imgErr, setImgErr] = useState('');
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const ch = channel(id);
  if (!ch) return <span style={{ color: 'var(--muted)' }}>Cette chaîne n’existe pas ou a été supprimée.</span>;

  const mine = ownsChannel(id);
  const all = data!.videos.filter((v) => v.channelId === id && canSee(v)).sort(newest);
  const vids = all.filter((v) => !isShort(v));
  const shorts = all.filter(isShort);
  const line = `${plural(subsCount(id), 'abonné', 'abonnés')} · ${plural(all.length, 'vidéo', 'vidéos')}`;
  const ownCount = data!.videos.filter((v) => v.channelId === id).length;
  const setImage = async (kind: 'avatar' | 'banner', file?: File) => {
    if (!file) return;
    setImgErr('');
    try {
      const url = kind === 'avatar' ? await cropImage(file, 256, 256) : await cropImage(file, 1920, 320);
      await actions.updateChannel(id, { [kind]: url });
    } catch (e) {
      setImgErr((e as Error).message);
    }
  };
  const overlayBtn = {
    height: 32, padding: '0 14px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13,
    background: 'rgba(8,8,10,0.62)', color: '#f2f2f3', backdropFilter: 'blur(6px)',
  } as const;
  const btn = { height: 40, padding: '0 18px', borderRadius: 999, border: 0, cursor: 'pointer', background: 'var(--surface2)' } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          position: 'relative', aspectRatio: '6/1', minHeight: 110, borderRadius: 18,
          background: ch.banner ? `center/cover no-repeat url(${ch.banner})` : thumbGradient(ch.hue, dark),
        }}
      >
        {mine && (
          <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 8 }}>
            {ch.banner && (
              <button style={overlayBtn} onClick={() => actions.updateChannel(id, { banner: undefined })}>
                Retirer
              </button>
            )}
            <button style={overlayBtn} onClick={() => bannerInput.current?.click()}>
              {ch.banner ? 'Changer la bannière' : 'Ajouter une bannière'}
            </button>
          </div>
        )}
      </div>
      {mine && (
        <>
          <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(e) => (setImage('banner', e.target.files?.[0]), (e.target.value = ''))} />
          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => (setImage('avatar', e.target.files?.[0]), (e.target.value = ''))} />
        </>
      )}
      {imgErr && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{imgErr}</span>}
      <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
        {mine ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 'none' }}>
            <div onClick={() => avatarInput.current?.click()} title="Changer l’icône" style={{ cursor: 'pointer' }}>
              <Avatar ch={ch} size={96} font={30} />
            </div>
            <span onClick={() => avatarInput.current?.click()} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer' }} className="h-text">
              {ch.avatar ? 'Changer l’icône' : 'Ajouter une icône'}
            </span>
          </div>
        ) : (
          <Avatar ch={ch} size={96} font={30} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>{ch.name}</span>
          <span style={{ color: 'var(--muted)' }}>{line}</span>
          {ch.desc && <span style={{ lineHeight: 1.5, maxWidth: 560 }}>{ch.desc}</span>}
        </div>
        {mine ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="h-bg-hover"
              style={{ ...btn, fontWeight: 600 }}
              onClick={() =>
                setConfirm({
                  title: 'Supprimer les vidéos ?',
                  text: ownCount ? `${ownCount} vidéo(s) de ${ch.name} seront supprimées définitivement.` : 'Cette chaîne n’a aucune vidéo à supprimer.',
                  run: () => actions.deleteChannelVideos(id),
                })
              }
            >
              Supprimer les vidéos
            </button>
            <button
              className="h-bg-hover"
              style={{ ...btn, fontWeight: 700, color: 'var(--danger)' }}
              onClick={() =>
                setConfirm({
                  title: 'Supprimer ma chaîne ?',
                  text: `${ch.name} et toutes ses vidéos seront supprimées définitivement.`,
                  run: async () => {
                    await actions.deleteChannel(id);
                    navigate('/profile', true);
                  },
                })
              }
            >
              Supprimer ma chaîne
            </button>
          </div>
        ) : (
          <SubButton chId={id} height={40} padding="0 22px" />
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)' }}>
        {([['Vidéos', 'videos'], ['Shorts', 'shorts'], ['À propos', 'about']] as const).map(([label, t]) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, color: tab === t ? 'var(--text)' : 'var(--muted)', borderBottom: `2px solid ${tab === t ? 'var(--text)' : 'transparent'}`, marginBottom: -1 }}
          >
            {label}
          </div>
        ))}
      </div>
      {tab === 'videos' &&
        (vids.length ? <Grid>{vids.map((v) => <VideoCard key={v.id} v={v} />)}</Grid> : <span style={{ color: 'var(--muted)' }}>Aucune vidéo pour l'instant.</span>)}
      {tab === 'shorts' && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {shorts.map((v) => <ShortCard key={v.id} v={v} width={170} />)}
          {shorts.length === 0 && <span style={{ color: 'var(--muted)' }}>Pas encore de Shorts sur cette chaîne.</span>}
        </div>
      )}
      {tab === 'about' && (
        <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 10, lineHeight: 1.6 }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>À propos</span>
          {editing ? (
            <>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Décris ta chaîne"
                style={{ minHeight: 110, border: 0, outline: 0, borderRadius: 12, background: 'var(--surface2)', padding: '12px 14px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    await actions.updateChannel(id, { desc: desc.trim() });
                    setEditing(false);
                  }}
                  style={{ height: 38, padding: '0 18px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, background: 'var(--accent)', color: 'var(--onaccent)' }}
                >
                  Enregistrer
                </button>
                <button onClick={() => setEditing(false)} style={{ height: 38, padding: '0 18px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: 'var(--surface2)' }}>
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <span>{ch.desc || (mine ? 'Ta chaîne n’a pas encore de description.' : 'Pas encore de description.')}</span>
              {mine && (
                <button
                  onClick={() => {
                    setDesc(ch.desc);
                    setEditing(true);
                  }}
                  style={{ alignSelf: 'flex-start', height: 36, padding: '0 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: 'var(--surface2)' }}
                >
                  Modifier la description
                </button>
              )}
            </>
          )}
          <span style={{ color: 'var(--muted)' }}>{line}</span>
        </div>
      )}
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
