'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CalendarDays, ClipboardList, Trophy, GitFork, FileText, Settings } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  dashboard: LayoutDashboard,
  teams: Users,
  fixtures: CalendarDays,
  results: ClipboardList,
  standings: Trophy,
  bracket: GitFork,
  pages: FileText,
  settings: Settings,
};

export default function AdminNav({ items }: { items: any[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 py-6 space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
        const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-[#00D084] text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            <IconComponent size={20} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
