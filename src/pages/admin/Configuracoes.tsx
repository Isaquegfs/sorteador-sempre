import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Configuracoes = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingBase, setIsClearingBase] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [dataFechamento, setDataFechamento] = useState('');
  const [horaFechamento, setHoraFechamento] = useState('');
  const [fechamentoAutomaticoAtivo, setFechamentoAutomaticoAtivo] = useState(false);
  const [tempoConfirmacao, setTempoConfirmacao] = useState(40);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
    
    // Verificar status do agendamento a cada minuto
    const interval = setInterval(() => {
      checkSchedule();
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      // Admins podem acessar a tabela completa
      const { data, error } = await supabase
        .from('formulario_config')
        .select('*')
        .single();

      if (error) throw error;
      
      if (data) {
        setFormularioAberto(data.aberto);
        setConfigId(data.id);
        setFechamentoAutomaticoAtivo(data.fechamento_automatico_ativo || false);
        
        if (data.data_fechamento_agendado) {
          const dataAgendada = new Date(data.data_fechamento_agendado);
          setDataFechamento(format(dataAgendada, 'yyyy-MM-dd'));
          setHoraFechamento(format(dataAgendada, 'HH:mm'));
        }
      }

      // Carregar tempo de confirmação
      const { data: configData } = await supabase
        .from('sistema_config')
        .select('tempo_confirmacao_segundos')
        .single();

      if (configData?.tempo_confirmacao_segundos) {
        setTempoConfirmacao(configData.tempo_confirmacao_segundos);
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar configurações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkSchedule = async () => {
    if (!fechamentoAutomaticoAtivo) return;
    
    try {
      const { data } = await supabase
        .from('formulario_config')
        .select('*')
        .single();

      if (data && !data.aberto && data.fechamento_automatico_ativo === false) {
        // Formulário foi fechado automaticamente
        await loadConfig();
      }
    } catch (error) {
      // Silently handle error
    }
  };

  const handleSave = async () => {
    if (!configId) {
      toast({
        title: 'Erro',
        description: 'Configuração não encontrada',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const updateData: any = {
        aberto: formularioAberto,
        updated_at: new Date().toISOString(),
      };

      // Se tem data e hora agendadas
      if (dataFechamento && horaFechamento) {
        const dataHoraFechamento = new Date(`${dataFechamento}T${horaFechamento}:00`);
        updateData.data_fechamento_agendado = dataHoraFechamento.toISOString();
        updateData.fechamento_automatico_ativo = true;
      } else {
        // Sem agendamento
        updateData.data_fechamento_agendado = null;
        updateData.fechamento_automatico_ativo = false;
      }

      if (formularioAberto) {
        updateData.data_abertura = new Date().toISOString();
        // Cancelar fechamento automático se reabrir manualmente
        if (fechamentoAutomaticoAtivo) {
          updateData.fechamento_automatico_ativo = false;
        }
      } else {
        updateData.data_fechamento = new Date().toISOString();
      }

      const { error } = await supabase
        .from('formulario_config')
        .update(updateData)
        .eq('id', configId);

      if (error) throw error;

      toast({
        title: 'Configurações salvas com sucesso!',
      });

      setFechamentoAutomaticoAtivo(updateData.fechamento_automatico_ativo);
    } catch (error) {
      toast({
        title: 'Erro ao salvar configurações',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearTable = async () => {
    setIsClearing(true);
    
    try {
      const { error } = await supabase
        .from('participantes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;

      toast({
        title: 'Tabela limpa com sucesso!',
        description: 'Todos os cadastros de participantes foram removidos.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao limpar tabela',
        description: 'Não foi possível limpar a tabela de participantes.',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearBaseOficial = async () => {
    setIsClearingBase(true);
    
    try {
      const { error } = await supabase
        .from('base_oficial')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;

      toast({
        title: 'Base Oficial limpa com sucesso!',
        description: 'Todos os registros da Base Oficial foram removidos.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao limpar Base Oficial',
        description: 'Não foi possível limpar a Base Oficial.',
        variant: 'destructive',
      });
    } finally {
      setIsClearingBase(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (!configId) return;

    try {
      const { error } = await supabase
        .from('formulario_config')
        .update({
          data_fechamento_agendado: null,
          fechamento_automatico_ativo: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', configId);

      if (error) throw error;

      setDataFechamento('');
      setHoraFechamento('');
      setFechamentoAutomaticoAtivo(false);

      toast({
        title: 'Agendamento cancelado com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro ao cancelar agendamento',
        variant: 'destructive',
      });
    }
  };

  const getScheduleMessage = () => {
    if (!fechamentoAutomaticoAtivo || !dataFechamento || !horaFechamento) {
      return null;
    }

    const dataAgendada = new Date(`${dataFechamento}T${horaFechamento}:00`);
    const dataFormatada = format(dataAgendada, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    if (formularioAberto) {
      return `Formulário aberto — fecha automaticamente em ${dataFormatada}.`;
    } else {
      return `Formulário fechado automaticamente em ${dataFormatada}.`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações do sistema de sorteio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulário de Inscrição</CardTitle>
          <CardDescription>
            Controle se o formulário público está aberto para novas inscrições
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="formulario-aberto">Status do Formulário</Label>
              <p className="text-sm text-muted-foreground">
                {formularioAberto ? 'Aberto para inscrições' : 'Fechado'}
              </p>
            </div>
            <Switch
              id="formulario-aberto"
              checked={formularioAberto}
              onCheckedChange={setFormularioAberto}
            />
          </div>

          {/* Mensagem de status do agendamento */}
          {getScheduleMessage() && (
            <div className="p-3 bg-muted rounded-lg border">
              <p className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {getScheduleMessage()}
              </p>
            </div>
          )}

          {/* Campos de agendamento */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Fechamento Automático</Label>
              <p className="text-sm text-muted-foreground">
                Agende uma data e hora para fechar o formulário automaticamente
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data-fechamento">Data de Fechamento</Label>
                <Input
                  id="data-fechamento"
                  type="date"
                  value={dataFechamento}
                  onChange={(e) => setDataFechamento(e.target.value)}
                  className="bg-background/50 border-border/50 hover:bg-background/80 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora-fechamento">Hora de Fechamento</Label>
                <Input
                  id="hora-fechamento"
                  type="time"
                  value={horaFechamento}
                  onChange={(e) => setHoraFechamento(e.target.value)}
                  className="bg-background/50 border-border/50 hover:bg-background/80 transition-all"
                />
              </div>
            </div>

            {fechamentoAutomaticoAtivo && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSchedule}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Desativar fechamento automático
              </Button>
            )}
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Dados</CardTitle>
          <CardDescription>
            Ações perigosas que afetam os dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Configuração de tempo de confirmação */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h3 className="font-semibold mb-2">Tempo de Confirmação</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Defina o tempo (em segundos) que o contador regressivo exibirá após sortear um vencedor.
              </p>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="tempo-confirmacao">Segundos</Label>
                  <Input
                    id="tempo-confirmacao"
                    type="number"
                    min="10"
                    max="300"
                    value={tempoConfirmacao}
                    onChange={(e) => setTempoConfirmacao(parseInt(e.target.value) || 40)}
                    className="bg-background/50 border-border/50"
                    onBlur={async (e) => {
                      const valor = parseInt(e.target.value) || 40;
                      try {
                        const { data: config } = await supabase
                          .from('sistema_config')
                          .select('id')
                          .single();

                        if (config) {
                          await supabase
                            .from('sistema_config')
                            .update({ tempo_confirmacao_segundos: valor })
                            .eq('id', config.id);
                        } else {
                          await supabase
                            .from('sistema_config')
                            .insert({ tempo_confirmacao_segundos: valor });
                        }

                        toast({
                          title: 'Tempo atualizado',
                          description: `Contador configurado para ${valor} segundos.`,
                        });
                      } catch (error) {
                        toast({
                          title: 'Erro ao salvar',
                          variant: 'destructive',
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <h3 className="font-semibold text-destructive mb-2">Limpar Tabela de Participantes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Esta ação irá remover todos os participantes cadastrados no sorteio atual.
                Os dados da base oficial não serão afetados.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isClearing}>
                    {isClearing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Limpando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar Tabela
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Deseja realmente limpar a tabela? Todos os dados cadastrados serão perdidos.
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Não</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearTable} className="bg-destructive hover:bg-destructive/90">
                      Sim, limpar tabela
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <h3 className="font-semibold text-destructive mb-2">Limpar Base Oficial</h3>
              <p className="text-sm text-muted-foreground mb-4">
                ⚠️ Esta ação irá remover <strong>TODOS</strong> os registros da Base Oficial permanentemente.
                Esta ação não pode ser desfeita e afetará a validação de participantes.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={isClearingBase}
                    className="bg-destructive/80 hover:bg-destructive border border-destructive"
                  >
                    {isClearingBase ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Limpando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar Base Oficial
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      ⚠️ Tem certeza que deseja limpar toda a Base Oficial?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá <strong>todos os registros permanentemente</strong> e não poderá ser desfeita.
                      Os participantes não poderão mais ser validados até que uma nova base seja importada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleClearBaseOficial} 
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Confirmar Limpeza
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;