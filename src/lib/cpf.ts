import { createHash } from 'crypto';

export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .substring(0, 14);
};

export const censurarCPF = (cpf: string): string => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return cpf;
  return `${numbers.substring(0, 3)}.***.***-${numbers.substring(9, 11)}`;
};

export const hashCPF = (cpf: string): string => {
  const numbers = cpf.replace(/\D/g, '');
  return createHash('sha256').update(numbers).digest('hex');
};

export const validarCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(numbers.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(numbers.charAt(10))) return false;

  return true;
};
