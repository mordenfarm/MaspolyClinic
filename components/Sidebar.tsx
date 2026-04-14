
import React from 'react';
import Icon from './Icon';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
}

interface SidebarProps {
  activeId: string;
  items: NavItem[];
  onItemClick: (id: string) => void;
  onLogout: () => void;
  title: string;
  subtitle: string;
  logoIcon?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeId, 
  items, 
  onItemClick, 
  onLogout, 
  title, 
  subtitle,
  logoIcon 
}) => {
  return (
    <aside className="hidden lg:flex w-64 h-screen bg-mPolyBlue border-r border-white/10 flex-col z-50 shadow-2xl sticky top-0 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-white/10 gap-3 shrink-0">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-mPolyBlue shadow-lg">
           {logoIcon ? <Icon name={logoIcon} className="w-4 h-4" /> : <img src="https://i.ibb.co/B5GMcb9z/Gemini-Generated-Image-mmtbiymmtbiymmtb-removebg-preview.png" className="w-5" alt="Logo" />}
        </div>
        <div>
          <h1 className="font-heading font-bold text-base text-white leading-none">{title}</h1>
          <p className="text-[10px] text-white/40 font-bold mt-1 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={`flex items-center w-full px-4 py-3 font-bold transition-all group relative
              ${activeId === item.id 
                ? 'bg-white/10 text-white' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            {activeId === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-mPolyYellow"></div>
            )}
            <div className="w-6 h-6 flex items-center justify-center mr-3 text-white transition-all group-hover:scale-110">
              <Icon name={item.icon} className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold">{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-red-600 text-white text-[9px] font-black px-2 py-0.5 animate-pulse rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <button 
          onClick={onLogout}
          className="flex items-center w-full px-4 py-3 text-white/40 hover:bg-red-950/40 hover:text-red-400 font-bold transition-all text-sm"
        >
          <Icon name="power" className="w-4 h-4 mr-3 text-white" />
          Logout Session
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
