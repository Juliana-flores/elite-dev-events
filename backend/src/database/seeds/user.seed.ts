export { INITIAL_USERS, seedUsers, seedEvents, runSeed } from './seed';
export type { SeedUser } from './seed';

import { runSeed } from './seed';

if (require.main === module) {
  runSeed()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
