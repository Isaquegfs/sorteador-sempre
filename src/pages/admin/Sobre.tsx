import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Code, Shield } from 'lucide-react';

const Sobre = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Sobre o Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Informações sobre o sistema de sorteio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sistema de Sorteio Sempre Internet</CardTitle>
          <CardDescription>
            Versão 1.0
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Desenvolvido por</h3>
                <p className="text-sm text-muted-foreground">
                  Isaque Gabriel e Valderson Santos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Setor</h3>
                <p className="text-sm text-muted-foreground">
                  Infra TI — Sempre Internet
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Recursos</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Cadastro seguro de participantes</li>
                  <li>• Validação com base oficial</li>
                  <li>• Sistema de sorteio automatizado</li>
                  <li>• Controle de acesso por funções (Admin/Moderador)</li>
                  <li>• Proteção de dados sensíveis (CPF criptografado)</li>
                  <li>• Histórico completo de sorteios</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} Sempre Internet. Todos os direitos reservados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sobre;
