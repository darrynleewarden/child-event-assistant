-- Seed data for child event assistant

-- Create test user (password is: password123, hashed with bcrypt)
INSERT INTO "User" (id, email, name, password, "emailVerified", "createdAt", "updatedAt")
VALUES (
  'clztest001',
  'test@example.com',
  'Test User',
  '$2a$10$KIXPZpW7Z8qCJXKl.9xmYe0wH0z5h.2x9nOv4zn8jy8.xDKqGqZ2C',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Seed location data
INSERT INTO "location-data" (id, "userId", "suburbName", state, "medianHousePrice", "medianUnitPrice", "rentalPriceHouse", "rentalPriceUnit", "vacancyRate", notes, "isFavorite", "createdAt", "updatedAt")
VALUES
  ('loc001', 'clztest001', 'Melbourne', 'VIC', 1050000, 620000, 550, 420, 1.8, 'CBD area with excellent public transport', true, NOW(), NOW()),
  ('loc002', 'clztest001', 'Sydney', 'NSW', 1450000, 780000, 650, 520, 2.1, 'Major business district', false, NOW(), NOW()),
  ('loc003', 'clztest001', 'Brisbane', 'QLD', 850000, 520000, 480, 380, 1.5, 'Growing market with good investment potential', true, NOW(), NOW()),
  ('loc004', 'clztest001', 'Perth', 'WA', 720000, 450000, 420, 340, 1.2, 'Affordable capital city', false, NOW(), NOW()),
  ('loc005', 'clztest001', 'Adelaide', 'SA', 680000, 420000, 390, 320, 1.4, 'Most affordable capital city', false, NOW(), NOW()),
  ('loc006', 'clztest001', 'Bondi', 'NSW', 3200000, 1150000, 1200, 750, 2.3, 'Premium beachside location', true, NOW(), NOW()),
  ('loc007', 'clztest001', 'Carlton', 'VIC', 1350000, 680000, 620, 450, 1.9, 'Inner city suburb near universities', false, NOW(), NOW()),
  ('loc008', 'clztest001', 'Southbank', 'QLD', 920000, 580000, 520, 420, 1.6, 'Cultural precinct with river views', false, NOW(), NOW())
ON CONFLICT ("userId", "suburbName", state) DO NOTHING;

-- Display results
SELECT 'Users:' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Location Data:', COUNT(*) FROM "location-data";
