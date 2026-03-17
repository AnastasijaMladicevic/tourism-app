-- Kreiranje baze
CREATE DATABASE "FootballPlayersDb";

-- Povezi se na bazu (radi u psql ili pgAdmin Query Tool)
\c FootballPlayersDb;

-- Tabela
CREATE TABLE IF NOT EXISTS "Players" (
  "Id" SERIAL PRIMARY KEY,
  "FirstName" VARCHAR(50) NOT NULL,
  "LastName" VARCHAR(50) NOT NULL,
  "Club" VARCHAR(80) NOT NULL,
  "Position" VARCHAR(30) NOT NULL,
  "JerseyNumber" INT NOT NULL CHECK ("JerseyNumber" BETWEEN 1 AND 99),
  "Age" INT NOT NULL CHECK ("Age" BETWEEN 15 AND 45)
);

-- Primer podaci
INSERT INTO "Players" ("FirstName","LastName","Club","Position","JerseyNumber","Age")
VALUES
  ('Nemanja','Vidic','FK Crvena Zvezda','Defender',15,39),
  ('Luka','Modric','Real Madrid','Midfielder',10,38),
  ('Lionel','Messi','Inter Miami','Forward',10,36);

-- Provera
SELECT * FROM "Players";
