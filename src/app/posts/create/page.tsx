'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

export default function CreatePostPage() {
  const router = useRouter();
  const { user, token, isLoggedIn } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push('/account/signin');
    }
  }, [isLoggedIn, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) setAttachments([...attachments, await res.json()]);
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix = prefix) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    setContent(before + prefix + selection + suffix + after);
    textarea.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, attachments }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/posts/${data.id}`);
      } else {
        setError(data.error || 'Failed to publish post.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-12 animate-fade-in transform-gpu">
        <div className="flex items-center gap-6">
          <Link
            href="/posts"
            className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
          >
            <span className="material-icons">west</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
              Create Content<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Share your thoughts with the community.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="rounded-[40px] border border-white/[0.08] bg-white/[0.02] p-8 space-y-6 shadow-2xl backdrop-blur-xl">
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="What's on your mind?"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-xl font-bold text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5">
                <button
                  type="button"
                  onClick={() => insertMarkdown('**')}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                  title="Bold"
                >
                  <span className="material-icons text-sm">format_bold</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('_')}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                  title="Italic"
                >
                  <span className="material-icons text-sm">format_italic</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('### ')}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                  title="Heading"
                >
                  <span className="material-icons text-sm">title</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('- ')}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                  title="List"
                >
                  <span className="material-icons text-sm">format_list_bulleted</span>
                </button>
                <div className="h-4 w-px bg-white/10 mx-2" />
                <label
                  className={`cursor-pointer p-2 rounded-xl transition-all ${uploading ? 'opacity-30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <span className="material-icons text-sm">attach_file</span>
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                  {attachments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400"
                    >
                      <span className="material-icons text-xs">attachment</span>
                      {a.filename}
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <span className="material-icons text-[10px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                  Content (Markdown Supported)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  placeholder="Share reviews, feedback, or ideas..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-6 text-sm text-slate-300 outline-none focus:border-cyan-500 h-64 transition-all shadow-inner font-medium leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/posts"
              className="px-10 py-5 rounded-3xl border border-white/10 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-white transition-all active:scale-95"
            >
              Discard
            </Link>
            <button
              type="submit"
              disabled={loading || !title || !content}
              className="px-12 py-5 rounded-3xl bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-900/20 disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
