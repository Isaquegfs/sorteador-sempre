import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, censorCPF, hashCPF, validateCPF } from "@/lib/cpf";
import { participanteSchema } from "@/lib/validation";
import logo from "@/assets/logo-sempre.png";

const Index = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    setor: "",
    cidade: "",
    cpf: "",
  });

  useEffect(() => {
    checkFormStatus();
  }, []);

  const checkFormStatus = async () => {
    const { data } = await supabase
      .from('formulario_status')
      .select('aberto')
      .single();
    
    setIsFormOpen(data?.aberto || false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar dados do formulário
    const validation = participanteSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }
    
    if (!validateCPF(formData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const cpfHash = await hashCPF(formData.cpf);
      const cpfCensurado = censorCPF(formData.cpf);

      // Verificar elegibilidade usando função segura
      const { data: isElegivel, error: elegError } = await supabase
        .rpc('is_cpf_elegivel', { cpf_hash_input: cpfHash });

      if (elegError) {
        console.error('Erro ao verificar elegibilidade:', elegError);
        toast({
          title: "Erro ao verificar CPF",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!isElegivel) {
        toast({
          title: "CPF não encontrado",
          description: "Este CPF não está na base de colaboradores elegíveis.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Verificar se já está cadastrado
      const { data: existing } = await supabase
        .from('participantes')
        .select('id')
        .eq('cpf_hash', cpfHash)
        .single();

      if (existing) {
        toast({
          title: "Já cadastrado",
          description: "Este CPF já está participando do sorteio.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Inserir participante
      const { error } = await supabase
        .from('participantes')
        .insert({
          nome: formData.nome,
          email: formData.email,
          setor: formData.setor,
          cidade: formData.cidade,
          cpf_hash: cpfHash,
          cpf_censurado: cpfCensurado,
        });

      if (error) throw error;

      toast({
        title: "Cadastro efetuado com sucesso!",
        description: "Boa sorte no sorteio!",
      });
      
      setFormData({
        nome: "",
        email: "",
        setor: "",
        cidade: "",
        cpf: "",
      });
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast({
        title: "Erro ao cadastrar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      // Aceita apenas números no CPF
      const numeros = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        cpf: numeros,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Login Button */}
      <header className="w-full py-4 px-6 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          title="Acesso restrito à equipe"
          onClick={() => window.location.href = '/auth'}
        >
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline">Login</span>
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={logo} 
              alt="Sempre Internet" 
              className="h-24 w-auto"
            />
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Sorteios Sempre Internet
            </h1>
            <p className="text-muted-foreground">
              {isFormOpen 
                ? "Realize o seu cadastro abaixo para participar do sorteio."
                : "O formulário está fechado no momento."}
            </p>
          </div>

          {/* Form */}
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                name="nome"
                type="text"
                required
                value={formData.nome}
                onChange={handleChange}
                placeholder="Digite seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
              <Input
                id="setor"
                name="setor"
                type="text"
                required
                value={formData.setor}
                onChange={handleChange}
                placeholder="Digite seu setor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                name="cidade"
                type="text"
                required
                value={formData.cidade}
                onChange={handleChange}
                placeholder="Digite sua cidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF (apenas números)</Label>
              <Input
                id="cpf"
                name="cpf"
                type="text"
                required
                value={formData.cpf}
                onChange={handleChange}
                placeholder="12345678900"
                maxLength={11}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar"
              )}
            </Button>
          </form>
          ) : (
            <div className="text-center p-8 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">
                As inscrições estão encerradas no momento.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-sm text-muted-foreground border-t">
        Sorteios Sempre Internet
      </footer>
    </div>
  );
};

export default Index;
