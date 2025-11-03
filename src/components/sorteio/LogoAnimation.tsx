import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logoDefault from '@/assets/logo-sempre.png';

interface LogoAnimationProps {
  isAnimating: boolean;
}

export const LogoAnimation = ({ isAnimating }: LogoAnimationProps) => {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string>(logoDefault);

  useEffect(() => {
    loadLogo();
  }, []);

  useEffect(() => {
    if (isAnimating) {
      setAnimationPhase(1);
      
      const timer1 = setTimeout(() => {
        setAnimationPhase(2);
      }, 1500);

      const timer2 = setTimeout(() => {
        setAnimationPhase(0);
      }, 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isAnimating]);

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
          <>
            <div 
              className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur-3xl opacity-60"
              style={{
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
            
            {/* Rotating light beam - First loop */}
            {animationPhase >= 1 && (
              <div 
                className="absolute inset-0"
                style={{
                  animation: 'rotate 1.5s linear'
                }}
              >
                <div className="absolute top-1/2 left-1/2 w-2 h-full bg-gradient-to-b from-secondary/0 via-secondary to-secondary/0 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
            
            {/* Rotating light beam - Second loop */}
            {animationPhase >= 2 && (
              <div 
                className="absolute inset-0"
                style={{
                  animation: 'rotate 1.5s linear'
                }}
              >
                <div className="absolute top-1/2 left-1/2 w-2 h-full bg-gradient-to-b from-primary/0 via-primary to-primary/0 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
          </>
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
