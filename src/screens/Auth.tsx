import { useState, type CSSProperties, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import { goBackOr, navigate } from '../lib/router';

const field: CSSProperties = { height: 46, border: 0, outline: 0, borderRadius: 12, background: 'var(--surface2)', padding: '0 14px' };
const label: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };

export default function Auth({ mode, reason }: { mode: 'login' | 'signup'; reason?: string }) {
  const { actions } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';
  const onLoginPage = location.pathname === '/login' || location.pathname === '/signup';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (signup) await actions.signUp(name, email, pw);
      else await actions.signIn(email, pw);
      if (onLoginPage) goBackOr('/');
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{signup ? 'Créer un compte' : 'Se connecter'}</span>
          <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{reason || (signup ? 'Une chaîne à ton nom est créée avec ton compte.' : 'Content de te revoir sur Rush.')}</span>
        </div>
        {signup && (
          <label style={label}>
            <span style={{ fontWeight: 600 }}>Nom</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={field} />
          </label>
        )}
        <label style={label}>
          <span style={{ fontWeight: 600 }}>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={field} />
        </label>
        <label style={label}>
          <span style={{ fontWeight: 600 }}>Mot de passe</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} style={field} />
        </label>
        {err && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{err}</span>}
        <button type="submit" disabled={busy} style={{ height: 44, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, background: 'var(--accent)', color: 'var(--onaccent)', opacity: busy ? 0.7 : 1 }}>
          {busy ? '…' : signup ? 'Créer mon compte' : 'Se connecter'}
        </button>
        <span style={{ color: 'var(--muted)', textAlign: 'center' }}>
          {signup ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <a href={signup ? '/login' : '/signup'} onClick={(e) => (e.preventDefault(), navigate(signup ? '/login' : '/signup', onLoginPage))} style={{ fontWeight: 700 }}>
            {signup ? 'Se connecter' : 'Créer un compte'}
          </a>
        </span>
      </form>
    </div>
  );
}
