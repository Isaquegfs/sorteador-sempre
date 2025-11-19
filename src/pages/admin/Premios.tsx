import { useState, useEffect } from 'react';
import { Gift, Plus, Pencil, Trash2, GripVertical, ChevronUp, ChevronDown, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTestModeQuery } from '@/hooks/useTestModeQuery';

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

interface ImportPreviewItem {
  nome: string;
  descricao: string;
  valido: boolean;
  erro?: string;
}

export default function Premios() {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [premiosSorteados, setPremiosSorteados] = useState<Premio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descricao: '',
    status: 'Disponível',
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [temCabecalho, setTemCabecalho] = useState(true);
  const [activeTab, setActiveTab] = useState('premios');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadPremios();
    loadPremiosSorteados();
  }, []);

  const loadPremios = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('premios')
        .select('*')
        .in('status', ['Disponível', 'Reprogramado'])
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

  const loadPremiosSorteados = async () => {
    try {
      const { data, error } = await supabase
        .from('premios')
        .select('*')
        .eq('status', 'Sorteado')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPremiosSorteados((data || []) as Premio[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar prêmios sorteados',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getNextOrdem = async (): Promise<number> => {
    try {
      // Buscar o valor máximo de ordem diretamente do banco, considerando TODOS os status
      const { data, error } = await supabase
        .from('premios')
        .select('ordem')
        .order('ordem', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Se não houver prêmios, começar do 1
        if (error.code === 'PGRST116') return 1;
        throw error;
      }

      return (data?.ordem || 0) + 1;
    } catch (error) {
      console.error('Erro ao obter próxima ordem:', error);
      return 1;
    }
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
      loadPremiosSorteados();
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
      loadPremiosSorteados();
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = premios.findIndex((p) => p.id === active.id);
    const newIndex = premios.findIndex((p) => p.id === over.id);

    const newPremios = arrayMove(premios, oldIndex, newIndex);
    
    // Atualizar estado local imediatamente para feedback visual
    setPremios(newPremios);

    // Salvar no banco de dados
    try {
      const updates = newPremios.map((premio, index) => ({
        id: premio.id,
        ordem: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('premios')
          .update({ ordem: update.ordem })
          .eq('id', update.id);
      }

      toast({
        title: 'Alteração salva com sucesso',
        description: 'A ordem dos prêmios foi atualizada',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao reordenar',
        description: error.message,
        variant: 'destructive',
      });
      loadPremios(); // Recarregar em caso de erro
      loadPremiosSorteados();
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newPremios = [...premios];
    [newPremios[index - 1], newPremios[index]] = [newPremios[index], newPremios[index - 1]];
    
    setPremios(newPremios);

    try {
      await supabase
        .from('premios')
        .update({ ordem: index })
        .eq('id', newPremios[index - 1].id);

      await supabase
        .from('premios')
        .update({ ordem: index + 1 })
        .eq('id', newPremios[index].id);

      toast({
        title: 'Alteração salva com sucesso',
        description: 'Prêmio movido para cima',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao mover prêmio',
        description: error.message,
        variant: 'destructive',
      });
      loadPremios();
      loadPremiosSorteados();
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === premios.length - 1) return;

    const newPremios = [...premios];
    [newPremios[index], newPremios[index + 1]] = [newPremios[index + 1], newPremios[index]];
    
    setPremios(newPremios);

    try {
      await supabase
        .from('premios')
        .update({ ordem: index + 2 })
        .eq('id', newPremios[index].id);

      await supabase
        .from('premios')
        .update({ ordem: index + 1 })
        .eq('id', newPremios[index + 1].id);

      toast({
        title: 'Alteração salva com sucesso',
        description: 'Prêmio movido para baixo',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao mover prêmio',
        description: error.message,
        variant: 'destructive',
      });
      loadPremios();
      loadPremiosSorteados();
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo XLSX ou XLS',
        variant: 'destructive',
      });
      return;
    }

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Pular primeira linha se tem cabeçalho
        const startRow = temCabecalho ? 1 : 0;

        const preview: ImportPreviewItem[] = [];

        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const nome = row[0]?.toString().trim() || '';
          const descricao = row[1]?.toString().trim() || '';

          if (!nome) {
            preview.push({
              nome: '(vazio)',
              descricao: descricao,
              valido: false,
              erro: 'Nome obrigatório',
            });
            continue;
          }

          if (nome.length < 3) {
            preview.push({
              nome: nome,
              descricao: descricao,
              valido: false,
              erro: 'Nome deve ter pelo menos 3 caracteres',
            });
            continue;
          }

          if (nome.length > 200) {
            preview.push({
              nome: nome,
              descricao: descricao,
              valido: false,
              erro: 'Nome muito longo (máx 200 caracteres)',
            });
            continue;
          }

          preview.push({
            nome: nome,
            descricao: descricao,
            valido: true,
          });
        }

        setImportPreview(preview);

        if (preview.length === 0) {
          toast({
            title: 'Arquivo vazio',
            description: 'Não foram encontrados dados válidos no arquivo',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        toast({
          title: 'Erro ao processar arquivo',
          description: error.message,
          variant: 'destructive',
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleImportConfirm = async () => {
    const validItems = importPreview.filter(item => item.valido);

    if (validItems.length === 0) {
      toast({
        title: 'Nenhum item válido',
        description: 'Não há prêmios válidos para importar',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const nextOrdem = await getNextOrdem();

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const { error } = await supabase.from('premios').insert({
          nome: item.nome,
          descricao: item.descricao || null,
          status: 'Disponível',
          ordem: nextOrdem + i,
        });

        if (error) throw error;
      }

      const invalidCount = importPreview.length - validItems.length;

      toast({
        title: 'Importação concluída',
        description: `${validItems.length} prêmio(s) importado(s) com sucesso${invalidCount > 0 ? `. ${invalidCount} item(ns) ignorado(s) por erros.` : ''}`,
      });

      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview([]);
      setTemCabecalho(true);
      loadPremios();
      loadPremiosSorteados();
    } catch (error: any) {
      toast({
        title: 'Erro ao importar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setShowImportDialog(false);
    setImportFile(null);
    setImportPreview([]);
    setTemCabecalho(true);
  };

  const getStatusVariant = (
    status: PremioStatus
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Disponível':
        return 'default';
      case 'Sorteado':
        return 'default'; // Usar default com classe customizada para laranja
      case 'Reprogramado':
        return 'outline';
      case 'Cancelado':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Componente para linha arrastável
  interface SortableRowProps {
    premio: Premio;
    index: number;
  }

  const SortableRow = ({ premio, index }: SortableRowProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: premio.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted/50' : ''}>
        <TableCell className="w-12">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </TableCell>
        <TableCell className="font-bold">{index + 1}</TableCell>
        <TableCell className="font-medium">{premio.nome}</TableCell>
        <TableCell>
          {premio.descricao
            ? premio.descricao.substring(0, 50) +
              (premio.descricao.length > 50 ? '...' : '')
            : '-'}
        </TableCell>
        <TableCell>
          <Badge 
            variant={getStatusVariant(premio.status)}
            className={premio.status === 'Sorteado' ? 'bg-[hsl(17,86%,58%)] hover:bg-[hsl(17,86%,58%)]/90' : ''}
          >
            {premio.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMoveUp(index)}
              disabled={index === 0}
              title="Mover para cima"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMoveDown(index)}
              disabled={index === premios.length - 1}
              title="Mover para baixo"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(premio)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Excluir">
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
    );
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar XLSX
          </Button>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Prêmio
          </Button>
        </div>
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

      {/* Tabela com Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="premios">
            Prêmios ({premios.length})
          </TabsTrigger>
          <TabsTrigger value="sorteados">
            Sorteados ({premiosSorteados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="premios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Lista de Prêmios
              </CardTitle>
              <CardDescription>
                Arraste as linhas para reordenar ou use os botões de seta
              </CardDescription>
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-20">Ordem</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="text-right w-48">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={premios.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {premios.map((premio, index) => (
                          <SortableRow key={premio.id} premio={premio} index={index} />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sorteados">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Prêmios Sorteados
              </CardTitle>
              <CardDescription>
                Lista de todos os prêmios já sorteados. As informações sobre os ganhadores estão no histórico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : premiosSorteados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum prêmio sorteado ainda
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Ordem</TableHead>
                      <TableHead>Nome do Prêmio</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Atualização</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {premiosSorteados.map((premio) => (
                      <TableRow key={premio.id}>
                        <TableCell className="font-medium">{premio.ordem}</TableCell>
                        <TableCell className="font-medium">{premio.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {premio.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="default"
                            className="bg-[hsl(17,86%,58%)] hover:bg-[hsl(17,86%,58%)]/90"
                          >
                            {premio.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(premio.updated_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Importação */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Prêmios via XLSX
            </DialogTitle>
            <DialogDescription>
              Selecione um arquivo XLSX com os prêmios. Formato: Coluna A = Nome (obrigatório), Coluna B = Descrição (opcional)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Opção de Cabeçalho */}
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="tem-cabecalho"
                checked={temCabecalho}
                onCheckedChange={(checked) => setTemCabecalho(checked as boolean)}
              />
              <Label htmlFor="tem-cabecalho" className="cursor-pointer font-normal">
                O arquivo contém linha de cabeçalho
              </Label>
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Arquivo XLSX</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>

            {/* Preview */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Preview ({importPreview.length} item(ns))</Label>
                  <div className="text-sm text-muted-foreground">
                    {importPreview.filter(i => i.valido).length} válido(s) • {' '}
                    {importPreview.filter(i => !i.valido).length} com erro(s)
                  </div>
                </div>

                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((item, index) => (
                        <TableRow key={index} className={!item.valido ? 'bg-destructive/10' : ''}>
                          <TableCell>
                            {item.valido ? (
                              <Badge variant="default" className="text-xs">OK</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Erro</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell>
                            {item.descricao
                              ? item.descricao.substring(0, 40) + (item.descricao.length > 40 ? '...' : '')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-destructive text-sm">
                            {item.erro || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleImportCancel}
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={importPreview.length === 0 || importPreview.filter(i => i.valido).length === 0 || isImporting}
            >
              {isImporting ? 'Importando...' : `Importar ${importPreview.filter(i => i.valido).length} Prêmio(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
