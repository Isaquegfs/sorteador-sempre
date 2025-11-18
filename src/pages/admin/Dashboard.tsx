import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Database, Trophy, Sparkles, TrendingUp, Calendar, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTestModeQuery } from '@/hooks/useTestModeQuery';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SorteioRealizado {
  id: string;
  data_inicio: string;
  data_fim: string;
  total_participantes: number;
  created_at: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    participantes: 0,
    baseOficial: 0,
    sorteados: 0,
    premiosTotal: 0,
    premiosSorteados: 0,
    sorteiosRealizados: 0,
  });
  const [sorteiosData, setSorteiosData] = useState<SorteioRealizado[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [estatisticas, setEstatisticas] = useState({
    media: 0,
    maiorSorteio: { total: 0, data: '' },
    crescimento: 0,
  });
  const { testFilter } = useTestModeQuery();

  useEffect(() => {
    loadStats();
    loadSorteiosData();
  }, [testFilter]);

  const loadStats = async () => {
    const [participantesRes, baseRes, sorteadosRes, premiosRes, premiosSorteadosRes, configRes] = await Promise.all([
      supabase.from('participantes').select('*', { count: 'exact', head: true }).eq('is_test', testFilter),
      supabase.from('base_oficial').select('*', { count: 'exact', head: true }).eq('is_test', testFilter),
      supabase.from('sorteados').select('*', { count: 'exact', head: true }).eq('is_test', testFilter),
      supabase.from('premios').select('*', { count: 'exact', head: true }).eq('is_test', testFilter),
      supabase.from('sorteados').select('premio_id', { count: 'exact', head: true }).not('premio_id', 'is', null).eq('is_test', testFilter),
      supabase.from('sistema_config').select('total_sorteios_realizados').single(),
    ]);

    setStats({
      participantes: participantesRes.count || 0,
      baseOficial: baseRes.count || 0,
      sorteados: sorteadosRes.count || 0,
      premiosTotal: premiosRes.count || 0,
      premiosSorteados: premiosSorteadosRes.count || 0,
      sorteiosRealizados: configRes.data?.total_sorteios_realizados || 0,
    });
  };

  const loadSorteiosData = async () => {
    try {
      const { data, error } = await supabase
        .from('sorteios_realizados')
        .select('*')
        .eq('is_test', testFilter)
        .order('data_fim', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setSorteiosData(data);
        
        // Preparar dados para o gráfico
        const chartFormatted = data.map((sorteio) => ({
          data: format(new Date(sorteio.data_fim), 'dd/MM', { locale: ptBR }),
          participantes: sorteio.total_participantes,
          dataCompleta: format(new Date(sorteio.data_fim), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
        }));
        setChartData(chartFormatted);

        // Calcular estatísticas
        const totalParticipantes = data.reduce((acc, s) => acc + s.total_participantes, 0);
        const media = Math.round(totalParticipantes / data.length);
        
        const maiorSorteioData = data.reduce((max, s) => 
          s.total_participantes > max.total_participantes ? s : max
        );
        
        // Calcular crescimento (comparar último mês com mês anterior)
        const agora = new Date();
        const umMesAtras = new Date(agora.getFullYear(), agora.getMonth() - 1, agora.getDate());
        const doisMesesAtras = new Date(agora.getFullYear(), agora.getMonth() - 2, agora.getDate());
        
        const sorteiosMesAtual = data.filter(s => new Date(s.data_fim) >= umMesAtras);
        const sorteiosMesAnterior = data.filter(s => 
          new Date(s.data_fim) >= doisMesesAtras && new Date(s.data_fim) < umMesAtras
        );
        
        const totalMesAtual = sorteiosMesAtual.reduce((acc, s) => acc + s.total_participantes, 0);
        const totalMesAnterior = sorteiosMesAnterior.reduce((acc, s) => acc + s.total_participantes, 0);
        
        const crescimento = totalMesAnterior > 0 
          ? Math.round(((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100)
          : 0;

        setEstatisticas({
          media,
          maiorSorteio: {
            total: maiorSorteioData.total_participantes,
            data: format(new Date(maiorSorteioData.data_fim), "dd/MM/yyyy", { locale: ptBR }),
          },
          crescimento,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados de sorteios:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cadastros no Sorteio
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.participantes}</div>
            <p className="text-xs text-muted-foreground">
              Participantes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Base Oficial
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.baseOficial}</div>
            <p className="text-xs text-muted-foreground">
              Registros na base oficial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sorteados
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sorteados}</div>
            <p className="text-xs text-muted-foreground">
              Total de vencedores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sorteios Realizados
            </CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sorteiosRealizados}</div>
            <p className="text-xs text-muted-foreground">
              Total de sorteios concluídos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prêmios Cadastrados
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.premiosTotal}</div>
            <p className="text-xs text-muted-foreground">
              Total de prêmios na lista
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prêmios Sorteados
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.premiosSorteados}</div>
            <p className="text-xs text-muted-foreground">
              Prêmios já distribuídos
            </p>
          </CardContent>
        </Card>
      </div>

      {sorteiosData.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mt-8">Análise de Sorteios</h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Média de Participantes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.media}</div>
                <p className="text-xs text-muted-foreground">
                  Por sorteio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Maior Sorteio
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.maiorSorteio.total}</div>
                <p className="text-xs text-muted-foreground">
                  Em {estatisticas.maiorSorteio.data}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Crescimento Mensal
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${estatisticas.crescimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {estatisticas.crescimento > 0 ? '+' : ''}{estatisticas.crescimento}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Comparado ao mês anterior
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Evolução de Participantes
              </CardTitle>
              <CardDescription>
                Acompanhe o número de participantes ao longo dos sorteios realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  participantes: {
                    label: 'Participantes',
                    color: 'hsl(var(--primary))',
                  },
                }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="data" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {payload[0].payload.dataCompleta}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium">
                                    Participantes:
                                  </span>
                                  <span className="text-xs font-bold">
                                    {payload[0].value}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="participantes" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
