import { useState, useEffect } from 'react';
import { Gift, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type PremioStatus = 'Disponível' | 'Sorteado' | 'Reprogramado' | 'Cancelado';

interface Premio {
  id: string;
  nome: string;
  descricao: string | null;
  status: PremioStatus;
  ordem: number;
  created_at: string;
  updated_at: string;
}

interface FormData {
  nome: string;
  descricao: string;
  status: PremioStatus;
}

export default function Premios() {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descricao: '',
    status: 'Disponível',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPremios();
  }, []);

  const loadPremios = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('premios')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setPremios((data || []) as Premio[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar prêmios',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getNextOrdem = async (): Promise<number> => {
    if (premios.length === 0) return 1;
    const maxOrdem = Math.max(...premios.map(p => p.ordem));
    return maxOrdem + 1;
  };

  const validateForm = (): boolean => {
    if (!formData.nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, preencha o nome do prêmio',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.nome.trim().length < 3) {
      toast({
        title: 'Nome muito curto',
        description: 'O nome deve ter pelo menos 3 caracteres',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.nome.length > 200) {
      toast({
        title: 'Nome muito longo',
        description: 'O nome deve ter no máximo 200 caracteres',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.descricao && formData.descricao.length > 1000) {
      toast({
        title: 'Descrição muito longa',
        description: 'A descrição deve ter no máximo 1000 caracteres',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (editingId) {
        // Atualizar prêmio existente
        const { error } = await supabase
          .from('premios')
          .update({
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || null,
            status: formData.status,
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Prêmio atualizado',
          description: 'O prêmio foi atualizado com sucesso',
        });
      } else {
        // Criar novo prêmio
        const nextOrdem = await getNextOrdem();
        const { error } = await supabase.from('premios').insert({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          status: 'Disponível',
          ordem: nextOrdem,
        });

        if (error) throw error;

        toast({
          title: 'Prêmio criado',
          description: 'O prêmio foi criado com sucesso',
        });
      }

      handleCancel();
      loadPremios();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar prêmio',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (premio: Premio) => {
    setFormData({
      nome: premio.nome,
      descricao: premio.descricao || '',
      status: premio.status,
    });
    setEditingId(premio.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('premios').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Prêmio excluído',
        description: 'O prêmio foi excluído com sucesso',
      });

      // Reordenar prêmios após exclusão
      await reorderPremios();
      loadPremios();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir prêmio',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const reorderPremios = async () => {
    try {
      const { data, error } = await supabase
        .from('premios')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;

      // Reordenar sequencialmente
      const updates = data.map((premio, index) => ({
        id: premio.id,
        ordem: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('premios')
          .update({ ordem: update.ordem })
          .eq('id', update.id);
      }
    } catch (error: any) {
      console.error('Erro ao reordenar prêmios:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      nome: '',
      descricao: '',
      status: 'Disponível',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getStatusVariant = (
    status: PremioStatus
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Disponível':
        return 'default';
      case 'Sorteado':
        return 'secondary';
      case 'Reprogramado':
        return 'outline';
      case 'Cancelado':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Prêmios</h1>
          <p className="text-muted-foreground mt-2">
            Total de {premios.length} prêmio(s) cadastrado(s)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Prêmio
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Editar Prêmio' : 'Novo Prêmio'}
            </CardTitle>
            <CardDescription>
              {editingId
                ? 'Atualize as informações do prêmio'
                : 'Preencha os dados do novo prêmio'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Prêmio *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Notebook Dell"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Descreva o prêmio em detalhes..."
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.descricao.length}/1000 caracteres
                </p>
              </div>

              {editingId && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: PremioStatus) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disponível">Disponível</SelectItem>
                      <SelectItem value="Sorteado">Sorteado</SelectItem>
                      <SelectItem value="Reprogramado">Reprogramado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Lista de Prêmios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : premios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prêmio cadastrado ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Ordem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="text-right w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {premios.map((premio) => (
                  <TableRow key={premio.id}>
                    <TableCell className="font-bold">{premio.ordem}</TableCell>
                    <TableCell className="font-medium">{premio.nome}</TableCell>
                    <TableCell>
                      {premio.descricao
                        ? premio.descricao.substring(0, 50) +
                          (premio.descricao.length > 50 ? '...' : '')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(premio.status)}>
                        {premio.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(premio)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Confirmar exclusão
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o prêmio "
                                {premio.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(premio.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
