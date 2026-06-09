'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Edit2, Trash2, Loader2, CheckCircle, Eye, FileEdit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function PagesClient({ tournamentId, initialPages }: any) {
  const [pages, setPages] = useState<any[]>(initialPages);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Modal editor states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  
  // Editor tabs
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setPages(initialPages);
  }, [initialPages]);

  // Auto-slug generator from Title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPage) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  const openEditor = (page: any = null) => {
    setEditingPage(page);
    setTitle(page?.title || '');
    setSlug(page?.slug || '');
    setContent(page?.content || '');
    setEditorTab('write');
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const closeEditor = () => {
    setIsModalOpen(false);
    setEditingPage(null);
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Basic slug format validation
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new Error('Slug can only contain lowercase letters, numbers, and hyphens (e.g. "rules-and-info").');
      }

      if (editingPage) {
        // Update existing page
        const { error: updErr } = await supabase
          .from('pages')
          .update({
            title,
            slug,
            content,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPage.id);

        if (updErr) throw updErr;
        setSuccess('Page updated successfully!');
      } else {
        // Insert new page
        const { error: insErr } = await supabase
          .from('pages')
          .insert({
            tournament_id: tournamentId,
            title,
            slug,
            content
          });

        if (insErr) {
          if (insErr.code === '23505') {
            throw new Error('A page with this URL slug already exists. Slugs must be unique.');
          }
          throw insErr;
        }
        setSuccess('Page created successfully!');
      }

      router.refresh();
      closeEditor();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: delErr } = await supabase
        .from('pages')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;

      setSuccess('Page deleted successfully!');
      setPages(prev => prev.filter(p => p.id !== id));
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete page.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notification Bar */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle size={18} className="text-green-600" /> {success}
        </div>
      )}

      {/* Main Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
            <FileText className="text-[#00D084]" /> Custom CMS Pages
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage content pages like rules, schedule details, or contact info.</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="bg-[#00D084] hover:bg-[#00B875] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#00D084]/20 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Create Page
        </button>
      </div>

      {/* CMS Pages List */}
      {pages.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="w-12 h-12 bg-slate-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900">No Custom Pages</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Create custom informational pages that will automatically appear in your public tournament website navigation.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600">Page Title</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">URL Slug</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Last Modified</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pages.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{p.title}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">/{p.slug}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(p.updated_at || p.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEditor(p)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit page"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePage(p.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete page"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-[#0A1628] text-white">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif' }}>
                  {editingPage ? 'Edit Content Page' : 'Create New Page'}
                </h2>
                <p className="text-xs text-gray-300">Markdown format is fully supported for page content.</p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="text-gray-400 hover:text-white font-bold text-xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Form Container */}
            <form onSubmit={handleSavePage} className="flex-1 flex flex-col min-h-0 bg-slate-50">
              {/* Basic Fields */}
              <div className="p-6 bg-white border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Page Title *</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={e => handleTitleChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40"
                    placeholder="e.g. Tournament Rules"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">URL Path Slug *</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-gray-400 font-mono text-xs select-none">/</span>
                    <input
                      required
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="w-full pl-6 pr-4 py-2 border border-gray-300 rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-[#00D084]/40"
                      placeholder="rules-and-regulations"
                    />
                  </div>
                </div>
              </div>

              {/* Tabs selector */}
              <div className="px-6 pt-3 bg-white border-b border-gray-200 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorTab('write')}
                    className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                      editorTab === 'write' ? 'border-[#00D084] text-slate-800' : 'border-transparent text-gray-400 hover:text-slate-600'
                    }`}
                  >
                    <FileEdit size={14} /> Edit Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('preview')}
                    className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                      editorTab === 'preview' ? 'border-[#00D084] text-slate-800' : 'border-transparent text-gray-400 hover:text-slate-600'
                    }`}
                  >
                    <Eye size={14} /> Preview Render
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 font-medium italic mb-3">Uses GitHub Flavored Markdown</span>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 min-h-0 p-6 flex flex-col">
                {editorTab === 'write' ? (
                  <textarea
                    required
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Write your page content in Markdown here... Use # for headings, ** for bold, - for lists, etc."
                    className="flex-1 w-full p-4 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#00D084]/40 font-mono text-sm resize-none shadow-inner"
                  />
                ) : (
                  <div className="flex-1 w-full bg-white border border-gray-300 rounded-xl p-6 overflow-y-auto max-h-[300px] md:max-h-none shadow-inner">
                    <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-[#00D084] hover:prose-a:text-[#00B875]">
                      {content ? (
                        <ReactMarkdown>{content}</ReactMarkdown>
                      ) : (
                        <span className="text-gray-400 italic text-sm">Nothing to preview. Type content in the editor first.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-6 border-t border-gray-200 bg-white flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#00D084] hover:bg-[#00B875] text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#00D084]/15"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Save Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
