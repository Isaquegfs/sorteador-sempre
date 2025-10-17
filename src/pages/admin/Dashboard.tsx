import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [stats, setStats] = useState({
    participantes: 0,
    baseOficial: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [participantesRes, baseRes] = await Promise.all([
      supabase.from('participantes').select('*', { count: 'exact', head: true }),
      supabase.from('base_oficial').select('*', { count: 'exact', head: true }),
    ]);

    setStats({
      participantes: participantesRes.count || 0,
      baseOficial: baseRes.count || 0,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2">
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
      </div>
    </div>
  );
};

export default Dashboard;
