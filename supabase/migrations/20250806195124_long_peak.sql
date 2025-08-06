/*
  # Ajouter table de configuration utilisateur

  1. Nouvelle table
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `setting_key` (text, unique par utilisateur)
      - `setting_value` (jsonb, valeur flexible)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur `user_settings`
    - Politique pour que les utilisateurs ne voient que leurs paramètres

  3. Fonction utilitaire
    - Fonction pour créer la table si elle n'existe pas
*/

-- Créer la table user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_key_idx 
ON user_settings(user_id, setting_key);

CREATE INDEX IF NOT EXISTS user_settings_key_idx 
ON user_settings(setting_key);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Politique RLS : les utilisateurs ne voient que leurs paramètres
CREATE POLICY "Users can manage their own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction utilitaire pour créer la table (appelée depuis l'edge function)
CREATE OR REPLACE FUNCTION create_user_settings_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Cette fonction ne fait rien car la table est déjà créée par la migration
  -- Elle existe juste pour éviter les erreurs dans l'edge function
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction RPC pour créer la table (fallback)
CREATE OR REPLACE FUNCTION create_user_settings_table()
RETURNS void AS $$
BEGIN
  -- Cette fonction ne fait rien car la table est déjà créée par la migration
  -- Elle existe juste pour éviter les erreurs dans l'edge function
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;