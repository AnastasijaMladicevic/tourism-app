CREATE TABLE IF NOT EXISTS words (
    id SERIAL PRIMARY KEY,
    text TEXT
);

INSERT INTO words(text) VALUES ('Hello'), ('World');