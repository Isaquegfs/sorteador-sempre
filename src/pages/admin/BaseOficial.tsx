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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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

interface ImportPreviewItem {
  nome: string;
  email: string;
  setor: string;
  cidade: string;
  cpf_censurado: string;
  cpf_hash: string;
  valido: boolean;
  erro?: string;
}

const BaseOficial = () => {
  const [baseOficial, setBaseOficial] = useState<BaseOficialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [temCabecalho, setTemCabecalho] = useState(true);
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

    const isCSV = file.name.endsWith('.csv');
    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCSV && !isXLSX) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo CSV ou XLSX',
        variant: 'destructive',
      });
      return;
    }

    setImportFile(file);
    setIsUploading(true);

    try {
      const workbook = isCSV
        ? XLSX.read(await file.text(), { type: 'string', raw: true })
        : XLSX.read(await file.arrayBuffer(), { type: 'array', codepage: 65001 });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const startRow = temCabecalho ? 1 : 0;
      const preview: ImportPreviewItem[] = [];

      for (let i = startRow; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const nome = row[0]?.toString().trim() || '';
        const cpfRaw = row[1]?.toString().trim() || '';
        const cidade = row[2]?.toString().trim() || '';
        const setor = row[3]?.toString().trim() || '';
        const email = row[4]?.toString().trim() || '';

        // Remove apóstrofo e formatação do CPF
        let cpfLimpo = cpfRaw.startsWith("'") ? cpfRaw.substring(1) : cpfRaw;
        const cpfNumeros = cpfLimpo.replace(/\D/g, '');

        // Validações
        if (!nome) {
          preview.push({
            nome: '(vazio)',
            email,
            setor,
            cidade,
            cpf_censurado: cpfNumeros ? censorCPF(cpfNumeros) : '***.***.***-**',
            cpf_hash: '',
            valido: false,
            erro: 'Nome obrigatório',
          });
          continue;
        }

        if (nome.length < 3) {
          preview.push({
            nome,
            email,
            setor,
            cidade,
            cpf_censurado: cpfNumeros ? censorCPF(cpfNumeros) : '***.***.***-**',
            cpf_hash: '',
            valido: false,
            erro: 'Nome deve ter pelo menos 3 caracteres',
          });
          continue;
        }

        if (nome.length > 200) {
          preview.push({
            nome,
            email,
            setor,
            cidade,
            cpf_censurado: cpfNumeros ? censorCPF(cpfNumeros) : '***.***.***-**',
            cpf_hash: '',
            valido: false,
            erro: 'Nome muito longo (máx 200 caracteres)',
          });
          continue;
        }

        if (!cpfNumeros || cpfNumeros.length !== 11) {
          preview.push({
            nome,
            email,
            setor,
            cidade,
            cpf_censurado: cpfNumeros ? censorCPF(cpfNumeros) : '***.***.***-**',
            cpf_hash: '',
            valido: false,
            erro: 'CPF deve ter 11 dígitos',
          });
          continue;
        }

        if (!validateCPF(cpfNumeros)) {
          preview.push({
            nome,
            email,
            setor,
            cidade,
            cpf_censurado: censorCPF(cpfNumeros),
            cpf_hash: '',
            valido: false,
            erro: 'CPF inválido',
          });
          continue;
        }

        if (!email) {
          preview.push({
            nome,
            email: '(vazio)',
            setor,
            cidade,
            cpf_censurado: censorCPF(cpfNumeros),
            cpf_hash: '',
            valido: false,
            erro: 'E-mail obrigatório',
          });
          continue;
        }

        if (!setor) {
          preview.push({
            nome,
            email,
            setor: '(vazio)',
            cidade,
            cpf_censurado: censorCPF(cpfNumeros),
            cpf_hash: '',
            valido: false,
            erro: 'Setor obrigatório',
          });
          continue;
        }

        if (!cidade) {
          preview.push({
            nome,
            email,
            setor,
            cidade: '(vazio)',
            cpf_censurado: censorCPF(cpfNumeros),
            cpf_hash: '',
            valido: false,
            erro: 'Cidade obrigatória',
          });
          continue;
        }

        // Item válido
        preview.push({
          nome,
          email,
          setor,
          cidade,
          cpf_censurado: censorCPF(cpfNumeros),
          cpf_hash: await hashCPF(cpfNumeros),
          valido: true,
        });
      }

      setImportPreview(preview);
      setShowImportDialog(true);

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
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleImportConfirm = async () => {
    const validItems = importPreview.filter(item => item.valido);

    if (validItems.length === 0) {
      toast({
        title: 'Nenhum item válido',
        description: 'Não há registros válidos para importar',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const records = validItems.map(item => ({
        nome: item.nome,
        email: item.email,
        setor: item.setor,
        cidade: item.cidade,
        cpf_hash: item.cpf_hash,
        cpf_censurado: item.cpf_censurado,
      }));

      // Inserir dados em lotes de 500 usando upsert e ignorando duplicatas
      const BATCH_SIZE = 500;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('base_oficial')
          .upsert(batch, { onConflict: 'cpf_hash', ignoreDuplicates: true });

        if (error) throw error;
      }

      const invalidCount = importPreview.length - validItems.length;

      toast({
        title: 'Importação concluída',
        description: `${validItems.length} registro(s) importado(s) com sucesso${invalidCount > 0 ? `. ${invalidCount} item(ns) ignorado(s) por erros.` : ''}`,
      });

      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview([]);
      setTemCabecalho(true);
      loadBaseOficial();
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

      {/* Dialog de preview de importação */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Importação</DialogTitle>
            <DialogDescription>
              Confira os dados antes de confirmar a importação.{' '}
              {importPreview.length > 0 && (
                <>
                  {importPreview.filter(item => item.valido).length} válido(s), {importPreview.filter(item => !item.valido).length} com erro(s)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              id="cabecalho"
              checked={temCabecalho}
              onCheckedChange={(checked) => {
                setTemCabecalho(checked === true);
                // Reprocessar arquivo se houver
                if (importFile) {
                  const input = document.getElementById('file-upload') as HTMLInputElement;
                  if (input) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(importFile);
                    input.files = dataTransfer.files;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }
              }}
            />
            <Label htmlFor="cabecalho" className="cursor-pointer">
              Primeira linha é cabeçalho
            </Label>
          </div>

          <div className="border rounded-lg overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Cidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum dado para pré-visualizar
                    </TableCell>
                  </TableRow>
                ) : (
                  importPreview.map((item, index) => (
                    <TableRow
                      key={index}
                      className={item.valido ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}
                    >
                      <TableCell>
                        {item.valido ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium" title={item.erro}>
                            ✗
                          </span>
                        )}
                      </TableCell>
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

          {importPreview.some(item => !item.valido) && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Erros encontrados:</p>
              <ul className="list-disc list-inside space-y-1">
                {importPreview
                  .filter(item => !item.valido)
                  .map((item, index) => (
                    <li key={index} className="text-red-600 dark:text-red-400">
                      Linha {index + 1}: {item.erro}
                    </li>
                  ))
                  .slice(0, 5)}
                {importPreview.filter(item => !item.valido).length > 5 && (
                  <li className="text-muted-foreground">
                    ... e mais {importPreview.filter(item => !item.valido).length - 5} erro(s)
                  </li>
                )}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleImportCancel} disabled={isImporting}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={isImporting || importPreview.filter(item => item.valido).length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                `Confirmar Importação (${importPreview.filter(item => item.valido).length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaseOficial;
