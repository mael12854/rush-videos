import { useEffect, useState, type ReactNode } from 'react';
import { useStore, useDerived } from './lib/store';
import { navigate, useRoute } from './lib/router';
import { Avatar, UserAvatar, useMobile } from './components/ui';
import Home from './screens/Home';
import Watch from './screens/Watch';
import ChannelPage from './screens/Channel';
import Search from './screens/Search';
import Subs from './screens/Subs';
import Upload from './screens/Upload';
import Profile from './screens/Profile';
import Shorts from './screens/Shorts';
import Auth from './screens/Auth';

function Logo({ width }: { width: string | number }) {
  return (
    <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 'none', width }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 0, height: 0, borderLeft: '10px solid var(--onaccent)', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 3 }} />
      </div>
      <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)' }}>rush</span>
    </div>
  );
}

function Header({ mobile, q, setQ }: { mobile: boolean; q: string; setQ: (s: string) => void }) {
  const { user, dark, actions } = useStore();
  const search = () => navigate('/search' + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : ''));
  const themeLabel = dark ? 'Clair' : 'Sombre';
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        height: 'calc(64px + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        paddingLeft: `calc(${mobile ? 16 : 20}px + env(safe-area-inset-left))`,
        paddingRight: `calc(${mobile ? 16 : 20}px + env(safe-area-inset-right))`,
        background: 'var(--head)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <Logo width={mobile ? 'auto' : 212} />
      {!mobile ? (
        <>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 580, height: 42, borderRadius: 999, background: 'var(--surface2)', padding: '0 5px 0 20px' }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Rechercher"
                aria-label="Rechercher"
                style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent' }}
              />
              <button onClick={search} style={{ height: 32, border: 0, borderRadius: 999, background: 'var(--hover)', padding: '0 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Chercher
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <button
              className="h-text"
              onClick={actions.toggleTheme}
              style={{ height: 38, padding: '0 12px', borderRadius: 999, border: 0, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600 }}
            >
              {themeLabel}
            </button>
            <button
              onClick={() => navigate('/upload')}
              style={{ height: 38, padding: '0 18px', borderRadius: 999, border: 0, background: 'var(--accent)', color: 'var(--onaccent)', fontWeight: 700, cursor: 'pointer' }}
            >
              Publier
            </button>
            {user ? (
              <div onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title={user.name}>
                <UserAvatar name={user.name} size={38} font={13} />
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{ height: 38, padding: '0 16px', borderRadius: 999, border: 0, background: 'var(--surface2)', fontWeight: 600, cursor: 'pointer' }}
              >
                Se connecter
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => navigate('/search')}
            style={{ height: 36, padding: '0 14px', borderRadius: 999, border: 0, background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            Chercher
          </button>
          <button
            onClick={actions.toggleTheme}
            style={{ height: 36, padding: '0 8px', border: 0, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            {themeLabel}
          </button>
        </>
      )}
    </header>
  );
}

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '22px 14px 8px' }}>{children}</div>
);

function Sidebar({ screen }: { screen: string }) {
  const { user } = useStore();
  const { channel } = useDerived();
  const item = (label: string, id: string, to: string) => {
    const on = screen === id;
    return (
      <div
        key={id}
        className="h-text"
        onClick={() => navigate(to)}
        style={{ display: 'flex', alignItems: 'center', height: 42, padding: '0 14px', borderRadius: 12, cursor: 'pointer', background: on ? 'var(--surface2)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: 600 }}
      >
        {label}
      </div>
    );
  };
  const subs = (user?.subs || []).map(channel).filter(Boolean);
  return (
    <nav style={{ flex: 'none', width: 236, position: 'sticky', top: 'calc(64px + env(safe-area-inset-top))', height: 'calc(100vh - 64px - env(safe-area-inset-top))', overflowY: 'auto', padding: '8px 12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {item('Accueil', 'home', '/')}
      {item('Shorts', 'shorts', '/shorts')}
      {item('Abonnements', 'subs', '/subs')}
      <SectionLabel>Vous</SectionLabel>
      {item('Mon compte', 'profile', '/profile')}
      {item('Publier une vidéo', 'upload', '/upload')}
      {subs.length > 0 && <SectionLabel>Abonnements</SectionLabel>}
      {subs.map((c) => (
        <div
          key={c!.id}
          className="h-sub"
          onClick={() => navigate(`/channel/${c!.id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, height: 40, padding: '0 14px', borderRadius: 12, cursor: 'pointer', color: 'var(--muted)', fontWeight: 500 }}
        >
          <Avatar ch={c} size={22} font={9} />
          <span className="ellipsis">{c!.name}</span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ margin: '24px 2px 0', padding: 14, borderRadius: 14, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontWeight: 700 }}>Zéro pub.</span>
        <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>Ni avant, ni pendant, ni après la vidéo.</span>
      </div>
    </nav>
  );
}

function Tabs({ screen }: { screen: string }) {
  const tabs: [string, string, string][] = [
    ['Accueil', 'home', '/'],
    ['Shorts', 'shorts', '/shorts'],
    ['+', 'upload', '/upload'],
    ['Abonnements', 'subs', '/subs'],
    ['Vous', 'profile', '/profile'],
  ];
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        alignItems: 'center',
        background: 'var(--head)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--line)',
      }}
    >
      {tabs.map(([label, id, to]) => {
        const on = screen === id, plus = id === 'upload';
        return (
          <div key={id} onClick={() => navigate(to)} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: plus ? 'var(--onaccent)' : on ? 'var(--text)' : 'var(--muted)',
                background: plus ? 'var(--accent)' : 'transparent',
                padding: plus ? '6px 16px' : '6px 0',
                borderRadius: 999,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const { data, user } = useStore();
  const route = useRoute();
  const mobile = useMobile();
  const [q, setQ] = useState(route.query.get('q') || '');
  const [top, arg] = route.path;

  useEffect(() => {
    if (top === 'search') setQ(route.query.get('q') || '');
  }, [top, route.query]);

  if (!data) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;

  const screen =
    top === undefined ? 'home' : ['watch', 'channel', 'search', 'subs', 'upload', 'profile', 'shorts', 'login', 'signup'].includes(top) ? top : 'notfound';
  const needsAuth = ['subs', 'upload', 'profile'].includes(screen) && !user;

  let body: ReactNode;
  if (needsAuth) body = <Auth mode="login" reason="Connecte-toi pour continuer." />;
  else
    switch (screen) {
      case 'home':
        body = <Home />;
        break;
      case 'watch':
        body = <Watch key={arg} id={arg} />;
        break;
      case 'channel':
        body = <ChannelPage key={arg} id={arg} />;
        break;
      case 'search':
        body = <Search q={route.query.get('q') || ''} mobile={mobile} />;
        break;
      case 'subs':
        body = <Subs />;
        break;
      case 'upload':
        body = <Upload />;
        break;
      case 'profile':
        body = <Profile />;
        break;
      case 'shorts':
        body = <Shorts id={arg} mobile={mobile} />;
        break;
      case 'login':
      case 'signup':
        body = <Auth mode={screen} />;
        break;
      default:
        body = <span style={{ color: 'var(--muted)' }}>Cette page n’existe pas.</span>;
    }

  const mainPad = screen === 'shorts' ? (mobile ? '0 0 8px' : '0 28px 24px') : mobile ? '4px 16px 40px' : '8px 28px 64px';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        style={{
          maxWidth: mobile ? 440 : 'none',
          margin: '0 auto',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderLeft: mobile ? '1px solid var(--line)' : 0,
          borderRight: mobile ? '1px solid var(--line)' : 0,
        }}
      >
        <Header mobile={mobile} q={q} setQ={setQ} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {!mobile && <Sidebar screen={screen} />}
          <main style={{ flex: 1, minWidth: 0, padding: mainPad }}>{body}</main>
        </div>
        {mobile && <Tabs screen={screen} />}
      </div>
    </div>
  );
}
