import { ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  wrapperClass?: string;
}

const positions: Record<string, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

export function Tooltip({ text, children, side = 'bottom', wrapperClass }: TooltipProps) {
  return (
    <div className={`group/tt relative ${wrapperClass ?? 'inline-flex'}`}>
      {children}
      <div
        className={`pointer-events-none absolute ${positions[side]} z-50 opacity-0 group-hover/tt:opacity-100 transition-opacity duration-150 delay-300`}
      >
        <div className="bg-gray-900 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-lg border border-white/10 whitespace-nowrap leading-none">
          {text}
        </div>
      </div>
    </div>
  );
}
