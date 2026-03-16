	CREATE TABLE IF NOT EXISTS testdata (
    id SERIAL PRIMARY KEY,
    message TEXT
);

INSERT INTO testdata (message)
SELECT 'Angular i .NET povezani preko PostgreSQL'
WHERE NOT EXISTS (SELECT 1 FROM testdata);