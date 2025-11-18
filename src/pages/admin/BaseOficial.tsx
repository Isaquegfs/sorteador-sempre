import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTestModeQuery } from '@/hooks/useTestModeQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileSpreadsheet, Trash2, Users } from 'lucide-react';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { hashCPF, censorCPF, validateCPF } from '@/lib/cpf';

type Categoria = 'sempre' | 'autorizados' | 'pj' | 'onnet';

interface BaseOficialItem {
  id: string;
  nome: string;
  email: string;
  setor: string;
  cidade: string;
  cpf_censurado: string;
  created_at: string;
  categoria: Categoria;
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

const categoriaLabels: Record<Categoria, string> = {
  sempre: 'Sempre',
  autorizados: 'Autorizados',
  pj: 'PJ',
  onnet: 'OnNet',
};

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
  const [activeTab, setActiveTab] = useState<Categoria>('sempre');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { toast } = useToast();
  const { testFilter } = useTestModeQuery();

  useEffect(() => {
    loadBaseOficial();
  }, [testFilter]);

  const loadBaseOficial = async () => {
    try {
      const { data, error } = await supabase
        .from('base_oficial')
        .select('*')
        .eq('is_test', testFilter)
        .order('created_at', { ascending: false});

      if (error) throw error;
      setBaseOficial((data || []) as BaseOficialItem[]);
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

        const nome = row[0] ? String(row[0]).trim() : '';
        const cpf = row[1] ? String(row[1]).trim() : '';
        const cidade = row[2] ? String(row[2]).trim() : '';
        const setor = row[3] ? String(row[3]).trim() : '';
        const email = row[4] ? String(row[4]).trim().toLowerCase() : '';

        if (!nome && !cpf && !email) continue;

        const cpfNumeros = cpf.replace(/\D/g, '');

        if (!nome) {
          preview.push({
            nome: '(vazio)',
            email,
            setor,
            cidade,
            cpf_censurado: censorCPF(cpfNumeros),
            cpf_hash: '',
            valido: false,
            erro: 'Nome obrigatório',
          });
          continue;
        }

        if (!cpfNumeros) {
          preview.push({
            nome,
            email,
            setor,
            cidade,
            cpf_censurado: '(vazio)',
            cpf_hash: '',
            valido: false,
            erro: 'CPF obrigatório',
          });
          continue;
        }

        if (cpfNumeros.length !== 11) {
          preview.push({
            nome,
            email,
            setor,
            cidade,
            cpf_censurado: censorCPF(cpfNumeros),
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
        categoria: activeTab,
        is_test: testFilter,
      }));

      const BATCH_SIZE = 500;
      let duplicateCount = 0;
      
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error, count } = await supabase
          .from('base_oficial')
          .upsert(batch, { onConflict: 'cpf_hash', ignoreDuplicates: true, count: 'exact' });

        if (error) throw error;
        
        if (count !== null && count < batch.length) {
          duplicateCount += (batch.length - count);
        }
      }

      const invalidCount = importPreview.length - validItems.length;

      toast({
        title: 'Importação concluída',
        description: `${validItems.length - duplicateCount} registro(s) importado(s) na categoria "${categoriaLabels[activeTab]}"${
          duplicateCount > 0 ? `. ${duplicateCount} CPF(s) já existente(s) na base unificada (ignorados)` : ''
        }${invalidCount > 0 ? `. ${invalidCount} item(ns) com erro(s)` : ''}`,
      });

      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview([]);
      setTemCabecalho(true);
      loadBaseOficial();
    } catch (error: any) {
      toast({
        title: 'Erro ao importar registros',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
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

  const contadores = {
    sempre: baseOficial.filter(i => i.categoria === 'sempre').length,
    autorizados: baseOficial.filter(i => i.categoria === 'autorizados').length,
    pj: baseOficial.filter(i => i.categoria === 'pj').length,
    onnet: baseOficial.filter(i => i.categoria === 'onnet').length,
  };

  const totalUnificado = baseOficial.length;
  const registrosCategoria = baseOficial.filter(item => item.categoria === activeTab);
  
  // Reset to page 1 when changing tabs or items per page
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, itemsPerPage]);
  
  // Pagination calculations
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(registrosCategoria.length / itemsPerPage);
  const startIndex = itemsPerPage === -1 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === -1 ? registrosCategoria.length : startIndex + itemsPerPage;
  const registrosPaginados = registrosCategoria.slice(startIndex, endIndex);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? -1 : parseInt(value));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Base Oficial de Participantes</h1>
          <p className="text-muted-foreground mt-2">
            Total unificado: {totalUnificado} colaborador(es) elegível(is)
          </p>
        </div>
        <div>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar para "{categoriaLabels[activeTab]}"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formato dos arquivos aceitos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">CSV:</p>
            <code className="text-sm bg-muted px-2 py-1 rounded">nome,cpf,cidade,setor,email</code>
            <p className="text-sm text-muted-foreground mt-1">
              Exemplo: João Silva,12345678900,São Paulo,TI,joao@example.com
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">XLSX/XLS:</p>
            <p className="text-sm text-muted-foreground">
              Planilha Excel com colunas: <strong>nome</strong>, <strong>cpf</strong>, <strong>cidade</strong>, <strong>setor</strong>, <strong>email</strong>
            </p>
          </div>
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>⚠️ Importante:</strong> O CPF deve conter apenas números (sem pontos ou traços).
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>🔄 Unificação automática:</strong> CPFs duplicados entre categorias são automaticamente ignorados, mantendo apenas o primeiro registro.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Categoria)}>
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-auto">
          <TabsTrigger value="sempre" className="whitespace-nowrap">
            Sempre ({contadores.sempre})
          </TabsTrigger>
          <TabsTrigger value="autorizados" className="whitespace-nowrap">
            Autorizados ({contadores.autorizados})
          </TabsTrigger>
          <TabsTrigger value="pj" className="whitespace-nowrap">
            PJ ({contadores.pj})
          </TabsTrigger>
          <TabsTrigger value="onnet" className="whitespace-nowrap">
            OnNet ({contadores.onnet})
          </TabsTrigger>
        </TabsList>

        {(['sempre', 'autorizados', 'pj', 'onnet'] as Categoria[]).map((categoria) => (
          <TabsContent key={categoria} value={categoria}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {categoriaLabels[categoria]}
                    </CardTitle>
                    <CardDescription>
                      {contadores[categoria]} participante(s) nesta categoria
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Exibir:</span>
                    <Select value={itemsPerPage === -1 ? 'all' : itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20 por página</SelectItem>
                        <SelectItem value="30">30 por página</SelectItem>
                        <SelectItem value="50">50 por página</SelectItem>
                        <SelectItem value="100">100 por página</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {registrosCategoria.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum participante na categoria "{categoriaLabels[categoria]}"
                  </div>
                ) : (
                  <>
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
                        {registrosPaginados.map((item) => (
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
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja apagar o registro de "{item.nome}"? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteRecord(item.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Apagar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {startIndex + 1} a {Math.min(endIndex, registrosCategoria.length)} de {registrosCategoria.length} registros
                        </p>
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => handlePageChange(pageNum)}
                                    isActive={currentPage === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}
                            
                            {totalPages > 5 && currentPage < totalPages - 2 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Pré-visualização da Importação - {categoriaLabels[activeTab]}
            </DialogTitle>
            <DialogDescription>
              Confira os dados antes de importar. Linhas com erro não serão importadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <Checkbox
                id="cabecalho"
                checked={temCabecalho}
                onCheckedChange={(checked) => setTemCabecalho(checked as boolean)}
              />
              <Label htmlFor="cabecalho" className="cursor-pointer">
                A primeira linha é cabeçalho (será ignorada)
              </Label>
            </div>

            {importPreview.length > 0 && (
              <>
                <div className="flex gap-4 text-sm">
                  <Badge variant="default" className="bg-green-600">
                    ✓ Válidos: {importPreview.filter(i => i.valido).length}
                  </Badge>
                  <Badge variant="destructive">
                    ✗ Com erro: {importPreview.filter(i => !i.valido).length}
                  </Badge>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((item, index) => (
                        <TableRow 
                          key={index}
                          className={!item.valido ? 'bg-destructive/10' : ''}
                        >
                          <TableCell>
                            {item.valido ? (
                              <span className="text-green-600 font-bold">✓</span>
                            ) : (
                              <span className="text-destructive font-bold">✗</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell>{item.cpf_censurado}</TableCell>
                          <TableCell>{item.email}</TableCell>
                          <TableCell>{item.setor}</TableCell>
                          <TableCell>{item.cidade}</TableCell>
                          <TableCell className="text-destructive text-sm">
                            {item.erro || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportPreview([]);
                setImportFile(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={isImporting || importPreview.filter(i => i.valido).length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                `Confirmar Importação (${importPreview.filter(i => i.valido).length} registros)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaseOficial;
