/**
 * Sistema de Contraste Adaptativo
 * Analisa backgrounds e retorna classes otimizadas para máximo contraste
 */

/**
 * Converte cor hexadecimal para RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calcula a luminosidade relativa de uma cor (0-255)
 * Fórmula baseada em percepção humana
 */
function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Analisa se o fundo é claro ou escuro
 * Retorna 'light' ou 'dark'
 */
export function analyzeBackground(color: string): 'light' | 'dark' {
  const rgb = hexToRgb(color);
  if (!rgb) return 'dark'; // Default para escuro se não conseguir analisar
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 128 ? 'light' : 'dark';
}

/**
 * Retorna classes de estilo otimizadas baseado no tipo de fundo
 */
export function getContrastClasses(backgroundType: 'light' | 'dark') {
  if (backgroundType === 'light') {
    return {
      // Para fundos claros: usar elementos escuros
      overlay: 'rgba(255, 255, 255, 0.4)', // Overlay claro
      cardBg: 'bg-slate-900/90', // Card escuro e opaco
      cardBorder: 'border-slate-800/50',
      textPrimary: 'text-white',
      textSecondary: 'text-slate-200',
      textMuted: 'text-slate-300',
      numberColor: 'text-white',
      accentBg: 'bg-slate-800/80',
    };
  } else {
    return {
      // Para fundos escuros: usar elementos claros
      overlay: 'rgba(0, 0, 0, 0.3)', // Overlay escuro
      cardBg: 'bg-white/95', // Card claro e opaco
      cardBorder: 'border-white/30',
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-700',
      textMuted: 'text-slate-600',
      numberColor: 'text-primary',
      accentBg: 'bg-primary/10',
    };
  }
}

/**
 * Analisa imagem carregada para determinar luminosidade predominante
 * Para quando o tema usar backgroundImage
 */
export async function analyzeImageBrightness(imageUrl: string): Promise<'light' | 'dark'> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve('dark');
          return;
        }
        
        // Reduzir tamanho para análise mais rápida
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        
        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;
        
        let totalLuminance = 0;
        const pixelCount = data.length / 4;
        
        // Calcular luminosidade média
        for (let i = 0; i < data.length; i += 4) {
          const luminance = getLuminance(data[i], data[i + 1], data[i + 2]);
          totalLuminance += luminance;
        }
        
        const avgLuminance = totalLuminance / pixelCount;
        resolve(avgLuminance > 128 ? 'light' : 'dark');
      } catch (error) {
        console.error('Erro ao analisar imagem:', error);
        resolve('dark');
      }
    };
    
    img.onerror = () => resolve('dark');
    img.src = imageUrl;
  });
}
