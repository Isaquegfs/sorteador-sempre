import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shuffle, Trophy } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Participante {
  id: string;
  nome: string;
  email: string;
  setor: string;
  cidade: string;
  cpf_censurado: string;
}

interface Sorteado {
  id: string;
  nome: string;
  setor: string;
  cidade: string;
  sorteado_em: string;
}

const Sorteio = () => {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [sorteados, setSorteados] = useState<Sorteado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSorteando, setIsSorteando] = useState(false);
  const [numVencedores, setNumVencedores] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar participantes
      const { data: participantesData, error: participantesError } = await supabase
        .from('participantes')
        .select('*')
        .order('created_at', { ascending: false });

      if (participantesError) throw participantesError;

      // Carregar sorteados
      const { data: sorteadosData, error: sorteadosError } = await supabase
        .from('sorteados')
        .select('*')
        .order('sorteado_em', { ascending: false });

      if (sorteadosError) throw sorteadosError;

      setParticipantes(participantesData || []);
      setSorteados(sorteadosData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const realizarSorteio = async () => {
    if (participantes.length === 0) {
      toast({
        title: 'Nenhum participante',
        description: 'Não há participantes para sortear.',
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

    setIsSorteando(true);

    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      // Embaralhar e selecionar vencedores
      const shuffled = [...participantes].sort(() => Math.random() - 0.5);
      const vencedores = shuffled.slice(0, numVencedores);

      // Preparar dados para inserção
      const sorteadosData = vencedores.map(vencedor => ({
        participante_id: vencedor.id,
        nome: vencedor.nome,
        setor: vencedor.setor,
        cidade: vencedor.cidade,
        sorteado_por: user?.id,
      }));

      // Inserir na tabela de sorteados
      const { error } = await supabase
        .from('sorteados')
        .insert(sorteadosData);

      if (error) throw error;

      toast({
        title: 'Sorteio realizado!',
        description: `${numVencedores} vencedor(es) sorteado(s) com sucesso!`,
      });

      // Recarregar dados
      await loadData();
      setNumVencedores(1);
    } catch (error) {
      console.error('Erro ao realizar sorteio:', error);
      toast({
        title: 'Erro ao realizar sorteio',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsSorteando(false);
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
        <h1 className="text-3xl font-bold">Sorteio</h1>
        <p className="text-muted-foreground mt-2">
          Realize sorteios entre os participantes cadastrados
        </p>
      </div>

      {/* Card de Sorteio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Realizar Sorteio
          </CardTitle>
          <CardDescription>
            {participantes.length} participante(s) elegível(is)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="num-vencedores">Número de vencedores</Label>
            <Input
              id="num-vencedores"
              type="number"
              min="1"
              max={participantes.length}
              value={numVencedores}
              onChange={(e) => setNumVencedores(parseInt(e.target.value) || 1)}
              className="max-w-xs"
            />
          </div>

          <Button
            onClick={realizarSorteio}
            disabled={isSorteando || participantes.length === 0}
            className="w-full sm:w-auto"
          >
            {isSorteando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sorteando...
              </>
            ) : (
              <>
                <Shuffle className="mr-2 h-4 w-4" />
                Sortear
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de Sorteados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Histórico de Sorteados
          </CardTitle>
          <CardDescription>
            {sorteados.length} vencedor(es) no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Data do Sorteio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorteados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum sorteio realizado ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  sorteados.map((sorteado) => (
                    <TableRow key={sorteado.id}>
                      <TableCell className="font-medium">{sorteado.nome}</TableCell>
                      <TableCell>{sorteado.setor}</TableCell>
                      <TableCell>{sorteado.cidade}</TableCell>
                      <TableCell>
                        {new Date(sorteado.sorteado_em).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sorteio;
