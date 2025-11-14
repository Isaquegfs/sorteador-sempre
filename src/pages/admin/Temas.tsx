import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { Loader2, Upload, Trash2, Eye, CheckCircle2, Pencil } from 'lucide-react';
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
  logo_url: string | null;
  cor_titulo: string;
  estilo_titulo: 'cor' | 'degrade' | 'textura';
  degrade_inicio: string | null;
  degrade_fim: string | null;
  degrade_direcao: string | null;
  textura_url: string | null;
  ativo: boolean;
  created_at: string;
}

const Temas = () => {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [estiloTitulo, setEstiloTitulo] = useState<'cor' | 'degrade' | 'textura'>('cor');
  const [corTitulo, setCorTitulo] = useState('#0033A1');
  const [degradeInicio, setDegradeInicio] = useState('#F27435');
  const [degradeFim, setDegradeFim] = useState('#0033A1');
  const [degradeDirecao, setDegradeDirecao] = useState('to right');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [texturaFile, setTexturaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [texturaPreviewUrl, setTexturaPreviewUrl] = useState<string | null>(null);
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
      setTemas((data as Tema[]) || []);
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A logo deve ter no máximo 5MB',
          variant: 'destructive',
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTexturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A textura deve ter no máximo 5MB',
          variant: 'destructive',
        });
        return;
      }

      setTexturaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTexturaPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (tema: Tema) => {
    setEditingId(tema.id);
    setNome(tema.nome);
    setDescricao(tema.descricao || '');
    setEstiloTitulo(tema.estilo_titulo);
    setCorTitulo(tema.cor_titulo);
    setDegradeInicio(tema.degrade_inicio || '#F27435');
    setDegradeFim(tema.degrade_fim || '#0033A1');
    setDegradeDirecao(tema.degrade_direcao || 'to right');
    setPreviewUrl(tema.imagem_url);
    setLogoPreviewUrl(tema.logo_url || null);
    setTexturaPreviewUrl(tema.textura_url || null);
    
    // Scroll para o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNome('');
    setDescricao('');
    setEstiloTitulo('cor');
    setCorTitulo('#0033A1');
    setDegradeInicio('#F27435');
    setDegradeFim('#0033A1');
    setDegradeDirecao('to right');
    setImageFile(null);
    setLogoFile(null);
    setTexturaFile(null);
    setPreviewUrl(null);
    setLogoPreviewUrl(null);
    setTexturaPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome) {
      toast({
        title: 'Campo obrigatório',
        description: 'Preencha o nome do tema',
        variant: 'destructive',
      });
      return;
    }

    // Se estiver editando e não houver nova imagem, não precisa validar
    if (!editingId && !imageFile) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      let publicUrl = previewUrl; // Manter URL existente se não houver nova imagem
      let logoPublicUrl = logoPreviewUrl; // Manter URL existente se não houver nova logo
      let texturaPublicUrl = texturaPreviewUrl; // Manter URL existente se não houver nova textura

      // Upload da imagem de fundo (se houver arquivo novo)
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('temas')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Obter URL pública do fundo
        const { data: { publicUrl: newPublicUrl } } = supabase.storage
          .from('temas')
          .getPublicUrl(filePath);
        
        publicUrl = newPublicUrl;
      }

      // Upload da logo (se fornecida)
      if (logoFile) {
        const logoExt = logoFile.name.split('.').pop();
        const logoFileName = `logo_${Date.now()}.${logoExt}`;
        const logoFilePath = `${logoFileName}`;

        const { error: logoUploadError } = await supabase.storage
          .from('temas')
          .upload(logoFilePath, logoFile);

        if (logoUploadError) throw logoUploadError;

        const { data: { publicUrl: logoUrl } } = supabase.storage
          .from('temas')
          .getPublicUrl(logoFilePath);
        
        logoPublicUrl = logoUrl;
      }

      // Upload da textura (se fornecida)
      if (texturaFile) {
        const texturaExt = texturaFile.name.split('.').pop();
        const texturaFileName = `textura_${Date.now()}.${texturaExt}`;
        const texturaFilePath = `${texturaFileName}`;

        const { error: texturaUploadError } = await supabase.storage
          .from('temas')
          .upload(texturaFilePath, texturaFile);

        if (texturaUploadError) throw texturaUploadError;

        const { data: { publicUrl: texturaUrl } } = supabase.storage
          .from('temas')
          .getPublicUrl(texturaFilePath);
        
        texturaPublicUrl = texturaUrl;
      }

      if (editingId) {
        // Atualizar tema existente
        const { error: updateError } = await supabase
          .from('temas')
          .update({
            nome,
            descricao: descricao || null,
            imagem_url: publicUrl,
            logo_url: logoPublicUrl,
            cor_titulo: corTitulo,
            estilo_titulo: estiloTitulo,
            degrade_inicio: estiloTitulo === 'degrade' ? degradeInicio : null,
            degrade_fim: estiloTitulo === 'degrade' ? degradeFim : null,
            degrade_direcao: estiloTitulo === 'degrade' ? degradeDirecao : null,
            textura_url: estiloTitulo === 'textura' ? texturaPublicUrl : null,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        toast({
          title: 'Tema atualizado com sucesso!',
        });
      } else {
        // Criar tema novo
        const { error: insertError } = await supabase
          .from('temas')
          .insert({
            nome,
            descricao: descricao || null,
            imagem_url: publicUrl!,
            logo_url: logoPublicUrl,
            cor_titulo: corTitulo,
            estilo_titulo: estiloTitulo,
            degrade_inicio: estiloTitulo === 'degrade' ? degradeInicio : null,
            degrade_fim: estiloTitulo === 'degrade' ? degradeFim : null,
            degrade_direcao: estiloTitulo === 'degrade' ? degradeDirecao : null,
            textura_url: estiloTitulo === 'textura' ? texturaPublicUrl : null,
          });

        if (insertError) throw insertError;

        toast({
          title: 'Tema criado com sucesso!',
        });
      }

      // Limpar formulário
      handleCancelEdit();

      // Recarregar temas
      await loadTemas();
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
      toast({
        title: editingId ? 'Erro ao atualizar tema' : 'Erro ao criar tema',
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

  const handleDeactivate = async (id: string) => {
    setActivatingId(id);
    try {
      const { error } = await supabase
        .from('temas')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tema desativado com sucesso!',
      });

      await loadTemas();
    } catch (error) {
      console.error('Erro ao desativar tema:', error);
      toast({
        title: 'Erro ao desativar tema',
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
          <CardTitle>{editingId ? 'Editar Tema' : 'Criar Novo Tema'}</CardTitle>
          <CardDescription>
            {editingId 
              ? 'Atualize as informações do tema selecionado'
              : 'Faça upload de uma imagem para usar como fundo nas páginas públicas'
            }
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

            <div className="space-y-4 border rounded-lg p-4">
              <div className="space-y-2">
                <Label>Estilo do Título "SORTEADOR"</Label>
                <Select value={estiloTitulo} onValueChange={(value: 'cor' | 'degrade' | 'textura') => setEstiloTitulo(value)} disabled={isUploading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cor">Cor Sólida</SelectItem>
                    <SelectItem value="degrade">Degradê</SelectItem>
                    <SelectItem value="textura">Textura/Imagem</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Escolha como deseja personalizar o título na tela de sorteio
                </p>
              </div>

              {estiloTitulo === 'cor' && (
                <div className="space-y-2">
                  <Label htmlFor="cor-titulo">Cor do Título</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="cor-titulo"
                      type="color"
                      value={corTitulo}
                      onChange={(e) => setCorTitulo(e.target.value)}
                      disabled={isUploading}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={corTitulo}
                      onChange={(e) => setCorTitulo(e.target.value)}
                      disabled={isUploading}
                      placeholder="#0033A1"
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              {estiloTitulo === 'degrade' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="degrade-inicio">Cor Inicial</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="degrade-inicio"
                          type="color"
                          value={degradeInicio}
                          onChange={(e) => setDegradeInicio(e.target.value)}
                          disabled={isUploading}
                          className="w-16 h-10 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={degradeInicio}
                          onChange={(e) => setDegradeInicio(e.target.value)}
                          disabled={isUploading}
                          placeholder="#F27435"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="degrade-fim">Cor Final</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="degrade-fim"
                          type="color"
                          value={degradeFim}
                          onChange={(e) => setDegradeFim(e.target.value)}
                          disabled={isUploading}
                          className="w-16 h-10 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={degradeFim}
                          onChange={(e) => setDegradeFim(e.target.value)}
                          disabled={isUploading}
                          placeholder="#0033A1"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Direção do Degradê</Label>
                    <RadioGroup value={degradeDirecao} onValueChange={setDegradeDirecao} disabled={isUploading} className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="to right" id="to-right" />
                        <Label htmlFor="to-right" className="cursor-pointer">→ Esquerda para Direita</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="to left" id="to-left" />
                        <Label htmlFor="to-left" className="cursor-pointer">← Direita para Esquerda</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="to bottom" id="to-bottom" />
                        <Label htmlFor="to-bottom" className="cursor-pointer">↓ Cima para Baixo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="to top" id="to-top" />
                        <Label htmlFor="to-top" className="cursor-pointer">↑ Baixo para Cima</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="to bottom right" id="to-bottom-right" />
                        <Label htmlFor="to-bottom-right" className="cursor-pointer">↘ Diagonal Superior Direita</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="to top left" id="to-top-left" />
                        <Label htmlFor="to-top-left" className="cursor-pointer">↖ Diagonal Inferior Esquerda</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {estiloTitulo === 'textura' && (
                <div className="space-y-2">
                  <Label htmlFor="textura">Imagem de Textura {editingId && texturaPreviewUrl ? '(opcional - deixe em branco para manter a atual)' : ''}</Label>
                  <Input
                    id="textura"
                    type="file"
                    accept="image/*"
                    onChange={handleTexturaChange}
                    disabled={isUploading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Escolha uma imagem para usar como textura no texto (PNG ou JPG, máximo 5MB)
                  </p>
                  {texturaPreviewUrl && (
                    <div className="mt-2">
                      <Label>Prévia da Textura</Label>
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border mt-1">
                        <img
                          src={texturaPreviewUrl}
                          alt="Prévia da textura"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagem">Imagem do Fundo {editingId ? '(opcional - deixe em branco para manter a atual)' : '*'}</Label>
              <Input
                id="imagem"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Formato: PNG ou JPG de alta qualidade. Máximo: 5MB
                </p>
                <p className="text-sm font-medium text-primary">
                  Resolução recomendada: 1920x1080 pixels (Full HD)
                </p>
                <p className="text-xs text-muted-foreground">
                  💡 Use imagens de alta qualidade sem compressão para melhor resultado
                </p>
              </div>
            </div>

            {previewUrl && (
              <div className="space-y-2">
                <Label>Prévia do Fundo</Label>
                <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="logo">Logo {editingId ? '(opcional - deixe em branco para manter a atual)' : '(opcional)'}</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={isUploading}
              />
              <p className="text-sm text-muted-foreground">
                Logo que aparecerá nas telas de cadastro e sorteio. Se não fornecida, será usada a logo padrão.
              </p>
            </div>

            {logoPreviewUrl && (
              <div className="space-y-2">
                <Label>Prévia da Logo</Label>
                <div className="relative w-40 h-20 rounded-lg overflow-hidden border bg-muted flex items-center justify-center p-2">
                  <img
                    src={logoPreviewUrl}
                    alt="Logo Preview"
                    className="max-w-full max-h-full object-contain"
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
                  <TableHead className="w-[100px]">Logo</TableHead>
                  <TableHead>Cor Título</TableHead>
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
                      {tema.logo_url ? (
                        <div className="w-16 h-8 rounded overflow-hidden border bg-muted flex items-center justify-center p-1">
                          <img
                            src={tema.logo_url}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Padrão</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: tema.cor_titulo }}
                        />
                        <span className="text-xs font-mono">{tema.cor_titulo}</span>
                      </div>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(tema)}
                          disabled={isUploading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {tema.ativo ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(tema.id)}
                            disabled={activatingId === tema.id}
                          >
                            {activatingId === tema.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Desativar'
                            )}
                          </Button>
                        ) : (
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