import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';

export interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const INITIAL_USERS: SeedUser[] = [
  {
    name: 'Organizer User',
    email: 'organizer@elite.dev',
    password: 'password',
    role: UserRole.ORGANIZER,
  },
  {
    name: 'Customer One',
    email: 'customer1@elite.dev',
    password: 'password',
    role: UserRole.CUSTOMER,
  },
  {
    name: 'Customer Two',
    email: 'customer2@elite.dev',
    password: 'password',
    role: UserRole.CUSTOMER,
  },
  {
    name: 'Gate User',
    email: 'gate@elite.dev',
    password: 'password',
    role: UserRole.GATE,
  },
];

export async function seedUsers(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepository = AppDataSource.getRepository(User);
  const saltRounds = 10;

  for (const seedUser of INITIAL_USERS) {
    const normalizedEmail = seedUser.email.toLowerCase().trim();
    const existing = await userRepository.findOne({
      where: { email: normalizedEmail },
    });

    const passwordHash = await bcrypt.hash(seedUser.password, saltRounds);

    if (existing) {
      existing.name = seedUser.name;
      existing.passwordHash = passwordHash;
      existing.role = seedUser.role;
      await userRepository.save(existing);
      console.log(`Updated user: ${normalizedEmail} (${seedUser.role})`);
    } else {
      const newUser = userRepository.create({
        name: seedUser.name,
        email: normalizedEmail,
        passwordHash,
        role: seedUser.role,
      });
      await userRepository.save(newUser);
      console.log(`Created user: ${normalizedEmail} (${seedUser.role})`);
    }
  }
}

if (require.main === module) {
  seedUsers()
    .then(async () => {
      console.log('User seed completed successfully.');
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Error running user seed:', err);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(1);
    });
}
