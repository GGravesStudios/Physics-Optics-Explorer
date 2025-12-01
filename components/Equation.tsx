import React from 'react';

interface EquationProps {
  latex: string;
  inline?: boolean;
  label?: string;
  className?: string;
}

const cleanLatex = (latex: string) => {
  let s = latex;

  // 1. Initial cleanup
  s = s.replace(/\\[,;!:]/g, ' '); // Remove spacing commands
  s = s.replace(/\\ /g, ' ');      // Escaped spaces
  s = s.replace(/\s+/g, ' ');      // Normalize whitespace
  s = s.replace(/\\left/g, '');    // Remove \left
  s = s.replace(/\\right/g, '');   // Remove \right
  s = s.replace(/\\mathrm/g, '');  // Remove \mathrm
  s = s.replace(/\\mathbf/g, '');  // Remove \mathbf

  // 2. Global Symbol Map
  const map: Record<string, string> = {
    '\\lambda': 'λ', '\\theta': 'θ', '\\delta': 'δ', '\\Delta': 'Δ',
    '\\mu': 'μ', '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ',
    '\\pi': 'π', '\\rho': 'ρ', '\\sigma': 'σ', '\\phi': 'φ', '\\psi': 'ψ',
    '\\omega': 'ω', '\\Omega': 'Ω', '\\epsilon': 'ε', '\\tau': 'τ',
    '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan',
    '\\arcsin': 'arcsin', '\\arccos': 'arccos', '\\arctan': 'arctan',
    '\\ln': 'ln', '\\log': 'log',
    '\\approx': '≈', '\\cdot': '·', '\\times': '×',
    '\\le': '≤', '\\ge': '≥', '\\pm': '±', '\\mp': '∓',
    '\\infty': '∞', '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←',
    '\\degree': '°', '\\circ': '°',
    '\\int': '∫', '\\oint': '∮', '\\sum': 'Σ', '\\partial': '∂',
    '\\nabla': '∇',
  };

  // Apply symbol map - Sort by length desc to avoid prefix matching issues
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    s = s.split(key).join(map[key]);
  }

  // 3. Subscript/Superscript Maps
  const subMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', 
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 
    'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 
    'v': 'ᵥ', 'x': 'ₓ'
  };
  
  const supMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ'
  };

  const toSub = (str: string) => str.split('').map(c => subMap[c] || c).join('');
  const toSup = (str: string) => str.split('').map(c => supMap[c] || c).join('');

  // 4. Iterative Structural Resolution
  let oldS;
  let loops = 0;
  const maxLoops = 10; 

  do {
    oldS = s;
    loops++;

    // a. Text: \text{something} -> something
    s = s.replace(/\\text\s*\{([^{}]+)\}/g, '$1');

    // b. Sqrt: \sqrt{something} -> √(something)
    s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)');
    s = s.replace(/\\sqrt\s*\[([^{}]+)\]\s*\{([^{}]+)\}/g, 'root($1, $2)');

    // c. Fractions: \frac{a}{b} -> (a)/(b)
    s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)');

    // d. Subscripts with braces
    s = s.replace(/_\{([^{}]+)\}/g, (_, inner) => {
        const chars = inner.split('');
        const allMapped = chars.every((c: string) => subMap[c]);
        return allMapped ? toSub(inner) : `_${inner}`; 
    });

    // e. Superscripts with braces
    s = s.replace(/\^\{([^{}]+)\}/g, (_, inner) => {
        if (inner === '°') return '°';
        const chars = inner.split('');
        const allMapped = chars.every((c: string) => supMap[c]);
        return allMapped ? toSup(inner) : `^(${inner})`;
    });

  } while (s !== oldS && loops < maxLoops);

  // 5. Single-char sub/sup without braces
  s = s.replace(/_([a-zA-Z0-9])/g, (_, char) => subMap[char] || `_${char}`);
  s = s.replace(/\^([a-zA-Z0-9])/g, (_, char) => supMap[char] || `^${char}`);

  // 6. Final Cleanup
  s = s.replace(/[{}]/g, ''); 
  s = s.replace(/\s+/g, ' ').trim();
  
  // 7. Cosmetic Polishing
  s = s.replace(/\(([a-zA-Z0-9\u0370-\u03FF]+)\)\/\(([a-zA-Z0-9\u0370-\u03FF]+)\)/g, '$1/$2');
  s = s.replace(/\^\(([\d\w])\)/g, '^$1');

  return s;
};

const Equation: React.FC<EquationProps> = ({ latex, inline = false, label, className = '' }) => {
  const cleanText = cleanLatex(latex);
  
  if (inline) {
    // High contrast styling for inline equations
    // Default to dark slate unless a specific text color is provided
    const defaultColor = className.includes('text-') ? '' : 'text-slate-900';
    
    return (
      <span 
        className={`font-mono font-bold inline-block mx-0.5 text-[1.05em] align-baseline ${defaultColor} ${className}`} 
        title={latex}
        aria-label={latex}
      >
        {cleanText}
      </span>
    );
  }

  // Block equations
  // Logic: Use provided class if it defines background/color, otherwise use default high-contrast card style.
  const hasCustomBg = className.includes('bg-');
  const hasCustomText = className.includes('text-');

  const containerBase = "my-4 p-4 rounded-xl text-center overflow-x-auto transition-all";
  // Default look: White card with amber accent border
  const defaultTheme = "bg-white border-l-4 border-amber-500 shadow-sm ring-1 ring-slate-900/5"; 
  const defaultText = "text-slate-900 text-xl font-bold";

  const containerClass = `${containerBase} ${hasCustomBg ? '' : defaultTheme} ${className}`;
  const textClass = `${hasCustomText ? '' : defaultText} font-mono tracking-wide whitespace-nowrap`;

  return (
    <div className={containerClass}>
      <div className={textClass}>
        {cleanText}
      </div>
      {label && (
        <div className="mt-2 text-xs text-slate-500 font-sans font-medium uppercase tracking-wider opacity-90">
          {label}
        </div>
      )}
    </div>
  );
};

export default Equation;
