import { z } from 'zod';

export const participanteSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  
  email: z.string()
    .trim()
    .email('E-mail inválido')
    .max(255, 'E-mail deve ter no máximo 255 caracteres')
    .toLowerCase(),
  
  cpf: z.string()
    .min(11, 'CPF deve conter 11 dígitos')
    .max(11, 'CPF deve conter 11 dígitos')
    .regex(/^\d+$/, 'CPF deve conter apenas números'),
});

export type ParticipanteFormData = z.infer<typeof participanteSchema>;
