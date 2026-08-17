import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { Event } from '../../modules/events/entities/event.entity';
import { EventStatus } from '../../modules/events/enums/event-status.enum';

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

export async function seedUsers(): Promise<User> {
  const userRepository = AppDataSource.getRepository(User);
  const saltRounds = 10;
  let organizerUser: User | null = null;

  for (const seedUser of INITIAL_USERS) {
    const normalizedEmail = seedUser.email.toLowerCase().trim();
    let user = await userRepository.findOne({
      where: { email: normalizedEmail },
    });

    const passwordHash = await bcrypt.hash(seedUser.password, saltRounds);

    if (user) {
      user.name = seedUser.name;
      user.passwordHash = passwordHash;
      user.role = seedUser.role;
      user = await userRepository.save(user);
      console.log(`Updated user: ${normalizedEmail} (${seedUser.role})`);
    } else {
      user = userRepository.create({
        name: seedUser.name,
        email: normalizedEmail,
        passwordHash,
        role: seedUser.role,
      });
      user = await userRepository.save(user);
      console.log(`Created user: ${normalizedEmail} (${seedUser.role})`);
    }

    if (user.role === UserRole.ORGANIZER) {
      organizerUser = user;
    }
  }

  if (!organizerUser) {
    throw new Error(
      'Organizer user could not be found or created during seed.',
    );
  }

  return organizerUser;
}

export async function seedEvents(organizerId: string): Promise<void> {
  const eventRepository = AppDataSource.getRepository(Event);

  const initialEventCatalogId = '157336';
  const existingEvent = await eventRepository.findOne({
    where: {
      organizerId,
      externalCatalogId: initialEventCatalogId,
    },
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  if (existingEvent) {
    existingEvent.title = 'Interstellar - Sessão Exclusiva';
    existingEvent.description =
      'Sessão especial de exibição de Interstellar para a comunidade Elite Dev.';
    existingEvent.imageUrl =
      'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg';
    existingEvent.location = 'Cine Elite - Sala IMAX';
    existingEvent.capacity = 100;
    existingEvent.price = '45.00';
    existingEvent.status = EventStatus.PUBLISHED;

    if (new Date(existingEvent.startsAt) <= new Date()) {
      existingEvent.startsAt = futureDate;
    }

    await eventRepository.save(existingEvent);
    console.log(
      `Updated initial published event: ${existingEvent.title} (ID: ${existingEvent.id})`,
    );
  } else {
    const newEvent = eventRepository.create({
      organizerId,
      externalCatalogId: initialEventCatalogId,
      title: 'Interstellar - Sessão Exclusiva',
      description:
        'Sessão especial de exibição de Interstellar para a comunidade Elite Dev.',
      imageUrl:
        'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      startsAt: futureDate,
      location: 'Cine Elite - Sala IMAX',
      capacity: 100,
      price: '45.00',
      status: EventStatus.PUBLISHED,
    });

    const savedEvent = await eventRepository.save(newEvent);
    console.log(
      `Created initial published event: ${savedEvent.title} (ID: ${savedEvent.id})`,
    );
  }
}

export async function runSeed(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const organizer = await seedUsers();
  await seedEvents(organizer.id);
}

if (require.main === module) {
  runSeed()
    .then(async () => {
      console.log('Seed completed successfully.');
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Error running seed:', err);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(1);
    });
}
