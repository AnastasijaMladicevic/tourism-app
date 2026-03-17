--CREATE DATABASE turizam;
--CREATE USER turizam_korisnik WITH PASSWORD 'turizam_sifra';
--GRANT ALL PRIVILEGES ON DATABASE turizam TO turizam_korisnik;
--GRANT ALL ON SCHEMA public TO turizam_korisnik;
--ALTER USER turizam_korisnik CREATEDB;
--\q
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE kategorije (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    naziv        VARCHAR(100) NOT NULL UNIQUE,
    ikonica        VARCHAR(10),                   
    kreiran  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE destinacije (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    naziv            VARCHAR(200) NOT NULL,
    opis            TEXT,
    lokacija        VARCHAR(200) NOT NULL,      
    zemlja         VARCHAR(100) NOT NULL DEFAULT 'Srbija',
    url_slike       TEXT,
    kategorija_id     UUID NOT NULL REFERENCES kategorije(id) ON DELETE RESTRICT,
    prosecna_ocena      NUMERIC(3,2) DEFAULT 0,    
    broj_recenzija    INTEGER DEFAULT 0,
    kreiran      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updejtovan     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_destinacije_category ON destinacije(kategorija_id);

CREATE INDEX idx_destinacije_ocena ON destinacije(prosecna_ocena DESC);

CREATE TABLE recenzije (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinacija_id  UUID NOT NULL REFERENCES destinacije(id) ON DELETE CASCADE,
    autor_naziv     VARCHAR(100) NOT NULL,
    ocena          SMALLINT NOT NULL CHECK (ocena BETWEEN 1 AND 5),
    komentar         TEXT,
    kreiran      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recenzija_destination ON recenzija(destinacija_id);

CREATE OR REPLACE FUNCTION update_destinacija_ocena()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE destinacije
    SET
        prosecna_ocena   = (
            SELECT COALESCE(ROUND(AVG(ocena)::NUMERIC, 2), 0)
            FROM recenzije
            WHERE destinacija_id = COALESCE(NEW.destinacija_id, OLD.destinacija_id)
        ),
        broj_recenzija = (
            SELECT COUNT(*)
            FROM recenzije
            WHERE destinacija_id = COALESCE(NEW.destinacija_id, OLD.destinacija_id)
        ),
        updejtovan  = NOW()
    WHERE id = COALESCE(NEW.destinacija_id, OLD.destinacija_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_ocena
AFTER INSERT OR UPDATE OR DELETE ON recenzije
FOR EACH ROW EXECUTE FUNCTION update_destinacija_ocena();
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updejtovan= NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_destinacije_updated_at
BEFORE UPDATE ON destinacije
FOR EACH ROW EXECUTE FUNCTION set_updated_at();