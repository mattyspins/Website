-- Replace all mentions of "AceBet" with "Razed" in store item descriptions and names
UPDATE "store_items"
SET description = REPLACE(description, 'AceBet', 'Razed')
WHERE description ILIKE '%AceBet%';

UPDATE "store_items"
SET name = REPLACE(name, 'AceBet', 'Razed')
WHERE name ILIKE '%AceBet%';
