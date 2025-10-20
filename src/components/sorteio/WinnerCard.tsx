import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface WinnerCardProps {
  nome: string;
  setor: string;
  cidade: string;
  delay: number;
}

export const WinnerCard = ({ nome, setor, cidade, delay }: WinnerCardProps) => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <Card
      className={`
        relative overflow-hidden cursor-pointer transition-all duration-700 transform
        ${isRevealed 
          ? 'bg-gradient-to-br from-primary/10 to-secondary/10 scale-105 shadow-2xl border-2 border-primary/50' 
          : 'bg-gradient-to-br from-muted to-muted/50 hover:scale-105 hover:shadow-lg'
        }
      `}
      style={{ 
        animationDelay: `${delay}ms`,
        animation: 'fadeIn 0.5s ease-out forwards'
      }}
      onClick={() => !isRevealed && setIsRevealed(true)}
    >
      <div className="p-8">
        {!isRevealed ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-50 animate-pulse" />
              <Sparkles className="h-16 w-16 text-primary relative z-10" />
            </div>
            <p className="text-xl font-semibold text-center text-muted-foreground">
              Clique para revelar
            </p>
          </div>
        ) : (
          <div 
            className="min-h-[200px] flex flex-col justify-center space-y-4"
            style={{
              animation: 'revealWinner 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="h-6 w-6 text-secondary animate-pulse" />
                  <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    VENCEDOR!
                  </h3>
                  <Sparkles className="h-6 w-6 text-secondary animate-pulse" />
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-3xl font-bold text-foreground">
                    {nome}
                  </p>
                  <div className="space-y-1">
                    <p className="text-lg text-muted-foreground">
                      <span className="font-semibold">Setor:</span> {setor}
                    </p>
                    <p className="text-lg text-muted-foreground">
                      <span className="font-semibold">Cidade:</span> {cidade}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shimmer effect when not revealed */}
      {!isRevealed && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
          style={{
            animation: 'shimmer 3s infinite'
          }}
        />
      )}
    </Card>
  );
};
