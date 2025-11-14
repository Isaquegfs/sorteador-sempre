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
    
    // Filtra linhas com algum CPF informado (mesmo que formatado)
    const validLines = dataLines.filter(line => {
      const fields = line.split(',');
      const rawCpf = (fields[1] ?? '').toString().trim();
      return rawCpf.length > 0;
    });
    
    const processed = await Promise.all(validLines.map(async line => {
      const [nome, cpf, cidade, setor, email] = line.split(',').map(field => (field ?? '').toString().trim());
      
      // Remove apóstrofo e formatação do CPF
      let cpfLimpo = cpf.startsWith("'") ? cpf.substring(1) : cpf;
      const cpfNumeros = cpfLimpo.replace(/\D/g, '');
      
      // Pula linhas com CPF inválido ao invés de lançar erro
      if (!/^\d{11}$/.test(cpfNumeros)) {
        return null;
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

    // Remove nulos (linhas inválidas)
    return processed.filter((r): r is {
      nome: string; cpf_hash: string; cpf_censurado: string; cidade: string; setor: string; email: string;
    } => Boolean(r));
  };

  const parseXLSX = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    // Força UTF-8 para preservar caracteres especiais
    const workbook = XLSX.read(arrayBuffer, { type: 'array', codepage: 65001 });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Util para pegar valores com case-insensitive
    const getNormalizedValue = (row: any, key: string): string => {
      const lowerKey = key.toLowerCase();
      const foundKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
      if (!foundKey) return '';
      const value = row[foundKey];
      return value === null || value === undefined ? '' : String(value).trim();
    };

    // Normaliza linhas e extrai CPF somente números; ignora linhas sem CPF
    const normalized = (data as any[]).map((row) => {
      let cpf = getNormalizedValue(row, 'cpf');
      if (cpf.startsWith("'")) cpf = cpf.substring(1);
      const cpfNumeros = cpf.replace(/\D/g, '');
      return {
        nome: getNormalizedValue(row, 'nome'),
        cidade: getNormalizedValue(row, 'cidade'),
        setor: getNormalizedValue(row, 'setor'),
        email: getNormalizedValue(row, 'email'),
        cpfNumeros,
      };
    }).filter(r => r.cpfNumeros.length > 0);

    // Mantém apenas CPFs válidos (11 dígitos)
    const valid = normalized.filter(r => /^\d{11}$/.test(r.cpfNumeros));

    // Constrói payload final
    const records = await Promise.all(valid.map(async (r) => ({
      nome: r.nome,
      cpf_hash: await hashCPF(r.cpfNumeros),
      cpf_censurado: censorCPF(r.cpfNumeros),
      cidade: r.cidade,
      setor: r.setor,
      email: r.email,
    })));

    return records;
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

      // Deduplicar por CPF dentro do arquivo (evita erro de conflito no mesmo upload)
      const originalCount = records.length;
      const uniqueMap = new Map<string, typeof records[number]>();
      for (const r of records) {
        if (!uniqueMap.has(r.cpf_hash)) uniqueMap.set(r.cpf_hash, r);
      }
      records = Array.from(uniqueMap.values());

      // Inserir dados em lotes de 500 usando upsert e ignorando duplicatas já existentes no banco
      const BATCH_SIZE = 500;
      let successCount = 0;
      let failedBatches = 0;
      let lastError: any = null;

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('base_oficial')
          .upsert(batch, { onConflict: 'cpf_hash', ignoreDuplicates: true });

        if (error) {
          failedBatches++;
          lastError = error;
          console.error('Erro ao inserir lote', Math.floor(i / BATCH_SIZE) + 1, error);
          continue; // continua com os próximos lotes
        }

        successCount += batch.length;
      }

      toast({
        title: 'Base oficial importada',
        description: `${originalCount} registro(s) processados. Duplicatas foram ignoradas automaticamente.`,
      });

      if (failedBatches > 0 && lastError) {
        toast({
          title: 'Alguns lotes falharam',
          description: `Houve ${failedBatches} lote(s) com erro. Último erro: ${lastError.message || 'erro desconhecido'}`,
          variant: 'destructive',
        });
      }

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
