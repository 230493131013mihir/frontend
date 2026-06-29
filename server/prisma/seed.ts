import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean database
  await prisma.auditLog.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  // Create default tenant company
  const company = await prisma.company.create({
    data: {
      name: 'Acme Corporation',
      domain: 'acme.skillforge.ai',
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&h=128&fit=crop',
    },
  });
  console.log(`🏢 Created company: ${company.name}`);

  // Create default owner user
  const hashedPassword = await bcrypt.hash('adminpassword123', 10);
  const owner = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      role: Role.COMPANY_OWNER,
      companyId: company.id,
      isVerified: true,
    },
  });
  console.log(`👤 Created owner user: ${owner.email}`);

  // Create default employee user
  const employeeHashedPassword = await bcrypt.hash('employeepassword123', 10);
  const employee = await prisma.user.create({
    data: {
      email: 'employee@acme.com',
      password: employeeHashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: Role.EMPLOYEE,
      companyId: company.id,
      isVerified: true,
    },
  });
  console.log(`👤 Created employee user: ${employee.email}`);

  // Add initial Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: owner.id,
      action: 'SYSTEM_SEED',
      details: 'Initial system provisioning and seed execution',
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
