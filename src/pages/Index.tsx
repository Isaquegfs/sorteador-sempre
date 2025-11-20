import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, censorCPF, hashCPF, validateCPF } from "@/lib/cpf";
import { participanteSchema } from "@/lib/validation";
import { PublicPageLayout } from "@/components/PublicPageLayout";
import { useTestModeQuery } from "@/hooks/useTestModeQuery";

const Index = () => {
  const { toast } = useToast();
  const { isTestMode } = useTestModeQuery();
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cpf: "",
  });

  useEffect(() => {
    checkFormStatus();
  }, []);

  const checkFormStatus = async () => {
    const { data, error } = await supabase.rpc('is_form_open');
    
    if (error) {
      console.error('Erro ao verificar status do formulário:', error);
      setIsFormOpen(false);
      return;
    }
    
    setIsFormOpen(data || false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check honeypot field (anti-bot protection)
    const formElement = e.target as HTMLFormElement;
    const honeypotValue = (formElement.elements.namedItem('website') as HTMLInputElement)?.value;
    if (honeypotValue) {
      console.log('[Security] Bot submission blocked - honeypot triggered');
      toast({
        title: "Erro na validação",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
      return;
    }
    
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
      // Calculate CPF hash first
      const cpfHash = await hashCPF(formData.cpf);
      const cpfCensurado = censorCPF(formData.cpf);
      
      // Check rate limit by CPF BEFORE checking eligibility
      const { data: rateLimitCheck, error: rateLimitError } = await supabase.functions.invoke('check-rate-limit', {
        body: { cpf_hash: cpfHash }
      });

      if (rateLimitError) {
        console.error('Rate limit check failed:', rateLimitError);
        toast({
          title: "Erro no sistema",
          description: "Não foi possível verificar o limite de cadastros. Por favor, tente novamente em alguns instantes.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!rateLimitCheck?.allowed) {
        toast({
          title: "Limite de tentativas excedido",
          description: rateLimitCheck?.message || "Você já tentou se cadastrar recentemente. Aguarde alguns minutos e tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      console.log(`Rate limit check passed: ${rateLimitCheck.count}/${rateLimitCheck.limit} attempts used`);

      // Check eligibility AFTER rate limit
      const { data: isElegivel, error: elegError } = await supabase
        .rpc('is_cpf_elegivel', { cpf_hash_input: cpfHash });

      if (elegError) {
        toast({
          title: "Erro ao verificar elegibilidade",
          description: "Não foi possível verificar o CPF no sistema. Por favor, tente novamente.",
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

      // Verificar duplicata apenas se elegível
      let isJaCadastrado = false;
      try {
        const { data: existing, error: existError } = await supabase
          .from('participantes')
          .select('id')
          .eq('cpf_hash', cpfHash)
          .maybeSingle();

        if (!existError && existing) {
          isJaCadastrado = true;
        }
      } catch (error) {
        // User not yet registered
      }

      if (isJaCadastrado) {
        toast({
          title: "Já cadastrado",
          description: "Este CPF já está participando do sorteio.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Buscar setor e cidade da base oficial
      const { data: dadosBase, error: dadosError } = await supabase
        .rpc('get_dados_base_oficial', { cpf_hash_input: cpfHash });

      if (dadosError || !dadosBase || dadosBase.length === 0) {
        toast({
          title: "Erro ao buscar dados",
          description: "Não foi possível obter informações da base oficial.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { setor, cidade } = dadosBase[0];

      // Insert participant (IP will be captured by trigger if available)
      const { error } = await supabase
        .from('participantes')
        .insert({
          nome: formData.nome,
          email: formData.email,
          setor,
          cidade,
          cpf_hash: cpfHash,
          cpf_censurado: cpfCensurado,
          is_test: isTestMode,
        });

      if (error) throw error;

      toast({
        title: "Cadastro efetuado com sucesso!",
        description: "Boa sorte no sorteio!",
      });
      
      setFormData({
        nome: "",
        email: "",
        cpf: "",
      });
    } catch (error: any) {
      let errorMessage = "Ocorreu um erro inesperado. Por favor, tente novamente.";
      
      // Tratar erros específicos do Supabase
      if (error?.code === '23505') {
        errorMessage = "CPF já cadastrado no sistema.";
      } else if (error?.code === '23503') {
        errorMessage = "Dados de referência inválidos. Verifique as informações e tente novamente.";
      } else if (error?.code === 'PGRST301') {
        errorMessage = "Formulário de cadastro está fechado no momento.";
      } else if (error?.message) {
        // Tratar mensagens específicas de RLS ou outras
        if (error.message.includes('permission denied') || error.message.includes('policy')) {
          errorMessage = "Você não tem permissão para realizar esta operação no momento.";
        } else if (error.message.includes('invalid input')) {
          errorMessage = "Dados inválidos. Verifique as informações e tente novamente.";
        } else if (error.message.includes('network')) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        }
      }
      
      toast({
        title: "Erro ao cadastrar",
        description: errorMessage,
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
    <PublicPageLayout>
      {/* Header with Login Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          title="Acesso restrito à equipe"
          onClick={() => window.location.href = '/auth'}
        >
          <KeyRound className="h-4 w-4" />
          <span className="text-xs">Login</span>
        </Button>
      </div>

      {/* Title */}
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Sistema de Sorteio
        </h1>
        <p className="text-muted-foreground text-sm">
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

            {/* Honeypot field - hidden from users but visible to bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
              aria-hidden="true"
            />

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
        <div className="text-center p-6 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground text-sm">
            As inscrições estão encerradas no momento.
          </p>
        </div>
      )}
    </PublicPageLayout>
  );
};

export default Index;
