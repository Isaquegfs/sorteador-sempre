import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, FileSpreadsheet, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { hashCPF, censorCPF } from '@/lib/cpf';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const parseCSV = async (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Ignorar cabeçalho
    
    // Filtra linhas com CPF válido
    const validLines = dataLines.filter(line => {
      const fields = line.split(',');
      const cpf = fields[1]?.trim() || '';
      return cpf.length > 0;
    });
    
    return await Promise.all(validLines.map(async line => {
      const [nome, cpf, cidade, setor, email] = line.split(',').map(field => field.trim());
      
      // Remove o apóstrofo e qualquer formatação do CPF
      let cpfLimpo = cpf.startsWith("'") ? cpf.substring(1) : cpf;
      const cpfNumeros = cpfLimpo.replace(/\D/g, '');
      
      if (!/^\d{11}$/.test(cpfNumeros)) {
        throw new Error(`CPF inválido na linha: ${cpf}`);
      }

      return {
        nome,
        cpf_hash: await hashCPF(cpfNumeros),
        cpf_censurado: censorCPF(cpfNumeros),
        cidade,
        setor,
        email: email || '',
      };
    }));
  };

  const parseXLSX = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    // Força UTF-8 para preservar caracteres especiais
    const workbook = XLSX.read(arrayBuffer, { type: 'array', codepage: 65001 });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Filtra linhas vazias e mapeia os dados
    const validRows = data.filter((row: any) => {
      // Busca o CPF em diferentes variações de nome de coluna
      const cpfValue = row.cpf || row.CPF || row.Cpf || '';
      const cpfStr = cpfValue?.toString().trim() || '';
      return cpfStr.length > 0;
    });

    return await Promise.all(validRows.map(async (row: any) => {
      // Busca valores com case-insensitive
      const getNormalizedValue = (key: string) => {
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
        return foundKey ? row[foundKey] : '';
      };

      // Remove o apóstrofo que o Excel adiciona automaticamente para preservar zeros à esquerda
      let cpf = getNormalizedValue('cpf')?.toString().trim() || '';
      if (cpf.startsWith("'")) {
        cpf = cpf.substring(1);
      }
      
      // Remove qualquer formatação do CPF (pontos, hífens, etc.), aceita apenas números
      const cpfNumeros = cpf.replace(/\D/g, '');
      
      if (!/^\d{11}$/.test(cpfNumeros)) {
        throw new Error(`CPF inválido na linha: ${cpf || 'vazio'}`);
      }

      return {
        nome: getNormalizedValue('nome')?.toString().trim() || '',
        cpf_hash: await hashCPF(cpfNumeros),
        cpf_censurado: censorCPF(cpfNumeros),
        cidade: getNormalizedValue('cidade')?.toString().trim() || '',
        setor: getNormalizedValue('setor')?.toString().trim() || '',
        email: getNormalizedValue('email')?.toString().trim() || '',
      };
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho do arquivo (máximo 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    const isCSV = file.name.endsWith('.csv');
    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCSV && !isXLSX) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, envie um arquivo CSV ou XLSX.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      let records;

      if (isCSV) {
        const text = await file.text();
        records = await parseCSV(text);
      } else {
        records = await parseXLSX(file);
      }

      // Validar número de registros (máximo 10.000)
      const MAX_RECORDS = 10000;
      if (records.length > MAX_RECORDS) {
        throw new Error(`Arquivo contém ${records.length} registros. Máximo permitido: ${MAX_RECORDS}.`);
      }

      if (records.length === 0) {
        throw new Error("Arquivo não contém registros válidos.");
      }

      // Validar tamanhos dos campos
      for (const record of records) {
        if (record.nome?.length > 200) throw new Error("Nome muito longo (máx 200 caracteres)");
        if (record.email?.length > 255) throw new Error("Email muito longo (máx 255 caracteres)");
        if (record.setor?.length > 200) throw new Error("Setor muito longo (máx 200 caracteres)");
        if (record.cidade?.length > 200) throw new Error("Cidade muito longa (máx 200 caracteres)");
      }

      // Inserir dados em lotes de 500 registros
      const BATCH_SIZE = 500;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('base_oficial')
          .insert(batch);

        if (error) throw error;
      }

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

  const handleDeleteRecord = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('base_oficial')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Registro removido com sucesso.',
      });

      // Atualizar a lista localmente
      setBaseOficial(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      toast({
        title: 'Erro ao excluir registro',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Base Oficial</h1>
          <p className="text-muted-foreground mt-2">
            Total de {baseOficial.length} colaborador(es) elegível(is)
          </p>
        </div>
        
        <div>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar CSV/XLSX
                </>
              )}
            </div>
          </Label>
          <Input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/50">
        <h3 className="font-medium mb-2">Formato dos arquivos aceitos:</h3>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">CSV:</p>
            <code className="text-sm">nome,cpf,cidade,setor,email</code>
            <p className="text-sm text-muted-foreground mt-1">
              Exemplo: João Silva,12345678900,São Paulo,TI,joao@example.com
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Importante:</strong> O CPF deve conter apenas números (sem pontos ou traços).
            </p>
          </div>
          <div>
            <p className="text-sm font-medium mt-2">XLSX/XLS:</p>
            <p className="text-sm text-muted-foreground">
              Planilha Excel com colunas: <strong>nome</strong>, <strong>cpf</strong>, <strong>cidade</strong>, <strong>setor</strong>, <strong>email</strong>
            </p>
          </div>
        </div>
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
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baseOficial.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza que deseja apagar este registro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O registro de <strong>{item.nome}</strong> será removido permanentemente da Base Oficial.
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRecord(item.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Sim, Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
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
