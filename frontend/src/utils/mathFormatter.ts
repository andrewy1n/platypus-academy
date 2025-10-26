// Mathematical expression formatter using Unicode symbols
export const formatMathExpression = (text: string): string => {
  if (!text) return text;
  
  // Mathematical symbols mapping
  const mathSymbols: { [key: string]: string } = {
    // Superscripts
    '²': '²',
    '³': '³',
    '¹': '¹',
    '⁴': '⁴',
    '⁵': '⁵',
    '⁶': '⁶',
    '⁷': '⁷',
    '⁸': '⁸',
    '⁹': '⁹',
    '⁰': '⁰',
    
    // Subscripts
    '₀': '₀',
    '₁': '₁',
    '₂': '₂',
    '₃': '₃',
    '₄': '₄',
    '₅': '₅',
    '₆': '₆',
    '₇': '₇',
    '₈': '₈',
    '₉': '₉',
    
    // Greek letters
    'alpha': 'α',
    'beta': 'β',
    'gamma': 'γ',
    'delta': 'δ',
    'epsilon': 'ε',
    'theta': 'θ',
    'lambda': 'λ',
    'mu': 'μ',
    'pi': 'π',
    'sigma': 'σ',
    'tau': 'τ',
    'phi': 'φ',
    'omega': 'ω',
    
    // Mathematical operators
    'integral': '∫',
    'sum': '∑',
    'product': '∏',
    'limit': 'lim',
    'infinity': '∞',
    'partial': '∂',
    'nabla': '∇',
    'union': '∪',
    'intersection': '∩',
    'subset': '⊂',
    'superset': '⊃',
    'element': '∈',
    'not_element': '∉',
    'empty_set': '∅',
    'forall': '∀',
    'exists': '∃',
    
    // Arrows
    'rightarrow': '→',
    'leftarrow': '←',
    'leftrightarrow': '↔',
    'uparrow': '↑',
    'downarrow': '↓',
    
    // Relations
    'leq': '≤',
    'geq': '≥',
    'neq': '≠',
    'approx': '≈',
    'equiv': '≡',
    'proportional': '∝',
    
    // Other symbols
    'plus_minus': '±',
    'times': '×',
    'divide': '÷',
    'dot': '·',
    'bullet': '•',
    'degree': '°',
    'prime': '′',
    'double_prime': '″',
    'therefore': '∴',
    'because': '∵',
  };
  
  // Common mathematical expression replacements
  let formattedText = text;
  
  // Replace common patterns
  formattedText = formattedText.replace(/x\^2/g, 'x²');
  formattedText = formattedText.replace(/x\^3/g, 'x³');
  formattedText = formattedText.replace(/x\^(\d+)/g, (match, exp) => {
    const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    return 'x' + exp.split('').map((d: string) => superscripts[parseInt(d)]).join('');
  });
  
  // Replace integrals
  formattedText = formattedText.replace(/∫/g, '∫');
  formattedText = formattedText.replace(/integral/g, '∫');
  
  // Replace limits
  formattedText = formattedText.replace(/lim\s*\(/g, 'lim(');
  formattedText = formattedText.replace(/as\s+x\s+approaches\s+(\d+)/g, 'as x → $1');
  
  // Replace derivatives
  formattedText = formattedText.replace(/d\/dx/g, 'd/dx');
  formattedText = formattedText.replace(/f'\(x\)/g, 'f′(x)');
  formattedText = formattedText.replace(/f''\(x\)/g, 'f″(x)');
  
  // Replace fractions
  formattedText = formattedText.replace(/\(([^)]+)\)\/([^)\s]+)/g, '($1)/$2');
  
  // Replace mathematical functions
  formattedText = formattedText.replace(/sin\s*\(/g, 'sin(');
  formattedText = formattedText.replace(/cos\s*\(/g, 'cos(');
  formattedText = formattedText.replace(/tan\s*\(/g, 'tan(');
  formattedText = formattedText.replace(/log\s*\(/g, 'log(');
  formattedText = formattedText.replace(/ln\s*\(/g, 'ln(');
  formattedText = formattedText.replace(/exp\s*\(/g, 'exp(');
  
  // Replace e^x with proper superscript
  formattedText = formattedText.replace(/e\^x/g, 'eˣ');
  formattedText = formattedText.replace(/e\^(\w+)/g, (match, exp) => `e${exp}`);
  
  // Replace multiplication symbols
  formattedText = formattedText.replace(/\*\s*/g, '·');
  
  // Replace infinity
  formattedText = formattedText.replace(/infinity/g, '∞');
  
  // Replace Greek letters
  Object.entries(mathSymbols).forEach(([key, value]) => {
    if (key.length > 1) { // Only replace full words, not single characters
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      formattedText = formattedText.replace(regex, value);
    }
  });
  
  return formattedText;
};

// Format answer values specifically for mathematical expressions
export const formatMathAnswer = (answer: any): string => {
  if (answer === null || answer === undefined) {
    return 'No answer provided';
  }
  
  // Handle boolean answers (true/false questions)
  if (typeof answer === 'boolean') {
    return answer ? 'True' : 'False';
  }
  
  // Handle array answers (ordering questions)
  if (Array.isArray(answer)) {
    return answer.map(item => formatMathExpression(String(item))).join(', ');
  }
  
  // Handle object answers (matching questions)
  if (typeof answer === 'object') {
    const pairs = Object.entries(answer).map(([key, value]) => 
      `${formatMathExpression(String(key))} → ${formatMathExpression(String(value))}`
    );
    return pairs.join(', ');
  }
  
  // Handle string and number answers
  if (typeof answer === 'string' || typeof answer === 'number') {
    return formatMathExpression(String(answer));
  }
  
  return 'Unknown format';
};
