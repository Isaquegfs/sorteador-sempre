import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logoSempre from '@/assets/logo-sempre.png';

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

export const PublicPageLayout = ({ children }: PublicPageLayoutProps) => {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>(logoSempre);

  useEffect(() => {
    loadActiveTema();
  }, []);

  const loadActiveTema = async () => {
    try {
      const { data } = await supabase
        .from('temas')
        .select('imagem_url, logo_url')
        .eq('ativo', true)
        .single();

      if (data?.imagem_url) {
        setBackgroundImage(data.imagem_url);
      }
      if (data?.logo_url) {
        setLogoUrl(data.logo_url);
      }
    } catch (error) {
      console.error('Erro ao carregar tema ativo:', error);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Fundo temático com overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #F27435 0%, #5A58A3 100%)',
          filter: backgroundImage ? 'blur(2px)' : 'none',
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      />

      {/* Container central */}
      <div className="relative w-full max-w-md">
        <div 
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-8 space-y-6 animate-fade-in"
          style={{
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2), 0 0 100px rgba(242, 116, 53, 0.1)',
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={logoUrl} 
              alt="Sempre Internet" 
              className="h-16 object-contain"
            />
          </div>

          {/* Conteúdo */}
          {children}
        </div>

        {/* Rodapé */}
        <p className="text-center text-white text-sm mt-6 drop-shadow-lg">
          Sistema de Sorteio Sempre Internet
        </p>
      </div>
    </div>
  );
};