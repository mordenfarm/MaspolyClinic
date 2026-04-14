
import React from 'react';
import Icon from './Icon';

interface HeaderProps {
  userName: string;
  userSubtitle: string;
  avatarUrl?: string;
  roleTag?: string;
  roleColor?: string;
  onLogout?: () => void;
  onNotificationClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  userName, 
  userSubtitle, 
  avatarUrl, 
  roleTag,
  roleColor = 'text-mPolyGreen',
  onLogout,
  onNotificationClick
}) => {
  return (
    <header className="h-12 lg:h-16 glass border-b border-black/5 flex items-center justify-between px-4 lg:px-6 z-40 card-shadow sticky top-0 shrink-0">
      <div className="flex items-center gap-2">
        <div className="hidden lg:flex w-9 h-9 bg-mPolyBlue rounded-full items-center justify-center text-white">
          <Icon name="mental" className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <h2 className="font-heading font-bold text-sm lg:text-lg text-neutral-900 leading-none">{userName}</h2>
          <p className="text-[10px] lg:text-xs text-neutral-400 font-medium mt-0.5">{userSubtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
         {onLogout && (
           <button 
             onClick={onLogout}
             className="lg:hidden w-8 h-8 flex items-center justify-center text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 transition-all active:scale-90"
             title="Logout"
           >
              <Icon name="power" className="w-3.5 h-3.5" />
           </button>
         )}

         <button 
           onClick={onNotificationClick}
           className="relative w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-black border border-neutral-100 hover:bg-neutral-50 transition-all"
         >
            <Icon name="bell" className="w-3.5 h-3.5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-600 rounded-full border border-white"></span>
         </button>
         <div className="hidden sm:block w-px h-6 bg-neutral-100 mx-1"></div>
         <div className="flex items-center gap-2 cursor-pointer group">
            <div className="text-right hidden sm:block">
               {roleTag && <p className="text-xs font-bold text-neutral-900 leading-none">{roleTag}</p>}
               <p className={`text-[10px] font-semibold mt-0.5 ${roleColor}`}>Verified Session</p>
            </div>
            <img 
              src={avatarUrl || `https://ui-avatars.com/api/?name=${userName}&background=163959&color=fff&bold=true`} 
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-full border border-neutral-100 shadow-sm group-hover:border-mPolyBlue transition-all" 
              alt="Profile" 
            />
         </div>
      </div>
    </header>
  );
};

// Fix: Export Header component as default
export default Header;