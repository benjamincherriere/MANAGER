/*
  # Initialize Plus de Bulles Database Schema

  1. New Tables
    - `suppliers` - Fournisseurs avec informations de contact
    - `meetings` - Rendez-vous avec les fournisseurs  
    - `financial_data` - Données financières quotidiennes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Sample Data
    - Demo suppliers and meetings
    - Sample financial data for testing
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create financial_data table
CREATE TABLE IF NOT EXISTS financial_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meetings_supplier_id ON meetings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_financial_data_date ON financial_data(date DESC);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers
CREATE POLICY "Allow all operations on suppliers for authenticated users"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for meetings
CREATE POLICY "Allow all operations on meetings for authenticated users"
  ON meetings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for financial_data
CREATE POLICY "Allow all operations on financial_data for authenticated users"
  ON financial_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample data
INSERT INTO suppliers (name, contact_person, email, phone) VALUES
  ('Fournisseur Demo 1', 'Jean Dupont', 'jean@demo1.com', '01 23 45 67 89'),
  ('Fournisseur Demo 2', 'Marie Martin', 'marie@demo2.com', '01 98 76 54 32'),
  ('Fournisseur Demo 3', 'Pierre Durand', 'pierre@demo3.com', '01 11 22 33 44')
ON CONFLICT DO NOTHING;

-- Insert sample meetings
INSERT INTO meetings (supplier_id, meeting_date, notes)
SELECT 
  s.id,
  CURRENT_DATE - INTERVAL '30 days',
  'Réunion de suivi - tout va bien'
FROM suppliers s
WHERE s.name = 'Fournisseur Demo 1'
ON CONFLICT DO NOTHING;

-- Insert sample financial data
INSERT INTO financial_data (date, revenue, costs) VALUES
  (CURRENT_DATE - INTERVAL '7 days', 1250.50, 890.25),
  (CURRENT_DATE - INTERVAL '6 days', 1180.75, 820.40),
  (CURRENT_DATE - INTERVAL '5 days', 1350.00, 950.00),
  (CURRENT_DATE - INTERVAL '4 days', 1420.25, 980.15),
  (CURRENT_DATE - INTERVAL '3 days', 1100.00, 750.00),
  (CURRENT_DATE - INTERVAL '2 days', 1380.50, 920.30),
  (CURRENT_DATE - INTERVAL '1 day', 1290.75, 870.50),
  (CURRENT_DATE, 1450.00, 1000.00)
ON CONFLICT (date) DO NOTHING;