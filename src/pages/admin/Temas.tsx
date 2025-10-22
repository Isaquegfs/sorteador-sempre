import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, Upload, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Tema {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string;
  ativo: boolean;
  created_at: string;
}

const Temas = () => {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTemas();
  }, []);

  const loadTemas = async () => {
    try {
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemas(data || []);
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
      toast({
        title: 'Erro ao carregar temas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 5MB',
          variant: 'destructive',
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !imageFile) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload da imagem
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('temas')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('temas')
        .getPublicUrl(filePath);

      // Criar tema
      const { error: insertError } = await supabase
        .from('temas')
        .insert({
          nome,
          descricao: descricao || null,
          imagem_url: publicUrl,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Tema criado com sucesso!',
      });

      // Limpar formulário
      setNome('');
      setDescricao('');
      setImageFile(null);
      setPreviewUrl(null);

      // Recarregar temas
      await loadTemas();
    } catch (error) {
      console.error('Erro ao criar tema:', error);
      toast({
        title: 'Erro ao criar tema',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivate = async (id: string) => {
    setActivatingId(id);
    try {
      const { error } = await supabase
        .from('temas')
        .update({ ativo: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tema ativado com sucesso!',
      });

      await loadTemas();
    } catch (error) {
      console.error('Erro ao ativar tema:', error);
      toast({
        title: 'Erro ao ativar tema',
        variant: 'destructive',
      });
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (id: string, imagemUrl: string) => {
    setDeletingId(id);
    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = imagemUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Deletar arquivo do storage
      await supabase.storage.from('temas').remove([fileName]);

      // Deletar registro do banco
      const { error } = await supabase
        .from('temas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tema removido com sucesso!',
      });

      await loadTemas();
    } catch (error) {
      console.error('Erro ao deletar tema:', error);
      toast({
        title: 'Erro ao deletar tema',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
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
        <h1 className="text-3xl font-bold">Temas dos Sorteios</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os fundos temáticos das páginas públicas
        </p>
      </div>

      {/* Formulário de upload */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Tema</CardTitle>
          <CardDescription>
            Faça upload de uma imagem para usar como fundo nas páginas públicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Tema *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Natal 2025"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva este tema..."
                disabled={isUploading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagem">Imagem do Fundo *</Label>
              <Input
                id="imagem"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <p className="text-sm text-muted-foreground">
                Formato: JPG, PNG ou WebP. Máximo: 5MB
              </p>
            </div>

            {previewUrl && (
              <div className="space-y-2">
                <Label>Prévia</Label>
                <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando tema...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Criar Tema
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de temas */}
      <Card>
        <CardHeader>
          <CardTitle>Temas Disponíveis</CardTitle>
          <CardDescription>
            Clique em "Ativar" para aplicar o tema às páginas públicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {temas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum tema cadastrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Preview</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {temas.map((tema) => (
                  <TableRow key={tema.id}>
                    <TableCell>
                      <div className="relative w-40 h-20 rounded overflow-hidden border">
                        <img
                          src={tema.imagem_url}
                          alt={tema.nome}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{tema.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tema.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      {tema.ativo ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Ativo
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!tema.ativo && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivate(tema.id)}
                            disabled={activatingId === tema.id}
                          >
                            {activatingId === tema.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-1" />
                                Ativar
                              </>
                            )}
                          </Button>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={deletingId === tema.id}
                            >
                              {deletingId === tema.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Tem certeza que deseja deletar este tema?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                O tema <strong>{tema.nome}</strong> será removido permanentemente.
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(tema.id, tema.imagem_url)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Sim, Deletar
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
};

export default Temas;