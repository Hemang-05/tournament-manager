'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, Trophy } from 'lucide-react';

/* ───────── Slug utility ───────── */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default function AdminLogin() {
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resolvedUsername = slugify(slug);
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resolvedUsername, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Radial glow behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00D084]/5 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[400px]">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl shadow-black/20 p-8">
          {/* Logo + Heading */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00D084] to-[#00B871] shadow-lg shadow-[#00D084]/25">
                <Trophy className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              {/* Decorative ring */}
              <div className="absolute -inset-1 rounded-2xl border border-[#00D084]/20 pointer-events-none" />
            </div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Admin Login</h1>
            <p className="text-sm text-[#64748B] mt-1">Sign in to manage your tournaments</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="block text-sm font-semibold text-[#374151] mb-1.5">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-[#374151] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00D084] hover:bg-[#00B871] active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none shadow-sm shadow-[#00D084]/20 hover:shadow-md hover:shadow-[#00D084]/25"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mt-8 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#94A3B8] font-medium">Want to host a new tournament?</span>
            </div>
          </div>

          {/* Create account link */}
          <Link
            href="/admin/onboarding"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all group"
          >
            <span>Create a tournament</span>
            <svg className="h-3.5 w-3.5 text-[#94A3B8] group-hover:text-[#00D084] group-hover:translate-x-0.5 transition-all" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-[#475569]/50 mt-6">
          Tournament<span className="text-[#00D084]/60">Mgr</span> · Organiser Portal
        </p>
      </div>
    </div>
  );
}
