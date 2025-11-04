import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logoDefault from '@/assets/logo-sempre.png';

interface LogoAnimationProps {
  isAnimating: boolean;
}

export const LogoAnimation = ({ isAnimating }: LogoAnimationProps) => {
  const [logoUrl, setLogoUrl] = useState<string>(logoDefault);

  useEffect(() => {
    loadLogo();
  }, []);

  const loadLogo = async () => {
    try {
      const { data } = await supabase
        .from('temas')
        .select('logo_url')
        .eq('ativo', true)
        .single();

      if (data?.logo_url) {
        setLogoUrl(data.logo_url);
      }
    } catch (error) {
      console.error('Erro ao carregar logo do tema:', error);
    }
  };

  return (
    <div className="relative flex justify-center items-center p-8">
      <div className="relative">
        {/* Glow effect */}
        {isAnimating && (
          <div 
            className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur-3xl opacity-60"
            style={{
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        )}
        
        {/* Logo */}
        <img 
          src={logoUrl} 
          alt="Sempre Internet" 
          className={`h-32 w-auto relative z-10 transition-transform duration-300 ${
            isAnimating ? 'scale-110' : 'scale-100'
          }`}
        />
      </div>
    </div>
  );
};
