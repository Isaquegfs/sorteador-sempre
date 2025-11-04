/**
 * Implementação do algoritmo Fisher-Yates (Knuth shuffle)
 * Garante aleatoriedade verdadeira com distribuição uniforme
 * Sem viés estatístico - cada permutação tem a mesma probabilidade
 */
export const fisherYatesShuffle = <T>(array: T[]): T[] => {
  // Criar cópia para não modificar o array original
  const shuffled = [...array];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Gerar índice aleatório entre 0 e i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));
    
    // Trocar elementos nas posições i e j
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

/**
 * Seleciona N elementos aleatórios de um array sem repetição
 * Usa Fisher-Yates para garantir distribuição uniforme
 */
export const selectRandomItems = <T>(array: T[], count: number): T[] => {
  if (count >= array.length) {
    return fisherYatesShuffle(array);
  }
  
  // Embaralhar e pegar os primeiros N elementos
  const shuffled = fisherYatesShuffle(array);
  return shuffled.slice(0, count);
};
