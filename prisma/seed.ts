import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting database seed...")

  // Create your user
  const user = await prisma.user.upsert({
    where: { email: "drleewarden@gmail.com" },
    update: {},
    create: {
      id: "cmkg3t2jy000sxujpfdxbcqpd",
      email: "drleewarden@gmail.com",
      name: "darryn lee-warden",
    },
  })

  console.log("Created user:", user.email)

  // Create child details with events
  const child1 = await prisma.childDetails.create({
    data: {
      firstName: "Emma",
      lastName: "Johnson",
      dateOfBirth: new Date("2018-05-15"),
      gender: "Female",
      allergies: "Peanuts, Dairy",
      medicalInfo: "Asthma - uses inhaler",
      notes: "Loves reading and drawing",
      userId: user.id,
      events: {
        create: [
          {
            name: "First Day of School",
            eventType: "Education",
          },
          {
            name: "Birthday Party",
            eventType: "Celebration",
          },
          {
            name: "Doctor Checkup",
            eventType: "Medical",
          },
        ],
      },
    },
  })

  console.log("Created child:", child1.firstName, child1.lastName)

  const child2 = await prisma.childDetails.create({
    data: {
      firstName: "Liam",
      lastName: "Johnson",
      dateOfBirth: new Date("2020-08-22"),
      gender: "Male",
      allergies: "None",
      medicalInfo: "No known conditions",
      notes: "Very active, loves soccer",
      userId: user.id,
      events: {
        create: [
          {
            name: "Soccer Practice",
            eventType: "Sports",
          },
          {
            name: "Dentist Appointment",
            eventType: "Medical",
          },
          {
            name: "Playdate at Park",
            eventType: "Social",
          },
          {
            name: "Swimming Lessons",
            eventType: "Sports",
          },
        ],
      },
    },
  })

  console.log("Created child:", child2.firstName, child2.lastName)

  const child3 = await prisma.childDetails.create({
    data: {
      firstName: "Sophia",
      lastName: "Johnson",
      dateOfBirth: new Date("2019-11-03"),
      gender: "Female",
      allergies: "Shellfish",
      medicalInfo: "Wears glasses",
      notes: "Enjoys music and dance classes",
      userId: user.id,
      events: {
        create: [
          {
            name: "Piano Recital",
            eventType: "Arts",
          },
          {
            name: "Dance Class",
            eventType: "Arts",
          },
          {
            name: "Eye Exam",
            eventType: "Medical",
          },
        ],
      },
    },
  })

  console.log("Created child:", child3.firstName, child3.lastName)

  // Add 5 more children with varied dietary requirements
  const child4 = await prisma.childDetails.create({
    data: {
      firstName: "Oliver",
      lastName: "Smith",
      dateOfBirth: new Date("2017-03-12"),
      gender: "Male",
      allergies: "Gluten, Eggs",
      medicalInfo: "Celiac disease - strict gluten-free diet",
      notes: "Loves basketball and video games",
      userId: user.id,
      events: {
        create: [
          {
            name: "Basketball Training",
            eventType: "Sports",
          },
          {
            name: "Nutritionist Appointment",
            eventType: "Medical",
          },
          {
            name: "School Camp",
            eventType: "Education",
          },
        ],
      },
    },
  })

  console.log("Created child:", child4.firstName, child4.lastName)

  const child5 = await prisma.childDetails.create({
    data: {
      firstName: "Isabella",
      lastName: "Chen",
      dateOfBirth: new Date("2019-07-28"),
      gender: "Female",
      allergies: "Lactose intolerant, Tree nuts",
      medicalInfo: "Uses EpiPen for nut allergy",
      notes: "Creative and artistic, loves painting",
      userId: user.id,
      events: {
        create: [
          {
            name: "Art Class",
            eventType: "Arts",
          },
          {
            name: "Allergy Clinic",
            eventType: "Medical",
          },
          {
            name: "Friend's Birthday",
            eventType: "Social",
          },
        ],
      },
    },
  })

  console.log("Created child:", child5.firstName, child5.lastName)

  const child6 = await prisma.childDetails.create({
    data: {
      firstName: "Noah",
      lastName: "Williams",
      dateOfBirth: new Date("2021-01-15"),
      gender: "Male",
      allergies: "None",
      medicalInfo: "No known conditions",
      notes: "Energetic toddler, loves animals",
      userId: user.id,
      events: {
        create: [
          {
            name: "Zoo Visit",
            eventType: "Social",
          },
          {
            name: "Playgroup",
            eventType: "Social",
          },
          {
            name: "Vaccination",
            eventType: "Medical",
          },
        ],
      },
    },
  })

  console.log("Created child:", child6.firstName, child6.lastName)

  const child7 = await prisma.childDetails.create({
    data: {
      firstName: "Ava",
      lastName: "Brown",
      dateOfBirth: new Date("2018-09-05"),
      gender: "Female",
      allergies: "Soy, Fish",
      medicalInfo: "Food allergies - carries emergency medication",
      notes: "Loves reading and science experiments",
      userId: user.id,
      events: {
        create: [
          {
            name: "Science Fair",
            eventType: "Education",
          },
          {
            name: "Library Club",
            eventType: "Education",
          },
          {
            name: "Allergist Checkup",
            eventType: "Medical",
          },
        ],
      },
    },
  })

  console.log("Created child:", child7.firstName, child7.lastName)

  const child8 = await prisma.childDetails.create({
    data: {
      firstName: "Lucas",
      lastName: "Martinez",
      dateOfBirth: new Date("2020-12-20"),
      gender: "Male",
      allergies: "None",
      medicalInfo: "No known conditions",
      notes: "Cheerful and social, loves music",
      userId: user.id,
      events: {
        create: [
          {
            name: "Music Class",
            eventType: "Arts",
          },
          {
            name: "Park Playdate",
            eventType: "Social",
          },
          {
            name: "Regular Checkup",
            eventType: "Medical",
          },
        ],
      },
    },
  })

  console.log("Created child:", child8.firstName, child8.lastName)

  // Count total records
  const childCount = await prisma.childDetails.count()
  const eventCount = await prisma.childEvent.count()

  console.log("\n✅ Seed completed!")
  console.log(`- Total children: ${childCount}`)
  console.log(`- Total events: ${eventCount}`)

  // Seed location data for the test user
  console.log("\nSeeding location data...")

  const locationData = [
    {
      suburbName: 'Melbourne',
      state: 'VIC',
      medianHousePrice: 1050000,
      medianUnitPrice: 620000,
      rentalPriceHouse: 550,
      rentalPriceUnit: 420,
      vacancyRate: 1.8,
      notes: 'CBD area with excellent public transport',
      isFavorite: true,
      userId: user.id
    },
    {
      suburbName: 'Sydney',
      state: 'NSW',
      medianHousePrice: 1450000,
      medianUnitPrice: 780000,
      rentalPriceHouse: 650,
      rentalPriceUnit: 520,
      vacancyRate: 2.1,
      notes: 'Major business district',
      isFavorite: false,
      userId: user.id
    },
    {
      suburbName: 'Brisbane',
      state: 'QLD',
      medianHousePrice: 850000,
      medianUnitPrice: 520000,
      rentalPriceHouse: 480,
      rentalPriceUnit: 380,
      vacancyRate: 1.5,
      notes: 'Growing market with good investment potential',
      isFavorite: true,
      userId: user.id
    },
    {
      suburbName: 'Perth',
      state: 'WA',
      medianHousePrice: 720000,
      medianUnitPrice: 450000,
      rentalPriceHouse: 420,
      rentalPriceUnit: 340,
      vacancyRate: 1.2,
      notes: 'Affordable capital city',
      isFavorite: false,
      userId: user.id
    },
    {
      suburbName: 'Adelaide',
      state: 'SA',
      medianHousePrice: 680000,
      medianUnitPrice: 420000,
      rentalPriceHouse: 390,
      rentalPriceUnit: 320,
      vacancyRate: 1.4,
      notes: 'Most affordable capital city',
      isFavorite: false,
      userId: user.id
    },
    {
      suburbName: 'Bondi',
      state: 'NSW',
      medianHousePrice: 3200000,
      medianUnitPrice: 1150000,
      rentalPriceHouse: 1200,
      rentalPriceUnit: 750,
      vacancyRate: 2.3,
      notes: 'Premium beachside location',
      isFavorite: true,
      userId: user.id
    },
    {
      suburbName: 'Carlton',
      state: 'VIC',
      medianHousePrice: 1350000,
      medianUnitPrice: 680000,
      rentalPriceHouse: 620,
      rentalPriceUnit: 450,
      vacancyRate: 1.9,
      notes: 'Inner city suburb near universities',
      isFavorite: false,
      userId: user.id
    },
    {
      suburbName: 'Southbank',
      state: 'QLD',
      medianHousePrice: 920000,
      medianUnitPrice: 580000,
      rentalPriceHouse: 520,
      rentalPriceUnit: 420,
      vacancyRate: 1.6,
      notes: 'Cultural precinct with river views',
      isFavorite: false,
      userId: user.id
    }
  ];

  // Use upsert to avoid duplicates on re-running seed
  for (const location of locationData) {
    await prisma.locationData.upsert({
      where: {
        userId_suburbName_state: {
          userId: user.id,
          suburbName: location.suburbName,
          state: location.state
        }
      },
      update: location,
      create: location
    });
  }

  console.log(`✅ Seeded ${locationData.length} location records`)
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
