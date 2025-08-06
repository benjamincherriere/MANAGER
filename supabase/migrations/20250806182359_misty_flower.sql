/*
  # Création des tables pour le module fournisseurs

  1. Nouvelles Tables
    - `suppliers`
      - `id` (uuid, clé primaire)
      - `name` (text, nom du fournisseur)
      - `contact_person` (text, personne de contact)
      - `email` (text, email de contact)
      - `phone` (text, téléphone)
      - `created_at` (timestamp)
    
    - `meetings`
      - `id` (uuid, clé primaire)
      - `supplier_id` (uuid, référence vers suppliers)
      - `meeting_date` (date, date du rendez-vous)
      - `notes` (text, notes sur le rendez-vous)
      - `created_at` (timestamp)

  2. Sécurité
    - Activation de RLS sur les deux tables
    - Politiques pour permettre toutes les opérations aux utilisateurs authentifiés
*/

-- Création de la table suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Création de la table meetings
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Activation de RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Politiques pour suppliers
CREATE POLICY "Allow all operations on suppliers for authenticated users"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politiques pour meetings
CREATE POLICY "Allow all operations on meetings for authenticated users"
  ON meetings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_meetings_supplier_id ON meetings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);