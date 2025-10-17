import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const Configuracoes = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
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
    </div>
  );
};

export default Configuracoes;
