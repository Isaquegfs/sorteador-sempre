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
import { CountdownTimer } from '@/components/sorteio/CountdownTimer';
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
  id: string;
  nome: string;
  setor: string;
  cidade: string;
  premio?: {
    id: string;
    nome: string;
    descricao: string | null;
  };
}

interface Premio {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
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
  const [titleColor, setTitleColor] = useState<string>('#FFFFFF');
  const [titleStyle, setTitleStyle] = useState<'cor' | 'degrade' | 'textura'>('cor');
  const [degradeInicio, setDegradeInicio] = useState<string>('#F27435');
  const [degradeFim, setDegradeFim] = useState<string>('#0033A1');
  const [degradeDirecao, setDegradeDirecao] = useState<string>('to right');
  const [texturaUrl, setTexturaUrl] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [showCountdown, setShowCountdown] = useState(false);
  const [currentWinnerId, setCurrentWinnerId] = useState<string | null>(null);
  const [countdownDuration, setCountdownDuration] = useState(40);
  const [sorteioComPremios, setSorteioComPremios] = useState(false);
  const [premiosDisponiveis, setPremiosDisponiveis] = useState<Premio[]>([]);
  const [proximoPremio, setProximoPremio] = useState<Premio | null>(null);
  
  // Estados para sequência de sorteios
  const [emSequencia, setEmSequencia] = useState(false);
  const [sequenciaTotal, setSequenciaTotal] = useState(0);
  const [sequenciaAtual, setSequenciaAtual] = useState(0);
  const [sequenciaVencedores, setSequenciaVencedores] = useState<Winner[]>([]);
  const [aguardandoProximo, setAguardandoProximo] = useState(false);
  
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
    loadCountdownConfig();
    loadSorteioConfig();
  }, []);

  useEffect(() => {
    if (sorteioComPremios) {
      loadPremiosDisponiveis();
    }
  }, [sorteioComPremios]);

  const loadActiveTema = async () => {
    try {
      const { data } = await supabase
        .from('temas')
        .select('imagem_url, cor_titulo, estilo_titulo, degrade_inicio, degrade_fim, degrade_direcao, textura_url')
        .eq('ativo', true)
        .single();

      if (data?.imagem_url) {
        setBackgroundImage(data.imagem_url);
      }
      if (data?.cor_titulo) {
        setTitleColor(data.cor_titulo);
      }
      if (data?.estilo_titulo) {
        setTitleStyle(data.estilo_titulo as 'cor' | 'degrade' | 'textura');
      }
      if (data?.degrade_inicio) {
        setDegradeInicio(data.degrade_inicio);
      }
      if (data?.degrade_fim) {
        setDegradeFim(data.degrade_fim);
      }
      if (data?.degrade_direcao) {
        setDegradeDirecao(data.degrade_direcao);
      }
      if (data?.textura_url) {
        setTexturaUrl(data.textura_url);
      }
    } catch (error) {
      // Silently handle error
    }
  };

  const loadCountdownConfig = async () => {
    try {
      const { data } = await supabase
        .from('sistema_config')
        .select('tempo_confirmacao_segundos')
        .single();

      if (data?.tempo_confirmacao_segundos) {
        setCountdownDuration(data.tempo_confirmacao_segundos);
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
    }
  };

  const loadSorteioConfig = async () => {
    try {
      const { data } = await supabase
        .from('sistema_config')
        .select('sorteio_com_premios')
        .single();

      if (data) {
        setSorteioComPremios(data.sorteio_com_premios || false);
      }
    } catch (error) {
      console.error('Erro ao carregar config de sorteio:', error);
    }
  };

  const loadPremiosDisponiveis = async () => {
    try {
      const { data, error } = await supabase
        .from('premios')
        .select('*')
        .eq('status', 'Disponível')
        .order('ordem', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setPremiosDisponiveis(data);
        setProximoPremio(data[0]);
      } else {
        // Não há prêmios disponíveis, desativar modo prêmios
        toast({
          title: 'Aviso',
          description: 'Não há prêmios disponíveis. O modo sorteio com prêmios foi desativado.',
          variant: 'destructive',
        });
        setSorteioComPremios(false);
        const { data: configData } = await supabase
          .from('sistema_config')
          .select('id')
          .single();
        
        if (configData) {
          await supabase
            .from('sistema_config')
            .update({ sorteio_com_premios: false })
            .eq('id', configData.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar prêmios:', error);
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

    // Verificar se é modo com prêmios e múltiplos vencedores
    if (sorteioComPremios && numVencedores > 1) {
      // Iniciar sequência de sorteios
      iniciarSequenciaSorteios();
      return;
    }

    // Modo tradicional OU modo prêmios com 1 vencedor
    realizarSorteioUnico();
  };

  const iniciarSequenciaSorteios = () => {
    // Verificar se há prêmios suficientes
    if (premiosDisponiveis.length < numVencedores) {
      toast({
        title: 'Prêmios insuficientes',
        description: `Há apenas ${premiosDisponiveis.length} prêmio(s) disponível(is) para ${numVencedores} sorteio(s).`,
        variant: 'destructive',
      });
      return;
    }

    setEmSequencia(true);
    setSequenciaTotal(numVencedores);
    setSequenciaAtual(1);
    setSequenciaVencedores([]);
    setAguardandoProximo(false);

    toast({
      title: 'Sequência iniciada',
      description: `${numVencedores} sorteios serão realizados sequencialmente`,
    });

    // Realizar primeiro sorteio da sequência
    realizarSorteioSequencial();
  };

  const realizarSorteioSequencial = async () => {
    if (participantes.length === 0) {
      toast({
        title: 'Sem participantes',
        description: 'Não há mais participantes disponíveis para sortear.',
        variant: 'destructive',
      });
      finalizarSequencia();
      return;
    }

    if (!proximoPremio) {
      toast({
        title: 'Sem prêmios',
        description: 'Não há mais prêmios disponíveis.',
        variant: 'destructive',
      });
      finalizarSequencia();
      return;
    }

    setShowWinners(false);
    setWinners([]);
    setIsSorteando(true);
    setIsAnimating(true);
    setAguardandoProximo(false);

    try {
      // Animação de sorteio
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Obter usuário
      const { data: { user } } = await supabase.auth.getUser();

      // Sortear UMA pessoa
      const vencedores = selectRandomItems(participantes, 1);
      const vencedor = vencedores[0];

      // Preparar dados com prêmio
      const sorteadoData = {
        participante_id: vencedor.id,
        nome: vencedor.nome,
        setor: vencedor.setor,
        cidade: vencedor.cidade,
        sorteado_por: user?.id,
        premio_id: proximoPremio.id,
        confirmado: null, // Aguardando validação
      };

      // Inserir no banco
      const { error } = await supabase
        .from('sorteados')
        .insert([sorteadoData]);

      if (error) throw error;

      // Atualizar listas
      const novosExcluidos = new Set(excludedIds);
      novosExcluidos.add(vencedor.id);
      setExcludedIds(novosExcluidos);
      persistExcluded(novosExcluidos);
      setParticipantes(prev => prev.filter(p => p.id !== vencedor.id));

      // Preparar winner com prêmio
      const winnerComPremio: Winner = {
        ...vencedor,
        premio: {
          id: proximoPremio.id,
          nome: proximoPremio.nome,
          descricao: proximoPremio.descricao,
        },
      };

      setWinners([winnerComPremio]);
      setShowWinners(true);
      setIsAnimating(false);

      // Adicionar à lista de vencedores da sequência
      setSequenciaVencedores(prev => [...prev, winnerComPremio]);

      // Mostrar countdown para validação
      setCurrentWinnerId(vencedor.id);
      setShowCountdown(true);

      toast({
        title: `Sorteio ${sequenciaAtual} de ${sequenciaTotal}`,
        description: `${vencedor.nome} foi sorteado!`,
      });
    } catch (error) {
      console.error('Erro ao sortear:', error);
      toast({
        title: 'Erro ao sortear',
        variant: 'destructive',
      });
      setIsAnimating(false);
      finalizarSequencia();
    } finally {
      setIsSorteando(false);
    }
  };

  const proximoSorteio = async () => {
    if (sequenciaAtual >= sequenciaTotal) {
      finalizarSequencia();
      return;
    }

    setSequenciaAtual(prev => prev + 1);
    
    // Recarregar prêmios disponíveis antes do próximo sorteio
    await loadPremiosDisponiveis();
    
    // Realizar próximo sorteio
    realizarSorteioSequencial();
  };

  const cancelarSequencia = () => {
    setEmSequencia(false);
    setAguardandoProximo(false);
    setShowCountdown(false);
    setCurrentWinnerId(null);
    
    toast({
      title: 'Sequência cancelada',
      description: `${sequenciaVencedores.length} de ${sequenciaTotal} sorteios foram concluídos`,
    });

    // Mostrar resumo dos sorteios realizados
    finalizarSequencia();
  };

  const finalizarSequencia = () => {
    setEmSequencia(false);
    setAguardandoProximo(false);
    setShowCountdown(false);
    setCurrentWinnerId(null);
    
    if (sequenciaVencedores.length > 0) {
      setWinners(sequenciaVencedores);
      setShowWinners(true);
      
      toast({
        title: 'Sequência finalizada!',
        description: `${sequenciaVencedores.length} sorteio(s) realizado(s) com sucesso`,
      });
    }
  };

  const realizarSorteioUnico = async () => {
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
      const sorteadosData = vencedores.map(vencedor => {
        const baseData: any = {
          participante_id: vencedor.id,
          nome: vencedor.nome,
          setor: vencedor.setor,
          cidade: vencedor.cidade,
          sorteado_por: user?.id,
        };

        // No modo com prêmios (1 vencedor), adicionar o prêmio e marcar como não confirmado
        if (sorteioComPremios && proximoPremio) {
          baseData.premio_id = proximoPremio.id;
          baseData.confirmado = null; // Aguardando validação
        } else {
          // Modo tradicional: sem prêmio, sem validação
          baseData.confirmado = true; // Confirmado automaticamente
          baseData.confirmado_em = new Date().toISOString();
        }

        return baseData;
      });

      // Inserir na tabela de histórico (sorteados)
      const { error } = await supabase
        .from('sorteados')
        .insert(sorteadosData);

      if (error) throw error;

      // Preparar winners com informações do prêmio
      const winnersComPremio = vencedores.map(w => ({
        ...w,
        premio: sorteioComPremios && proximoPremio ? {
          id: proximoPremio.id,
          nome: proximoPremio.nome,
          descricao: proximoPremio.descricao,
        } : undefined,
      }));

      // Atualizar lista temporária: remover vencedores da pool atual
      const novosExcluidos = new Set(excludedIds);
      vencedores.forEach(v => novosExcluidos.add(v.id));
      setExcludedIds(novosExcluidos);
      persistExcluded(novosExcluidos);
      setParticipantes(prev => prev.filter(p => !novosExcluidos.has(p.id)));

      // Exibir vencedores
      setWinners(winnersComPremio);
      setShowWinners(true);

      // Mostrar countdown APENAS no modo com prêmios
      if (sorteioComPremios && numVencedores === 1 && vencedores.length > 0) {
        setCurrentWinnerId(vencedores[0].id);
        setShowCountdown(true);
      }

      toast({
        title: 'Sorteio realizado!',
        description: `${vencedores.length} vencedor(es) sorteado(s) com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao sortear:', error);
      toast({
        title: 'Erro ao realizar sorteio',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
      setIsAnimating(false);
    } finally {
      setIsSorteando(false);
      setIsAnimating(false);
    }
  };

  const novoSorteio = () => {
    setShowWinners(false);
    setWinners([]);
    setNumVencedores(1);
    setShowCountdown(false);
    setCurrentWinnerId(null);
    
    // Resetar estados da sequência
    setEmSequencia(false);
    setSequenciaTotal(0);
    setSequenciaAtual(0);
    setSequenciaVencedores([]);
    setAguardandoProximo(false);
  };

  const handleConfirmWinner = async () => {
    if (!currentWinnerId) return;

    try {
      // Buscar o registro do sorteado por participante_id
      const { data: sorteado, error: fetchError } = await supabase
        .from('sorteados')
        .select('id, premio_id')
        .eq('participante_id', currentWinnerId)
        .order('sorteado_em', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar o registro com confirmação
      const { error: updateError } = await supabase
        .from('sorteados')
        .update({
          confirmado: true,
          confirmado_em: new Date().toISOString(),
        })
        .eq('id', sorteado.id);

      if (updateError) throw updateError;

      // Atualizar status do prêmio para "Sorteado"
      if (sorteado.premio_id) {
        await supabase
          .from('premios')
          .update({ status: 'Sorteado' })
          .eq('id', sorteado.premio_id);
      }

      toast({
        title: 'Sorteado confirmado!',
        description: 'A presença foi registrada e o prêmio foi entregue.',
      });

      setShowCountdown(false);
      setCurrentWinnerId(null);

      // Se estiver em sequência, aguardar próximo sorteio
      if (emSequencia) {
        setAguardandoProximo(true);
        
        // Recarregar prêmios antes de continuar
        await loadPremiosDisponiveis();
      } else {
        // Atualizar lista de prêmios normalmente
        await loadPremiosDisponiveis();
      }
    } catch (error) {
      toast({
        title: 'Erro ao confirmar',
        description: 'Não foi possível registrar a confirmação.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectWinner = async () => {
    if (!currentWinnerId) return;

    try {
      // Buscar o registro do sorteado por participante_id
      const { data: sorteado, error: fetchError } = await supabase
        .from('sorteados')
        .select('id, premio_id')
        .eq('participante_id', currentWinnerId)
        .order('sorteado_em', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar o registro com rejeição
      const { error: updateError } = await supabase
        .from('sorteados')
        .update({
          confirmado: false,
          confirmado_em: new Date().toISOString(),
        })
        .eq('id', sorteado.id);

      if (updateError) throw updateError;

      // Atualizar status do prêmio para "Reprogramado" e mover para o final da lista
      if (sorteado.premio_id) {
        // Buscar maior ordem atual
        const { data: premios } = await supabase
          .from('premios')
          .select('ordem')
          .order('ordem', { ascending: false })
          .limit(1);

        const novaOrdem = premios && premios.length > 0 ? premios[0].ordem + 1 : 1;

        await supabase
          .from('premios')
          .update({ 
            status: 'Reprogramado',
            ordem: novaOrdem
          })
          .eq('id', sorteado.premio_id);
      }

      toast({
        title: 'Sorteado não confirmado',
        description: 'A ausência foi registrada. Prêmio reprogramado para o final da lista.',
        variant: 'destructive',
      });

      setShowCountdown(false);
      setCurrentWinnerId(null);

      // Se estiver em sequência, aguardar próximo sorteio
      if (emSequencia) {
        setAguardandoProximo(true);
        
        // Recarregar prêmios antes de continuar
        await loadPremiosDisponiveis();
      } else {
        // Atualizar lista de prêmios normalmente
        await loadPremiosDisponiveis();
      }
    } catch (error) {
      toast({
        title: 'Erro ao registrar',
        description: 'Não foi possível registrar a ausência.',
        variant: 'destructive',
      });
    }
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

      {/* Contador de confirmação */}
      {showCountdown && currentWinnerId && sorteioComPremios && (
        <CountdownTimer
          duration={countdownDuration}
          onConfirm={handleConfirmWinner}
          onReject={handleRejectWinner}
          winnerName={winners.find(w => w.id === currentWinnerId)?.nome || ''}
        />
      )}

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
          style={
            titleStyle === 'cor'
              ? { color: titleColor }
              : titleStyle === 'degrade'
              ? {
                  background: `linear-gradient(${degradeDirecao}, ${degradeInicio}, ${degradeFim})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }
              : titleStyle === 'textura' && texturaUrl
              ? {
                  backgroundImage: `url(${texturaUrl})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { color: titleColor }
          }
        >
          SORTEADOR
        </h1>

        {/* Próximo prêmio a ser sorteado */}
        {sorteioComPremios && proximoPremio && !showWinners && !isAnimating && !emSequencia && (
          <div className="text-center mb-8 p-6 bg-card/50 rounded-lg border-2 border-primary/20 animate-fade-in">
            <p className="text-lg text-muted-foreground mb-2">Próximo prêmio a ser sorteado:</p>
            <h3 className="text-3xl font-bold text-primary mb-2">{proximoPremio.nome}</h3>
            {proximoPremio.descricao && (
              <p className="text-muted-foreground">{proximoPremio.descricao}</p>
            )}
          </div>
        )}

        {/* Indicador de progresso da sequência */}
        {emSequencia && (
          <div className="text-center mb-8 p-6 bg-primary/10 rounded-lg border-2 border-primary/30 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="text-4xl font-bold text-primary">
                {sequenciaAtual} / {sequenciaTotal}
              </div>
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">
              Sorteio {sequenciaAtual} de {sequenciaTotal}
            </p>
            {proximoPremio && (
              <>
                <p className="text-sm text-muted-foreground mb-2">Prêmio atual:</p>
                <p className="text-xl font-bold text-primary">{proximoPremio.nome}</p>
              </>
            )}
          </div>
        )}

        {/* Controles de sequência - Aguardando próximo sorteio */}
        {aguardandoProximo && emSequencia && (
          <div className="text-center mb-8 p-6 bg-card/50 rounded-lg border-2 border-primary/20 space-y-4 animate-fade-in">
            <p className="text-lg font-semibold text-foreground">
              Sorteio {sequenciaAtual} de {sequenciaTotal} concluído
            </p>
            <div className="flex justify-center gap-4">
              {sequenciaAtual < sequenciaTotal ? (
                <>
                  <Button
                    onClick={proximoSorteio}
                    size="lg"
                    className="gap-2"
                  >
                    <Sparkles className="h-5 w-5" />
                    Próximo Sorteio ({sequenciaAtual + 1}/{sequenciaTotal})
                  </Button>
                  <Button
                    onClick={cancelarSequencia}
                    variant="destructive"
                    size="lg"
                  >
                    Cancelar Sequência
                  </Button>
                </>
              ) : (
                <Button
                  onClick={finalizarSequencia}
                  size="lg"
                  className="gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  Ver Resumo Final
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Loading state durante sorteio */}
        {isSorteando && !showWinners && (
          <InfinityLoader />
        )}

        {/* Resultados do sorteio */}
        {showWinners && winners.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              {emSequencia || sequenciaVencedores.length > 0 ? (
                <>
                  <h2 
                    className="text-3xl font-bold mb-2"
                    style={{ 
                      color: 'white',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8), 1px -1px 2px rgba(0, 0, 0, 0.8), -1px 1px 2px rgba(0, 0, 0, 0.8)'
                    }}
                  >
                    🎉 Resumo da Sequência de Sorteios 🎉
                  </h2>
                  <p 
                    className="text-lg mb-4"
                    style={{ 
                      color: 'white',
                      textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)'
                    }}
                  >
                    {winners.length} de {sequenciaTotal} sorteio(s) realizado(s)
                  </p>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              {winners.map((winner, index) => (
                <WinnerCard
                  key={index}
                  nome={winner.nome}
                  setor={winner.setor}
                  cidade={winner.cidade}
                  premio={winner.premio}
                  delay={index * 200}
                  onFlip={() => {
                    if (!showCountdown && !currentWinnerId) {
                      setCurrentWinnerId(winner.id);
                      setShowCountdown(true);
                    }
                  }}
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
        {!showWinners && !isSorteando && !emSequencia && !aguardandoProximo && (
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
