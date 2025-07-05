-- Migration: Initial schema for signalsDb collections, segregated by userid

-- Table: mixtures
CREATE TABLE IF NOT EXISTS mixtures (
  userid TEXT NOT NULL,
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  accessTime TEXT NOT NULL,
  desc TEXT NOT NULL,
  rootIngredientId TEXT NOT NULL,
  _ingredientHash TEXT NOT NULL,
  PRIMARY KEY (userid, id)
);

-- Table: mixture_stars
CREATE TABLE IF NOT EXISTS mixture_stars (
  userid TEXT NOT NULL,
  id TEXT NOT NULL,
  PRIMARY KEY (userid, id)
);

-- Table: ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  userid TEXT NOT NULL,
  id TEXT NOT NULL,
  mixture_id TEXT NOT NULL,
  data JSON NOT NULL,
  PRIMARY KEY (userid, id)
);
