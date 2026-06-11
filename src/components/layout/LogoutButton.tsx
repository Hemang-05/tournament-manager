'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton({ isIconOnly = false }: { isIconOnly?: boolean }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      title="Logout"
      className={
        isIconOnly
          ? "p-2 text-gray-400 hover:text-white transition-colors rounded-lg flex items-center justify-center"
          : "flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-full p-2"
      }
    >
      <LogOut size={20} />
      {!isIconOnly && <span className="font-medium">Logout</span>}
    </button>
  );
}
