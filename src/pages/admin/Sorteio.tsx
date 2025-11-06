import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { selectRandomItems } from '@/lib/random';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { LogoAnimation } from '@/components/sorteio/LogoAnimation';
import { WinnerCard } from '@/components/sorteio/WinnerCard';
import { InfinityLoader } from '@/components/sorteio/InfinityLoader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Participante {
  id: string;
  nome: string;
  setor: string;
  cidade: string;
}

interface Winner {
  nome: string;
  setor: string;
  cidade: string;
}

const Sorteio = () => {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSorteando, setIsSorteando] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const [numVencedores, setNumVencedores] = useState(1);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [titleColor, setTitleColor] = useState<string>('#0033A1');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const EXCLUDED_STORAGE_KEY = 'sorteio_excluded_ids';
  const persistExcluded = (set: Set<string>) => {
    try {
      localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch {}
  };
  const readExcluded = (): Set<string> => {
    try {
      const raw = localStorage.getItem(EXCLUDED_STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  };
  const { toast } = useToast();

  useEffect(() => {
    const stored = readExcluded();
    setExcludedIds(stored);
    loadParticipantes(stored);
    loadActiveTema();
  }, []);

  const loadActiveTema = async () => {
    try {
      const { data } = await supabase
        .from('temas')
        .select('imagem_url, cor_titulo')
        .eq('ativo', true)
        .single();

      if (data?.imagem_url) {
        setBackgroundImage(data.imagem_url);
      }
      if (data?.cor_titulo) {
        setTitleColor(data.cor_titulo);
      }
    } catch (error) {
      console.error('Erro ao carregar tema ativo:', error);
    }
  };

  const loadParticipantes = async (ids?: Set<string>) => {
    try {
      // Buscar TODOS os participantes da base oficial
      // O histórico (sorteados) não afeta quem pode ser sorteado
      const { data: allParticipantes, error: participantesError } = await supabase
        .from('participantes')
        .select('id, nome, setor, cidade');

      if (participantesError) throw participantesError;

      const filterSet = ids ?? excludedIds;
      setParticipantes((allParticipantes || []).filter(p => !filterSet.has(p.id)));
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
      toast({
        title: 'Erro ao carregar participantes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const realizarSorteio = async () => {
    if (participantes.length === 0) {
      toast({
        title: 'Nenhum participante disponível',
        description: 'Não há participantes cadastrados na base oficial.',
        variant: 'destructive',
      });
      return;
    }

    if (numVencedores < 1) {
      toast({
        title: 'Número inválido',
        description: 'O número de vencedores deve ser no mínimo 1.',
        variant: 'destructive',
      });
      return;
    }

    if (numVencedores > participantes.length) {
      toast({
        title: 'Número inválido',
        description: `Há apenas ${participantes.length} participante(s) disponível(is).`,
        variant: 'destructive',
      });
      return;
    }

    // Resetar estados
    setShowWinners(false);
    setWinners([]);
    setIsSorteando(true);
    setIsAnimating(true);

    try {
      // Simular tempo de carregamento (3 segundos para animação)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      // Selecionar vencedores usando Fisher-Yates (100% aleatório e imparcial)
      const vencedores = selectRandomItems(participantes, numVencedores);

      // Preparar dados para inserção no histórico
      const sorteadosData = vencedores.map(vencedor => ({
        participante_id: vencedor.id,
        nome: vencedor.nome,
        setor: vencedor.setor,
        cidade: vencedor.cidade,
        sorteado_por: user?.id,
      }));

      // Inserir na tabela de histórico (sorteados)
      const { error } = await supabase
        .from('sorteados')
        .insert(sorteadosData);

      if (error) throw error;

      // Atualizar lista temporária: remover vencedores da pool atual
      const novosExcluidos = new Set(excludedIds);
      vencedores.forEach(v => novosExcluidos.add(v.id));
      setExcludedIds(novosExcluidos);
      persistExcluded(novosExcluidos);
      setParticipantes(prev => prev.filter(p => !novosExcluidos.has(p.id)));

      // Mostrar vencedores
      const vencedoresExibicao = vencedores.map(v => ({ nome: v.nome, setor: v.setor, cidade: v.cidade }));
      setWinners(vencedoresExibicao);
      setShowWinners(true);
      setIsAnimating(false);

      toast({
        title: 'Sorteio realizado!',
        description: `${numVencedores} vencedor(es) sorteado(s) e removido(s) da lista temporária!`,
      });
    } catch (error) {
      console.error('Erro ao realizar sorteio:', error);
      toast({
        title: 'Erro ao realizar sorteio',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
      setIsAnimating(false);
    } finally {
      setIsSorteando(false);
    }
  };

  const novoSorteio = () => {
    setShowWinners(false);
    setWinners([]);
    setNumVencedores(1);
  };

  const handleResetSorteio = async () => {
    setIsResetting(true);
    try {
      // Resetar estados
      setShowWinners(false);
      setWinners([]);
      setNumVencedores(1);
      setExcludedIds(new Set());
      try { localStorage.removeItem(EXCLUDED_STORAGE_KEY); } catch {}
      
      // Recarregar participantes da base oficial
      await loadParticipantes(new Set());

      toast({
        title: 'Sorteio reiniciado!',
        description: 'Pronto para novo sorteio. O histórico foi mantido.',
      });
    } catch (error) {
      console.error('Erro ao reiniciar sorteio:', error);
      toast({
        title: 'Erro ao reiniciar sorteio',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Fundo temático com overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #F27435 0%, #0033A1 100%)',
          imageRendering: '-webkit-optimize-contrast',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      />
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: 'rgba(0, 0, 0, 0.15)',
        }}
      />

      {/* Botão Recomeçar Sorteio - Discreto no canto superior direito */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResetDialog(true)}
          disabled={isResetting || isSorteando}
          className="gap-2 bg-background border-border/50 text-[hsl(17,86%,58%)] hover:bg-[hsl(17,86%,58%)]/10 hover:backdrop-blur-md hover:shadow-[0_4px_20px_rgba(242,116,53,0.15)] hover:border-[hsl(17,86%,58%)]/30 transition-all duration-300"
        >
          {isResetting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          <span className="text-xs">Recomeçar Sorteio</span>
        </Button>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja recomeçar o sorteio?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso limpará a tela atual e recarregará todos os participantes da base oficial.
              O histórico completo de ganhadores será mantido para consultas futuras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetSorteio}
              className="bg-[hsl(17,86%,58%)] hover:bg-[hsl(17,86%,58%)]/90"
            >
              Sim, Recomeçar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="w-full max-w-4xl space-y-8">
        {/* Logo com animação */}
        <LogoAnimation isAnimating={isAnimating} />

        {/* Título */}
        <h1 
          className="text-6xl font-bold text-center"
          style={{ color: titleColor }}
        >
          SORTEADOR
        </h1>

        {/* Loading state durante sorteio */}
        {isSorteando && !showWinners && (
          <InfinityLoader />
        )}

        {/* Resultados do sorteio */}
        {showWinners && winners.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 
                className="text-3xl font-bold mb-2"
                style={{ 
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8), 1px -1px 2px rgba(0, 0, 0, 0.8), -1px 1px 2px rgba(0, 0, 0, 0.8)'
                }}
              >
                🎉 Vencedores Sorteados! 🎉
              </h2>
              <p 
                className="text-lg"
                style={{ 
                  color: 'white',
                  textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)'
                }}
              >
                Clique nos cartões para revelar os ganhadores
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              {winners.map((winner, index) => (
                <WinnerCard
                  key={index}
                  nome={winner.nome}
                  setor={winner.setor}
                  cidade={winner.cidade}
                  delay={index * 200}
                />
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={novoSorteio}
                size="lg"
                className="gap-2"
              >
                <Sparkles className="h-5 w-5" />
                Novo Sorteio
              </Button>
            </div>
          </div>
        )}

        {/* Formulário de sorteio */}
        {!showWinners && !isSorteando && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="space-y-4 bg-card p-8 rounded-lg border shadow-lg">
              <div className="text-center mb-4">
                <p className="text-lg text-muted-foreground">
                  {participantes.length} participante(s) disponível(is)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="num-vencedores" className="text-lg">
                  Quantos nomes deseja sortear?
                </Label>
                <Input
                  id="num-vencedores"
                  type="number"
                  min="1"
                  max={participantes.length}
                  value={numVencedores}
                  onChange={(e) => setNumVencedores(parseInt(e.target.value) || 1)}
                  className="text-center text-xl h-14"
                  disabled={isSorteando}
                />
              </div>

              <Button
                onClick={realizarSorteio}
                disabled={isSorteando || participantes.length === 0}
                className="w-full h-14 text-lg gap-2"
                size="lg"
              >
                {isSorteando ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sorteando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Iniciar Sorteio
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sorteio;
