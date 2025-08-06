/*
  # Schema complet Plus de Bulles avec authentification

  1. Tables principales
    - `suppliers` : Fournisseurs avec informations de contact
    - `meetings` : Rendez-vous avec les fournisseurs
    - `financial_data` : Données financières quotidiennes

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour utilisateurs authentifiés uniquement
    - Accès complet aux données pour les utilisateurs connectés

  3. Fonctionnalités
    - Calcul automatique des marges
    - Contraintes de validation
    - Index pour les performances
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des fournisseurs
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Table des rendez-vous
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table des données financières
CREATE TABLE IF NOT EXISTS financial_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  revenue numeric(10,2) NOT NULL CHECK (revenue >= 0),
  costs numeric(10,2) NOT NULL CHECK (costs >= 0),
  margin numeric(10,2) GENERATED ALWAYS AS (revenue - costs) STORED,
  margin_percentage numeric(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN revenue > 0 THEN ((revenue - costs) / revenue) * 100
      ELSE 0
    END
  ) STORED,
  created_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_meetings_supplier_id ON meetings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_financial_data_date ON financial_data(date DESC);

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : Accès complet pour les utilisateurs authentifiés
CREATE POLICY "Allow all operations on suppliers for authenticated users"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on meetings for authenticated users"
  ON meetings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on financial_data for authenticated users"
  ON financial_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insérer des données de démonstration
INSERT INTO suppliers (name, contact_person, email, phone) VALUES
  ('Fournisseur Demo 1', 'Jean Dupont', 'jean@demo.com', '01 23 45 67 89'),
  ('Fournisseur Demo 2', 'Marie Martin', 'marie@demo.com', '01 98 76 54 32')
ON CONFLICT DO NOTHING;

-- Insérer quelques rendez-vous de démonstration
DO $$
DECLARE
  supplier1_id uuid;
  supplier2_id uuid;
BEGIN
  SELECT id INTO supplier1_id FROM suppliers WHERE name = 'Fournisseur Demo 1' LIMIT 1;
  SELECT id INTO supplier2_id FROM suppliers WHERE name = 'Fournisseur Demo 2' LIMIT 1;
  
  IF supplier1_id IS NOT NULL THEN
    INSERT INTO meetings (supplier_id, meeting_date, notes) VALUES
      (supplier1_id, CURRENT_DATE - INTERVAL '30 days', 'Réunion de présentation des nouveaux produits'),
      (supplier1_id, CURRENT_DATE - INTERVAL '10 days', 'Négociation des tarifs 2024')
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF supplier2_id IS NOT NULL THEN
    INSERT INTO meetings (supplier_id, meeting_date, notes) VALUES
      (supplier2_id, CURRENT_DATE - INTERVAL '45 days', 'Visite de l\'entrepôt et audit qualité')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insérer des données financières de démonstration
INSERT INTO financial_data (date, revenue, costs) VALUES
  (CURRENT_DATE - INTERVAL '7 days', 1250.50, 890.25),
  (CURRENT_DATE - INTERVAL '6 days', 1180.75, 820.40),
  (CURRENT_DATE - INTERVAL '5 days', 1420.30, 950.80),
  (CURRENT_DATE - INTERVAL '4 days', 1350.00, 875.60),
  (CURRENT_DATE - INTERVAL '3 days', 1580.90, 1020.45),
  (CURRENT_DATE - INTERVAL '2 days', 1290.40, 810.30),
  (CURRENT_DATE - INTERVAL '1 days', 1450.80, 920.50),
  (CURRENT_DATE, 1380.60, 885.40)
ON CONFLICT (date) DO NOTHING;