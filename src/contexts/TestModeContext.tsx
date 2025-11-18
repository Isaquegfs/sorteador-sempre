import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestModeContextType {
  isTestMode: boolean;
  isLoading: boolean;
  activateTestMode: () => Promise<void>;
  deactivateTestMode: () => Promise<void>;
}

const TestModeContext = createContext<TestModeContextType | undefined>(undefined);

export const TestModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTestMode, setIsTestMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTestModeStatus();
  }, []);

  const loadTestModeStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sistema_config')
        .select('test_mode_active')
        .single();

      if (error) throw error;
      setIsTestMode(data?.test_mode_active || false);
    } catch (error) {
      console.error('Erro ao carregar status do modo teste:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activateTestMode = async () => {
    try {
      setIsLoading(true);

      // Copiar dados existentes como dados de teste
      const { data: participantes } = await supabase
        .from('participantes')
        .select('*')
        .eq('is_test', false);

      const { data: baseOficial } = await supabase
        .from('base_oficial')
        .select('*')
        .eq('is_test', false);

      const { data: premios } = await supabase
        .from('premios')
        .select('*')
        .eq('is_test', false);

      // Inserir cópias com is_test = true
      if (participantes && participantes.length > 0) {
        const testParticipantes = participantes.map(({ id, created_at, ...rest }) => ({
          ...rest,
          is_test: true,
        }));
        await supabase.from('participantes').insert(testParticipantes);
      }

      if (baseOficial && baseOficial.length > 0) {
        const testBaseOficial = baseOficial.map(({ id, created_at, ...rest }) => ({
          ...rest,
          is_test: true,
        }));
        await supabase.from('base_oficial').insert(testBaseOficial);
      }

      if (premios && premios.length > 0) {
        const testPremios = premios.map(({ id, created_at, updated_at, ...rest }) => ({
          ...rest,
          is_test: true,
        }));
        await supabase.from('premios').insert(testPremios);
      }

      // Ativar modo teste
      const { data: config } = await supabase
        .from('sistema_config')
        .select('id')
        .single();

      if (config) {
        await supabase
          .from('sistema_config')
          .update({ test_mode_active: true })
          .eq('id', config.id);
      }

      setIsTestMode(true);
      toast.success('Modo de Testes ativado! Todas as ações agora são simuladas.');
    } catch (error) {
      console.error('Erro ao ativar modo teste:', error);
      toast.error('Erro ao ativar modo de testes');
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateTestMode = async () => {
    try {
      setIsLoading(true);

      // Deletar todos os dados de teste
      await Promise.all([
        supabase.from('sorteados').delete().eq('is_test', true),
        supabase.from('participantes').delete().eq('is_test', true),
        supabase.from('base_oficial').delete().eq('is_test', true),
        supabase.from('premios').delete().eq('is_test', true),
      ]);

      // Desativar modo teste
      const { data: config } = await supabase
        .from('sistema_config')
        .select('id')
        .single();

      if (config) {
        await supabase
          .from('sistema_config')
          .update({ test_mode_active: false })
          .eq('id', config.id);
      }

      setIsTestMode(false);
      toast.success('Modo de Testes desativado! Todos os dados de teste foram descartados.');
    } catch (error) {
      console.error('Erro ao desativar modo teste:', error);
      toast.error('Erro ao desativar modo de testes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TestModeContext.Provider value={{ isTestMode, isLoading, activateTestMode, deactivateTestMode }}>
      {children}
    </TestModeContext.Provider>
  );
};

export const useTestMode = () => {
  const context = useContext(TestModeContext);
  if (context === undefined) {
    throw new Error('useTestMode must be used within a TestModeProvider');
  }
  return context;
};
