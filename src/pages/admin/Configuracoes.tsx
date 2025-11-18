import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTestMode } from '@/contexts/TestModeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Trash2, Clock, Calendar as CalendarIcon, PlayCircle, FlaskConical } from 'lucide-react';
import { parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

const Configuracoes = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingBase, setIsClearingBase] = useState(false);
  const [isCheckingNow, setIsCheckingNow] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [dataFechamento, setDataFechamento] = useState('');
  const [horaFechamento, setHoraFechamento] = useState('');
  const [fechamentoAutomaticoAtivo, setFechamentoAutomaticoAtivo] = useState(false);
  const [tempoConfirmacao, setTempoConfirmacao] = useState(40);
  const [sorteioComPremios, setSorteioComPremios] = useState(false);
  const [ativarContadorTempo, setAtivarContadorTempo] = useState(false);
  const [sistemaConfigId, setSistemaConfigId] = useState<string | null>(null);
  const [currentTimeBr, setCurrentTimeBr] = useState('');
  const [checkNowResult, setCheckNowResult] = useState<any>(null);
  const { toast } = useToast();
  const { isTestMode, isLoading: testModeLoading, activateTestMode, deactivateTestMode } = useTestMode();

  useEffect(() => {
    loadConfig();
    
    // Atualizar horário de Brasília a cada segundo
    const timeInterval = setInterval(() => {
      setCurrentTimeBr(formatInTimeZone(new Date(), TIMEZONE, 'dd/MM/yyyy HH:mm:ss'));
    }, 1000);
    
    // Verificar status do agendamento a cada minuto
    const scheduleInterval = setInterval(() => {
      checkSchedule();
    }, 60000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(scheduleInterval);
    };
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
          // Converter UTC para horário de Brasília
          const utcDate = new Date(data.data_fechamento_agendado);
          setDataFechamento(formatInTimeZone(utcDate, TIMEZONE, 'yyyy-MM-dd'));
          setHoraFechamento(formatInTimeZone(utcDate, TIMEZONE, 'HH:mm'));
        }
      }

      // Carregar tempo de confirmação e sorteio com prêmios
      const { data: configData } = await supabase
        .from('sistema_config')
        .select('id, tempo_confirmacao_segundos, sorteio_com_premios, ativar_contador_tempo')
        .single();

      if (configData) {
        setSistemaConfigId(configData.id);
        if (configData.tempo_confirmacao_segundos) {
          setTempoConfirmacao(configData.tempo_confirmacao_segundos);
        }
        setSorteioComPremios(configData.sorteio_com_premios || false);
        setAtivarContadorTempo(configData.ativar_contador_tempo || false);
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
        await loadConfig();
      }
    } catch (error) {
      console.error('Erro ao verificar agendamento:', error);
    }
  };

  const checkNow = async () => {
    setIsCheckingNow(true);
    setCheckNowResult(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-form-schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();
      setCheckNowResult(result);

      if (response.ok) {
        toast({
          title: 'Verificação executada',
          description: result.message || 'Verificação concluída com sucesso',
        });
        
        if (result.message?.includes('fechado')) {
          await loadConfig();
        }
      } else {
        toast({
          title: 'Erro na verificação',
          description: result.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao verificar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingNow(false);
    }
  };

  const handleSave = async () => {
    if (!configId || !sistemaConfigId) {
      toast({
        title: 'Erro',
        description: 'Configuração não encontrada',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      let dataFechamentoAgendado = null;
      
      if (fechamentoAutomaticoAtivo && dataFechamento && horaFechamento) {
        // Criar data "ingênua" no horário de Brasília
        const naiveDate = parse(
          `${dataFechamento} ${horaFechamento}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );
        
        // Converter para UTC
        const utcDate = fromZonedTime(naiveDate, TIMEZONE);
        dataFechamentoAgendado = utcDate.toISOString();
      }

      const updateData: any = {
        aberto: formularioAberto,
        fechamento_automatico_ativo: fechamentoAutomaticoAtivo,
        data_fechamento_agendado: dataFechamentoAgendado,
        updated_at: new Date().toISOString(),
      };

      if (formularioAberto) {
        updateData.data_abertura = new Date().toISOString();
        updateData.data_fechamento = null;
      }

      const { error: updateError } = await supabase
        .from('formulario_config')
        .update(updateData)
        .eq('id', configId);

      if (updateError) throw updateError;

      const { error: configError } = await supabase
        .from('sistema_config')
        .update({
          tempo_confirmacao_segundos: tempoConfirmacao,
          sorteio_com_premios: sorteioComPremios,
          ativar_contador_tempo: ativarContadorTempo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sistemaConfigId);

      if (configError) throw configError;

      toast({
        title: 'Configurações salvas',
        description: 'As alterações foram aplicadas com sucesso',
      });

      await loadConfig();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
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

    const naiveDate = parse(
      `${dataFechamento} ${horaFechamento}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );
    const formattedDate = formatInTimeZone(
      fromZonedTime(naiveDate, TIMEZONE),
      TIMEZONE,
      "dd/MM/yyyy 'às' HH:mm",
      { locale: ptBR }
    );

    return `Fechamento agendado para ${formattedDate} (Horário de Brasília)`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as configurações do sistema de sorteio
        </p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="geral">Configurações Gerais</TabsTrigger>
          <TabsTrigger value="dados">Gerenciar Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Formulário de Inscrição</CardTitle>
              <CardDescription className="text-sm">
                Controle se o formulário público está aberto para novas inscrições
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {getScheduleMessage()}
                  </p>
                </div>
              )}

              {/* Seção de fechamento automático */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="fechamento-automatico">Fechamento Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Agendar fechamento do formulário
                    </p>
                  </div>
                  <Switch
                    id="fechamento-automatico"
                    checked={fechamentoAutomaticoAtivo}
                    onCheckedChange={setFechamentoAutomaticoAtivo}
                  />
                </div>

                {fechamentoAutomaticoAtivo && (
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dataFechamento">
                          <CalendarIcon className="inline mr-2 h-4 w-4" />
                          Data
                        </Label>
                        <Input
                          id="dataFechamento"
                          type="date"
                          value={dataFechamento}
                          onChange={(e) => setDataFechamento(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="horaFechamento">
                          <Clock className="inline mr-2 h-4 w-4" />
                          Horário (Brasília)
                        </Label>
                        <Input
                          id="horaFechamento"
                          type="time"
                          value={horaFechamento}
                          onChange={(e) => setHoraFechamento(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {dataFechamento && horaFechamento && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelSchedule}
                          className="w-full"
                        >
                          Cancelar Agendamento
                        </Button>
                        
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={checkNow}
                          disabled={isCheckingNow}
                          className="w-full"
                        >
                          {isCheckingNow ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verificando...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Executar Verificação Agora
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    
                    {checkNowResult && (
                      <Alert>
                        <AlertTitle>Resultado da Verificação</AlertTitle>
                        <AlertDescription>
                          <pre className="mt-2 text-xs overflow-auto">
                            {JSON.stringify(checkNowResult, null, 2)}
                          </pre>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Configurações do Sorteio
              </CardTitle>
              <CardDescription className="text-sm">
                Configure o comportamento do sorteador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tempoConfirmacao">Tempo de Confirmação (segundos)</Label>
                <Input
                  id="tempoConfirmacao"
                  type="number"
                  min={1}
                  max={300}
                  value={tempoConfirmacao}
                  onChange={(e) => setTempoConfirmacao(Number(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Tempo usado quando o contador está ativo
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="sorteioComPremios">Ativar sorteio com prêmios</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, o sorteio exibirá prêmios, timer de confirmação e validação obrigatória
                  </p>
                </div>
                <Switch
                  id="sorteioComPremios"
                  checked={sorteioComPremios}
                  onCheckedChange={setSorteioComPremios}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="ativarContadorTempo">Ativar contador de tempo</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibe o timer de confirmação mesmo em sorteios sem prêmios (opcional)
                  </p>
                </div>
                <Switch
                  id="ativarContadorTempo"
                  checked={ativarContadorTempo}
                  onCheckedChange={setAtivarContadorTempo}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Modo de Testes
              </CardTitle>
              <CardDescription className="text-sm">
                Simule operações sem afetar os dados reais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTestMode && (
                <Alert>
                  <AlertTitle className="text-sm font-semibold">🧪 Modo de Testes Ativo</AlertTitle>
                  <AlertDescription className="text-xs">
                    Todas as operações estão sendo realizadas em ambiente de simulação. 
                    Os dados reais não serão afetados.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Quando ativado, o sistema cria uma cópia dos dados atuais e todas as ações 
                  (sorteios, alterações, etc.) acontecem apenas nessa camada temporária.
                </p>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Status: {isTestMode ? 'Ativo' : 'Desativado'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isTestMode 
                        ? 'Operando em ambiente de simulação' 
                        : 'Operando com dados reais'}
                    </p>
                  </div>
                  <Switch
                    checked={isTestMode}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        activateTestMode();
                      } else {
                        deactivateTestMode();
                      }
                    }}
                    disabled={testModeLoading}
                  />
                </div>
                
                {isTestMode && (
                  <Alert variant="destructive" className="text-xs">
                    <AlertDescription>
                      Ao desativar o Modo de Testes, todos os dados de simulação serão 
                      permanentemente descartados e o sistema retornará ao estado anterior.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="dados" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Limpar Participantes
                </CardTitle>
                <CardDescription className="text-sm">
                  Remove todos os participantes do sorteio atual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Remove todos os cadastros da tabela de participantes. A base oficial não é afetada.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isClearing} className="w-full">
                      {isClearing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Limpando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Limpar
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
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Limpar Base Oficial
                </CardTitle>
                <CardDescription className="text-sm">
                  Remove TODOS os registros da Base Oficial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  ⚠️ Remove <strong>TODOS</strong> os registros da base de referência permanentemente. Use com extremo cuidado!
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={isClearingBase}
                      className="w-full bg-destructive/80 hover:bg-destructive border border-destructive"
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;