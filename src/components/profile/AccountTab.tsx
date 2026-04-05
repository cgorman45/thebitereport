'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

interface AccountTabProps {
  displayName: string;
  email: string;
  onSaveName: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export default function AccountTab({ displayName, email, onSaveName, onSignOut }: AccountTabProps) {
  const [nameValue, setNameValue] = useState(displayName);
  const [nameStatus, setNameStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [nameError, setNameError] = useState('');

  const [passwordResetStatus, setPasswordResetStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [passwordResetError, setPasswordResetError] = useState('');

  const [signOutLoading, setSignOutLoading] = useState(false);

  const nameChanged = nameValue !== displayName;
  const nameTrimmed = nameValue.trim();

  function validateName(value: string): string {
    if (value.trim().length === 0) return 'Display name cannot be empty.';
    if (value.trim().length > 50) return 'Display name must be 50 characters or fewer.';
    return '';
  }

  async function handleSaveName() {
    const validationError = validateName(nameValue);
    if (validationError) {
      setNameError(validationError);
      return;
    }
    setNameError('');
    setNameStatus('loading');
    try {
      await onSaveName(nameTrimmed);
      setNameStatus('success');
      setTimeout(() => setNameStatus('idle'), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setNameError(message);
      setNameStatus('error');
    }
  }

  async function handlePasswordReset() {
    setPasswordResetError('');
    setPasswordResetStatus('loading');
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email);
      if (error) throw error;
      setPasswordResetStatus('sent');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email. Please try again.';
      setPasswordResetError(message);
      setPasswordResetStatus('error');
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    try {
      await onSignOut();
    } finally {
      setSignOutLoading(false);
    }
  }

  const isSaveEnabled = nameChanged && nameStatus !== 'loading';

  return (
    <div className="flex flex-col gap-6">

      {/* Display Name */}
      <section
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2
          style={{
            color: '#e2e8f0',
            fontSize: 15,
            fontWeight: 700,
            margin: '0 0 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Display Name
        </h2>
        <p style={{ color: '#8899aa', fontSize: 13, margin: '0 0 16px' }}>
          This is how you appear to other users.
        </p>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={nameValue}
            onChange={(e) => {
              setNameValue(e.target.value);
              setNameError('');
              if (nameStatus === 'error' || nameStatus === 'success') setNameStatus('idle');
            }}
            maxLength={50}
            placeholder="Your display name"
            style={{
              flex: 1,
              padding: '9px 14px',
              fontSize: 15,
              backgroundColor: '#0a0f1a',
              border: `1px solid ${nameError ? '#ff4466' : '#1e2a42'}`,
              borderRadius: 8,
              color: '#e2e8f0',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSaveName}
            disabled={!isSaveEnabled}
            style={{
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: isSaveEnabled ? '#0a0f1a' : '#8899aa',
              backgroundColor: isSaveEnabled ? '#00d4ff' : '#1e2a42',
              border: 'none',
              borderRadius: 8,
              cursor: isSaveEnabled ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            {nameStatus === 'loading' ? 'Saving…' : 'Save'}
          </button>
        </div>

        {nameError && (
          <p style={{ color: '#ff4466', fontSize: 13, margin: '8px 0 0' }}>
            {nameError}
          </p>
        )}
        {nameStatus === 'success' && !nameError && (
          <p style={{ color: '#22c55e', fontSize: 13, margin: '8px 0 0' }}>
            Display name saved.
          </p>
        )}
      </section>

      {/* Email */}
      <section
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2
          style={{
            color: '#e2e8f0',
            fontSize: 15,
            fontWeight: 700,
            margin: '0 0 16px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Email
        </h2>

        <div
          style={{
            padding: '9px 14px',
            fontSize: 15,
            backgroundColor: '#0a0f1a',
            border: '1px solid #1e2a42',
            borderRadius: 8,
            color: '#8899aa',
            userSelect: 'text',
          }}
        >
          {email}
        </div>

        <p style={{ color: '#8899aa', fontSize: 12, margin: '8px 0 0' }}>
          Email is managed through your authentication provider.
        </p>
      </section>

      {/* Password */}
      <section
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2
          style={{
            color: '#e2e8f0',
            fontSize: 15,
            fontWeight: 700,
            margin: '0 0 16px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Password
        </h2>

        <div className="flex items-center gap-4">
          <span style={{ color: '#8899aa', fontSize: 18, letterSpacing: 3 }}>
            ••••••••
          </span>

          {passwordResetStatus !== 'sent' && (
            <button
              onClick={handlePasswordReset}
              disabled={passwordResetStatus === 'loading'}
              style={{
                padding: 0,
                fontSize: 13,
                fontWeight: 600,
                color: passwordResetStatus === 'loading' ? '#8899aa' : '#00d4ff',
                background: 'none',
                border: 'none',
                cursor: passwordResetStatus === 'loading' ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              {passwordResetStatus === 'loading' ? 'Sending…' : 'Change'}
            </button>
          )}
        </div>

        {passwordResetStatus === 'sent' && (
          <p style={{ color: '#22c55e', fontSize: 13, margin: '10px 0 0' }}>
            Password reset email sent!
          </p>
        )}
        {passwordResetStatus === 'error' && passwordResetError && (
          <p style={{ color: '#ff4466', fontSize: 13, margin: '10px 0 0' }}>
            {passwordResetError}
          </p>
        )}
      </section>

      {/* Sign Out */}
      <div style={{ paddingTop: 4 }}>
        <button
          onClick={handleSignOut}
          disabled={signOutLoading}
          style={{
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: signOutLoading ? '#8899aa' : '#ff4466',
            backgroundColor: 'transparent',
            border: `1px solid ${signOutLoading ? '#1e2a42' : '#ff4466'}`,
            borderRadius: 8,
            cursor: signOutLoading ? 'not-allowed' : 'pointer',
            opacity: signOutLoading ? 0.6 : 1,
            transition: 'opacity 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
        >
          {signOutLoading ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>

    </div>
  );
}
