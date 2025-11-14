-- Adicionar novos campos para personalização avançada do título
ALTER TABLE temas 
ADD COLUMN IF NOT EXISTS estilo_titulo text DEFAULT 'cor' CHECK (estilo_titulo IN ('cor', 'degrade', 'textura')),
ADD COLUMN IF NOT EXISTS degrade_inicio text,
ADD COLUMN IF NOT EXISTS degrade_fim text,
ADD COLUMN IF NOT EXISTS degrade_direcao text DEFAULT 'to right' CHECK (degrade_direcao IN ('to right', 'to left', 'to top', 'to bottom', 'to top right', 'to top left', 'to bottom right', 'to bottom left')),
ADD COLUMN IF NOT EXISTS textura_url text;