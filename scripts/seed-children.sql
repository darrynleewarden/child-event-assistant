-- Get the existing test user ID
DO $$
DECLARE
    user_id TEXT;
BEGIN
    -- Get the first user's ID
    SELECT id INTO user_id FROM "User" LIMIT 1;
    
    -- Add 5 new children (3 with dietary requirements)
    
    -- Child 4: Oliver Smith (Gluten, Eggs)
    INSERT INTO "child-details" ("id", "firstName", "lastName", "dateOfBirth", "gender", "allergies", "medicalInfo", "notes", "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Oliver', 'Smith', '2017-03-12', 'Male', 'Gluten, Eggs', 'Celiac disease - strict gluten-free diet', 'Loves basketball and video games', user_id, NOW(), NOW());
    
    -- Child 5: Isabella Chen (Lactose intolerant, Tree nuts)
    INSERT INTO "child-details" ("id", "firstName", "lastName", "dateOfBirth", "gender", "allergies", "medicalInfo", "notes", "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Isabella', 'Chen', '2019-07-28', 'Female', 'Lactose intolerant, Tree nuts', 'Uses EpiPen for nut allergy', 'Creative and artistic, loves painting', user_id, NOW(), NOW());
    
    -- Child 6: Noah Williams (None)
    INSERT INTO "child-details" ("id", "firstName", "lastName", "dateOfBirth", "gender", "allergies", "medicalInfo", "notes", "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Noah', 'Williams', '2021-01-15', 'Male', 'None', 'No known conditions', 'Energetic toddler, loves animals', user_id, NOW(), NOW());
    
    -- Child 7: Ava Brown (Soy, Fish)
    INSERT INTO "child-details" ("id", "firstName", "lastName", "dateOfBirth", "gender", "allergies", "medicalInfo", "notes", "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Ava', 'Brown', '2018-09-05', 'Female', 'Soy, Fish', 'Food allergies - carries emergency medication', 'Loves reading and science experiments', user_id, NOW(), NOW());
    
    -- Child 8: Lucas Martinez (None)
    INSERT INTO "child-details" ("id", "firstName", "lastName", "dateOfBirth", "gender", "allergies", "medicalInfo", "notes", "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Lucas', 'Martinez', '2020-12-20', 'Male', 'None', 'No known conditions', 'Cheerful and social, loves music', user_id, NOW(), NOW());
    
    RAISE NOTICE '✅ Successfully added 5 new children (3 with dietary requirements)';
END $$;

-- Show all children
SELECT "firstName", "lastName", "allergies", "dateOfBirth" FROM "child-details" ORDER BY "dateOfBirth";
