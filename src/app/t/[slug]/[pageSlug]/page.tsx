import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Markdown from 'react-markdown';

export default async function TournamentCMSPage({
  params,
}: {
  params: { slug: string; pageSlug: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );

  // Fetch the tournament first to get its ID
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('slug', params.slug)
    .single();

  if (!tournament) notFound();

  // Fetch the CMS page by tournament_id and page slug
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('tournament_id', tournament.id)
    .eq('slug', params.pageSlug)
    .single();

  if (!page) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 sm:p-12 shadow-sm min-h-[400px]">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
          {page.title}
        </h1>
        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-[#00D084] hover:prose-a:text-[#00B875]">
          <Markdown>{page.content}</Markdown>
        </div>
      </div>
    </div>
  );
}
