import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface Sorteado {
  id: string;
  nome: string;
  setor: string;
  cidade: string;
  sorteado_em: string;
  confirmado: boolean | null;
  confirmado_em: string | null;
}

const Historico = () => {
  const [sorteados, setSorteados] = useState<Sorteado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSorteados();
  }, []);

  const loadSorteados = async () => {
    try {
      const { data, error } = await supabase
        .from('sorteados')
        .select('id, nome, setor, cidade, sorteado_em, confirmado, confirmado_em')
        .order('sorteado_em', { ascending: false });

      if (error) throw error;

      setSorteados(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar histórico',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistorico = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('sorteados')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast({
        title: 'Histórico apagado com sucesso!',
        description: 'Todos os registros de ganhadores foram removidos.',
      });

      setSorteados([]);
    } catch (error) {
      toast({
        title: 'Erro ao apagar histórico',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Sorteios</h1>
          <p className="text-muted-foreground mt-2">
            Visualize todos os ganhadores dos sorteios anteriores
          </p>
        </div>
        {sorteados.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Apagar Histórico
          </Button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja apagar todo o histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {sorteados.length} registro(s) de ganhadores serão permanentemente removidos.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHistorico}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, Apagar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Vencedores
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorteados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                      <TableCell>
                        {sorteado.confirmado === null ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pendente
                          </Badge>
                        ) : sorteado.confirmado ? (
                          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Confirmado
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Não confirmado
                          </Badge>
                        )}
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

export default Historico;
