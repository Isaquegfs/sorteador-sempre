import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";
import logo from "@/assets/logo-sempre.png";

const Index = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    setor: "",
    cidade: "",
    cpf: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Validate CPF against database
    toast({
      title: "Cadastro efetuado com sucesso!",
      description: "Boa sorte!",
    });
    
    setFormData({
      nome: "",
      email: "",
      setor: "",
      cidade: "",
      cpf: "",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
              Sistema de Sorteio Sempre Internet
            </h1>
            <p className="text-muted-foreground">
              Realize o seu cadastro abaixo para participar do sorteio.
            </p>
          </div>

          {/* Form */}
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
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                type="text"
                required
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
            >
              Cadastrar
            </Button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-sm text-muted-foreground border-t">
        Sistema de Sorteio Sempre Internet
      </footer>
    </div>
  );
};

export default Index;
