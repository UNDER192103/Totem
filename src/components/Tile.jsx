import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapeamento de strings para componentes de ícone do Lucide
const IconComponent = ({ iconName, className }) => {
  const Icon = LucideIcons[iconName];
  if (!Icon) {
    return <LucideIcons.HelpCircle className={className} />;
  }
  return <Icon className={className} />;
};

const Tile = ({ app, isSelected, onClick }) => {
  console.log(app.gridPosition.col, app.gridPosition.row)

  return (
    <button
      key={app.id}
      type='button'
      onClick={onClick}
      className={cn(
        'rounded-lg',
        'cursor-pointer',
        'transition-all',
        'duration-200',
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'relative',
        'text-center',
        'hover:scale-[1.02]',
        'hover:shadow-xl',
        'w-full',
        'h-full',
        isSelected ? 'ring-4 ring-blue-500 scale-[1.02] shadow-2xl z-10' : 'shadow-md',
        'p-2 sm:p-3 lg:p-4'
      )}
      style={{
        gridColumn: `span ${app.width}`,
        gridRow: `span ${app.height}`,
        backgroundColor: app.background,
        color: app.color,
      }}
    >
      <IconComponent 
        iconName={app.Icon} 
        className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mb-1 sm:mb-2"
        strokeWidth={1.5} 
      />
      <span className="text-xs sm:text-sm lg:text-base font-semibold line-clamp-2" style={{ color: app.color }}>
        {app.Name}
      </span>
      
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
        </div>
      )}
    </button>
  );
};

export default Tile;
