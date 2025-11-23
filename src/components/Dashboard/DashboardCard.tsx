import React from 'react';

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText: string;
  onClick: () => void;
  badge?: string;
  fullWidth?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  icon,
  title,
  description,
  actionText,
  onClick,
  badge,
  fullWidth = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-amber-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/10 text-left ${
        fullWidth ? 'col-span-full' : ''
      }`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all" />
      
      {badge && (
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-xs font-bold rounded-full shadow-lg">
            {badge}
          </span>
        </div>
      )}

      <div className="relative z-10 flex items-center gap-4 mb-3">
        <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg">
          {icon}
        </div>
      </div>

      <h3 className="relative z-10 text-xl font-bold text-white mb-2">{title}</h3>
      <p className="relative z-10 text-gray-400 text-sm mb-4">{description}</p>

      <div className="relative z-10 flex items-center text-amber-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
        {actionText}
        <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};
