import 'reflect-metadata';
import DataSource from '../src/database/data-source';
import { User } from '../src/users/user.entity';
import { Role } from '../src/common/enums/role.enum';

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('Missing SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD');
    process.exit(1);
  }

  const ds = await DataSource.initialize();
  try {
    const repo = ds.getRepository(User);
    const existing = await repo.findOne({ where: { email: email.toLowerCase() } });

    if (existing) {
      console.log(`Super admin already exists: ${email}`);
    } else {
      const user = repo.create({
        name,
        email: email.toLowerCase(),
        password,
        role: Role.SUPERADMIN,
        isActive: true,
      });
      await repo.save(user);
      console.log(`Seeded super admin: ${email}`);
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
