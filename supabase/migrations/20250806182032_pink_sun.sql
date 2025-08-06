/*
  # Créer la table de test pour la vérification de connexion

  1. Nouvelles Tables
    - `_test`
      - `id` (uuid, clé primaire)
      - `created_at` (timestamp)
  
  2. Sécurité
    - Active RLS sur la table `_test`
    - Ajoute une politique pour permettre la lecture à tous les utilisateurs authentifiés
  
  3. Notes
    - Cette table est utilisée uniquement pour vérifier la connexion Supabase
    - Elle élimine l'erreur PGRST205 dans la console du navigateur
*/

CREATE TABLE IF NOT EXISTS _test (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE _test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to test table"
  ON _test
  FOR SELECT
  TO authenticated
  USING (true);