import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database, Trophy, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [stats, setStats] = useState({
    participantes: 0,
    baseOficial: 0,
    sorteados: 0,
    premiosTotal: 0,
    premiosSorteados: 0,
    sorteiosRealizados: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [participantesRes, baseRes, sorteadosRes, premiosRes, premiosSorteadosRes, configRes] = await Promise.all([
      supabase.from('participantes').select('*', { count: 'exact', head: true }),
      supabase.from('base_oficial').select('*', { count: 'exact', head: true }),
      supabase.from('sorteados').select('*', { count: 'exact', head: true }),
      supabase.from('premios').select('*', { count: 'exact', head: true }),
      supabase.from('sorteados').select('premio_id', { count: 'exact', head: true }).not('premio_id', 'is', null),
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
    </div>
  );
};

export default Dashboard;
