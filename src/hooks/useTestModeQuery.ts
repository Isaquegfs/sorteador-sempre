import { useTestMode } from '@/contexts/TestModeContext';

/**
 * Hook para facilitar queries com filtro de modo teste
 * Retorna o valor correto de is_test baseado no modo atual
 */
export const useTestModeQuery = () => {
  const { isTestMode } = useTestMode();
  
  return {
    isTestMode,
    testFilter: isTestMode,
  };
};
