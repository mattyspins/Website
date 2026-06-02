-- Replace all mentions of "Rainbet" with "AceBet" in store item descriptions and names
UPDATE "store_items"
SET description = REPLACE(description, 'Rainbet', 'AceBet')
WHERE description ILIKE '%Rainbet%';

UPDATE "store_items"
SET name = REPLACE(name, 'Rainbet', 'AceBet')
WHERE name ILIKE '%Rainbet%';
