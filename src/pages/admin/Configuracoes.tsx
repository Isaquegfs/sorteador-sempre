import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Loader2, Trash2 } from 'lucide-react';

const Configuracoes = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
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
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro ao carregar configurações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!configId) {
      toast({
        title: 'Erro',
        description: 'Configuração não encontrada',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const updateData: any = {
        aberto: formularioAberto,
        updated_at: new Date().toISOString(),
      };

      if (formularioAberto) {
        updateData.data_abertura = new Date().toISOString();
      } else {
        updateData.data_fechamento = new Date().toISOString();
      }

      const { error } = await supabase
        .from('formulario_config')
        .update(updateData)
        .eq('id', configId);

      if (error) throw error;

      toast({
        title: 'Configurações salvas com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro ao salvar configurações',
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
      console.error('Erro ao limpar tabela:', error);
      toast({
        title: 'Erro ao limpar tabela',
        description: 'Não foi possível limpar a tabela de participantes.',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
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
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações do sistema de sorteio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulário de Inscrição</CardTitle>
          <CardDescription>
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

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Dados</CardTitle>
          <CardDescription>
            Ações perigosas que afetam os dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <h3 className="font-semibold text-destructive mb-2">Limpar Tabela de Participantes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Esta ação irá remover todos os participantes cadastrados no sorteio atual.
                Os dados da base oficial não serão afetados.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isClearing}>
                    {isClearing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Limpando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar Tabela
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;
