-- Migration: Initial schema for liqueur solutions database

-- Table: mixtures
CREATE TABLE IF NOT EXISTS mixtures (
  userid TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  desc TEXT NOT NULL,
  rootIngredientId TEXT NOT NULL,
  updated TEXT NOT NULL,
  hash TEXT NOT NULL,
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (userid, id)
);

-- Table: ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  userid TEXT NOT NULL,
  id TEXT NOT NULL,
  mx_id TEXT NOT NULL,
  data JSON NOT NULL,
  PRIMARY KEY (userid, mx_id, id) -- Composite primary key to ensure unique ingredients per mixture
);
