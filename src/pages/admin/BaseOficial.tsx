import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { hashCPF, censorCPF, validateCPF } from '@/lib/cpf';

interface BaseOficialItem {
  id: string;
  nome: string;
  email: string;
  setor: string;
  cidade: string;
  cpf_censurado: string;
  created_at: string;
}

const BaseOficial = () => {
  const [baseOficial, setBaseOficial] = useState<BaseOficialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBaseOficial();
  }, []);

  const loadBaseOficial = async () => {
    try {
      const { data, error } = await supabase
        .from('base_oficial')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBaseOficial(data || []);
    } catch (error) {
      console.error('Erro ao carregar base oficial:', error);
      toast({
        title: 'Erro ao carregar base oficial',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, envie um arquivo CSV.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Ignorar cabeçalho
      const dataLines = lines.slice(1);
      
      const records = dataLines.map(line => {
        const [nome, cpf, cidade, setor, email] = line.split(',').map(field => field.trim());
        
        if (!validateCPF(cpf)) {
          throw new Error(`CPF inválido: ${cpf}`);
        }

        return {
          nome,
          cpf_hash: hashCPF(cpf),
          cpf_censurado: censorCPF(cpf),
          cidade,
          setor,
          email,
        };
      });

      const { error } = await supabase
        .from('base_oficial')
        .insert(records);

      if (error) throw error;

      toast({
        title: 'Base oficial importada com sucesso!',
        description: `${records.length} registro(s) adicionado(s).`,
      });

      loadBaseOficial();
    } catch (error) {
      console.error('Erro ao importar base:', error);
      toast({
        title: 'Erro ao importar base',
        description: error instanceof Error ? error.message : 'Verifique o formato do arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
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
          <h1 className="text-3xl font-bold">Base Oficial</h1>
          <p className="text-muted-foreground mt-2">
            Total de {baseOficial.length} colaborador(es) elegível(is)
          </p>
        </div>
        
        <div>
          <Label htmlFor="csv-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar CSV
                </>
              )}
            </div>
          </Label>
          <Input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/50">
        <h3 className="font-medium mb-2">Formato do arquivo CSV:</h3>
        <code className="text-sm">
          nome,cpf,cidade,setor,email
        </code>
        <p className="text-sm text-muted-foreground mt-2">
          Exemplo: João Silva,123.456.789-00,São Paulo,TI,joao@example.com
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Cidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baseOficial.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum registro na base oficial
                </TableCell>
              </TableRow>
            ) : (
              baseOficial.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{item.cpf_censurado}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.setor}</TableCell>
                  <TableCell>{item.cidade}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BaseOficial;
