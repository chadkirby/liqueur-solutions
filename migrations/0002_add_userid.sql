-- Migration: Add userid segregation to all tables

-- 1. mixtures table migration
PRAGMA foreign_keys=off;

CREATE TABLE mixtures_new (
  userid TEXT NOT NULL DEFAULT 'default',
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  accessTime TEXT NOT NULL,
  desc TEXT NOT NULL,
  rootIngredientId TEXT NOT NULL,
  _ingredientHash TEXT NOT NULL,
  PRIMARY KEY (userid, id)
);

INSERT INTO mixtures_new (userid, id, version, name, accessTime, desc, rootIngredientId, _ingredientHash)
  SELECT 'default', id, version, name, accessTime, desc, rootIngredientId, _ingredientHash FROM mixtures;

DROP TABLE mixtures;
ALTER TABLE mixtures_new RENAME TO mixtures;

-- 2. mixture_stars table migration
CREATE TABLE mixture_stars_new (
  userid TEXT NOT NULL DEFAULT 'default',
  id TEXT NOT NULL,
  PRIMARY KEY (userid, id)
);

INSERT INTO mixture_stars_new (userid, id)
  SELECT 'default', id FROM mixture_stars;

DROP TABLE mixture_stars;
ALTER TABLE mixture_stars_new RENAME TO mixture_stars;

-- 3. ingredients table migration
CREATE TABLE ingredients_new (
  userid TEXT NOT NULL DEFAULT 'default',
  id TEXT NOT NULL,
  mixture_id TEXT NOT NULL,
  data JSON NOT NULL,
  PRIMARY KEY (userid, id)
);

INSERT INTO ingredients_new (userid, id, mixture_id, data)
  SELECT 'default', id, mixture_id, data FROM ingredients;

DROP TABLE ingredients;
ALTER TABLE ingredients_new RENAME TO ingredients;

PRAGMA foreign_keys=on;
