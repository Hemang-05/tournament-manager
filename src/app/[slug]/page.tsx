import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Markdown from 'react-markdown';

export default async function CMSPage({ params }: { params: { slug: string } }) {
  const supabase = createServerClient();

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!page) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl md:text-5xl font-serif font-black text-gray-900 mb-8 tracking-tight">
        {page.title}
      </h1>
      <div className="prose prose-lg prose-green max-w-none prose-headings:font-bold prose-a:text-[#00D084] hover:prose-a:text-[#00B875]">
        <Markdown>{page.content}</Markdown>
      </div>
    </div>
  );
}
