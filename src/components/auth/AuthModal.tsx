'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp, signInWithProvider } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (result.error) {
      setError(result.error.message);
    } else {
      setEmail('');
      setPassword('');
    }
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(10, 15, 26, 0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
    >
      <div
        className="relative w-full max-w-[400px] mx-4 rounded-xl p-8"
        style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
      >
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-[#8899aa] hover:text-[#e2e8f0] transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-lg font-black text-white mb-1">
            THE <span style={{ color: '#00d4ff' }}>BITE</span> REPORT
          </div>
          <div className="text-sm" style={{ color: '#8899aa' }}>
            {mode === 'signin' ? 'Sign in to track your favorite boats' : 'Create an account to get started'}
          </div>
        </div>

        {/* Social login */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            onClick={() => signInWithProvider('google')}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium bg-white text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <button
            onClick={() => signInWithProvider('apple')}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium bg-black text-white hover:bg-gray-900 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e2a42' }} />
          <span className="text-xs" style={{ color: '#556677' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e2a42' }} />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            style={{ backgroundColor: '#0a0f1a', border: '1px solid #1e2a42', color: '#e2e8f0' }}
            onFocus={(e) => (e.target.style.borderColor = '#00d4ff')}
            onBlur={(e) => (e.target.style.borderColor = '#1e2a42')}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            style={{ backgroundColor: '#0a0f1a', border: '1px solid #1e2a42', color: '#e2e8f0' }}
            onFocus={(e) => (e.target.style.borderColor = '#00d4ff')}
            onBlur={(e) => (e.target.style.borderColor = '#1e2a42')}
          />

          {error && (
            <div className="text-sm text-red-400 text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}
          >
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="text-center mt-4 text-sm" style={{ color: '#8899aa' }}>
          {mode === 'signin' ? (
            <>Don&apos;t have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }} style={{ color: '#00d4ff' }}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(''); }} style={{ color: '#00d4ff' }}>Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
