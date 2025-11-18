-- Add categoria column to base_oficial table
ALTER TABLE public.base_oficial 
ADD COLUMN categoria TEXT NOT NULL DEFAULT 'sempre' 
CHECK (categoria IN ('sempre', 'autorizados', 'pj', 'onnet'));

-- Add unique constraint on cpf_hash to prevent duplicates across all categories
ALTER TABLE public.base_oficial 
ADD CONSTRAINT base_oficial_cpf_hash_unique UNIQUE (cpf_hash);

-- Add index on categoria for better query performance
CREATE INDEX idx_base_oficial_categoria ON public.base_oficial(categoria);

-- Update existing records to 'sempre' category (already done by DEFAULT but explicit is good)
UPDATE public.base_oficial SET categoria = 'sempre' WHERE categoria IS NULL;