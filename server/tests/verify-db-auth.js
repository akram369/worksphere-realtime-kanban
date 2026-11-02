const { prisma } = require('../src/db/prisma');
const bcrypt = require('bcryptjs');

async function verifyDbAuth() {
  console.log('--- Database Verification: Neon PostgreSQL Table "users" ---');
  
  const email = 'rahul@abctech.com';
  // 1. Fetch user from Neon PostgreSQL
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log('User not found in DB!');
    return;
  }

  console.log('1. User Record Retrieved from Database:');
  console.log('   - ID:           ', user.id);
  console.log('   - Name:         ', user.name);
  console.log('   - Email:        ', user.email);
  console.log('   - Password Hash:', user.password_hash);

  // 2. Test password verification
  console.log('\n2. Bcrypt Comparison Against Database Hash:');
  const valid = bcrypt.compareSync('Password123!', user.password_hash);
  const invalid = bcrypt.compareSync('WrongPassword', user.password_hash);

  console.log('   - With "Password123!":', valid ? 'VALID (Matches database hash)' : 'INVALID');
  console.log('   - With "WrongPassword":', invalid ? 'VALID' : 'REJECTED (Does not match)');

  await prisma.$disconnect();
}

verifyDbAuth();
