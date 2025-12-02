import React, { useMemo } from 'react';
import katex from 'katex';

type MathDisplayProps = {
  latex: string;
  inline?: boolean;
  block?: boolean;
  label?: string;
  className?: string;
};

const MathDisplay: React.FC<MathDisplayProps> = ({
  latex,
  inline = false,
  block = false,
  label,
  className = '',
}) => {
  const displayMode = block || !inline;

  const rendered = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output: 'html',
      });
    } catch (err) {
      return '';
    }
  }, [latex, displayMode]);

  if (inline) {
    return (
      <span
        className={`inline-flex items-center align-baseline font-mono text-[1.05em] font-semibold text-current ${className}`}
        aria-label={latex}
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    );
  }

  const containerBase = 'my-4 p-4 rounded-xl text-center overflow-x-auto transition-all';
  const defaultTheme = 'bg-white border-l-4 border-amber-500 shadow-sm ring-1 ring-slate-900/5';
  const hasCustomBg = className.includes('bg-');
  const hasCustomText = className.includes('text-');

  return (
    <div className={`${containerBase} ${hasCustomBg ? '' : defaultTheme} ${className}`}>
      <div
        className={`${hasCustomText ? '' : 'text-slate-900 text-xl font-bold'} font-mono tracking-wide whitespace-nowrap`}
        aria-label={latex}
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
      {label && (
        <div className="mt-2 text-xs text-slate-500 font-sans font-medium uppercase tracking-wider opacity-90">
          {label}
        </div>
      )}
    </div>
  );
};

export default MathDisplay;
