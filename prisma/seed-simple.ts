import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

async function main() {
    console.log("Starting database seed...")

    // Create your user
    const userResult = await pool.query(`
    INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name
    RETURNING *
  `, ['cmkg3t2jy000sxujpfdxbcqpd', 'drleewarden@gmail.com', 'darryn lee-warden'])

    const user = userResult.rows[0]
    console.log("Created user:", user.email)

    // Create child 1
    const child1Result = await pool.query(`
    INSERT INTO "child-details" (id, "firstName", "lastName", "dateOfBirth", gender, allergies, "medicalInfo", notes, "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `, ['Emma', 'Johnson', '2018-05-15', 'Female', 'Peanuts, Dairy', 'Asthma - uses inhaler', 'Loves reading and drawing', user.id])

    const child1 = child1Result.rows[0]
    console.log("Created child:", child1.firstName, child1.lastName)

    // Create events for child 1
    await pool.query(`
    INSERT INTO "child-events" (id, name, "eventType", "childId", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'First Day of School', 'Education', $1, NOW(), NOW()),
      (gen_random_uuid(), 'Birthday Party', 'Celebration', $1, NOW(), NOW()),
      (gen_random_uuid(), 'Doctor Checkup', 'Medical', $1, NOW(), NOW())
  `, [child1.id])

    // Create child 2
    const child2Result = await pool.query(`
    INSERT INTO "child-details" (id, "firstName", "lastName", "dateOfBirth", gender, allergies, "medicalInfo", notes, "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `, ['Liam', 'Johnson', '2020-08-22', 'Male', 'None', 'No known conditions', 'Very active, loves soccer', user.id])

    const child2 = child2Result.rows[0]
    console.log("Created child:", child2.firstName, child2.lastName)

    // Create events for child 2
    await pool.query(`
    INSERT INTO "child-events" (id, name, "eventType", "childId", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Soccer Practice', 'Sports', $1, NOW(), NOW()),
      (gen_random_uuid(), 'Dentist Appointment', 'Medical', $1, NOW(), NOW()),
      (gen_random_uuid(), 'Playdate at Park', 'Social', $1, NOW(), NOW()),
      (gen_random_uuid(), 'Swimming Lessons', 'Sports', $1, NOW(), NOW())
  `, [child2.id])

    // Create child 3
    const child3Result = await pool.query(`
    INSERT INTO "child-details" (id, "firstName", "lastName", "dateOfBirth", gender, allergies, "medicalInfo", notes, "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `, ['Sophia', 'Williams', '2019-11-03', 'Female', 'Shellfish', 'None', 'Enjoys arts and crafts', user.id])

    const child3 = child3Result.rows[0]
    console.log("Created child:", child3.firstName, child3.lastName)

    // Create events for child 3
    await pool.query(`
    INSERT INTO "child-events" (id, name, "eventType", "childId", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Art Class', 'Education', $1, NOW(), NOW()),
      (gen_random_uuid(), 'Allergy Test', 'Medical', $1, NOW(), NOW()),
      (gen_random_uuid(), 'Music Recital', 'Performance', $1, NOW(), NOW())
  `, [child3.id])

    // Create child 4
    const child4Result = await pool.query(`
    INSERT INTO "child-details" (id, "firstName", "lastName", "dateOfBirth", gender, allergies, "medicalInfo", notes, "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `, ['Oliver', 'Brown', '2021-03-10', 'Male', 'Lactose intolerant', 'None', 'Starting preschool soon', user.id])

    const child4 = child4Result.rows[0]
    console.log("Created child:", child4.firstName, child4.lastName)

    // Create events for child 4
    await pool.query(`
    INSERT INTO "child-events" (id, name, "eventType", "childId", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Preschool Enrollment', 'Education', $1, NOW(), NOW()),
      (gen_random_uuid(), 'Playgroup', 'Social', $1, NOW(), NOW())
  `, [child4.id])

    console.log("✅ Database seeded successfully!")
}

main()
    .catch((e) => {
        console.error("Error seeding database:", e)
        process.exit(1)
    })
    .finally(async () => {
        await pool.end()
    })
