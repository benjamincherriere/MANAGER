/*
  # Création de la table pour les données financières

  1. Nouvelle Table
    - `financial_data`
      - `id` (uuid, clé primaire)
      - `date` (date, date des données)
      - `revenue` (decimal, chiffre d'affaires)
      - `costs` (decimal, coûts)
      - `margin` (decimal, marge calculée)
      - `margin_percentage` (decimal, pourcentage de marge)
      - `created_at` (timestamp)

  2. Sécurité
    - Activation de RLS sur la table
    - Politique pour permettre toutes les opérations aux utilisateurs authentifiés

  3. Contraintes
    - Date unique pour éviter les doublons
    - Valeurs positives pour revenue et costs
*/

-- Création de la table financial_data
CREATE TABLE IF NOT EXISTS financial_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  revenue decimal(10,2) NOT NULL CHECK (revenue >= 0),
  costs decimal(10,2) NOT NULL CHECK (costs >= 0),
  margin decimal(10,2) GENERATED ALWAYS AS (revenue - costs) STORED,
  margin_percentage decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN revenue > 0 THEN ((revenue - costs) / revenue * 100)
      ELSE 0
    END
  ) STORED,
  created_at timestamptz DEFAULT now()
);

-- Activation de RLS
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations aux utilisateurs authentifiés
CREATE POLICY "Allow all operations on financial_data for authenticated users"
  ON financial_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_financial_data_date ON financial_data(date DESC);