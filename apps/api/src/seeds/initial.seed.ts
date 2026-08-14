import bcrypt from 'bcryptjs';
import { CycleModel } from '../models/cycle.model.js';
import { ProductModel } from '../models/product.model.js';
import { SpecialtyModel } from '../models/specialty.model.js';
import { UserModel } from '../models/user.model.js';

const specialties = [
  { code: 'MG', name: 'Medicina General' },
  { code: 'DER', name: 'Dermatologia' },
  { code: 'MI', name: 'Medicina Interna' },
  { code: 'PED', name: 'Pediatria' },
  { code: 'GO', name: 'Ginecologia' },
  { code: 'OTO', name: 'Otorrinolaringologia' },
  { code: 'ENDO', name: 'Endocrinologia' },
  { code: 'NEU', name: 'Neumologia' },
  { code: 'EST', name: 'Estetica' },
];

const products = [
  { name: 'Zoterb Tabs', line: 'Dermatologica', presentation: 'Tabletas' },
  { name: 'Zoterb Crema', line: 'Dermatologica', presentation: 'Crema' },
  { name: 'Epivate', line: 'Dermatologica', presentation: 'Crema' },
  { name: 'Nolasma', line: 'Respiratoria', presentation: 'Tabletas' },
  { name: 'Pioday', line: 'Metabolica', presentation: 'Tabletas' },
  { name: 'Alcet 5', line: 'Antialergica', presentation: 'Tabletas' },
  { name: 'Odcan', line: 'General', presentation: 'Tabletas' },
];

export async function seedInitialData(options: { adminName: string; adminEmail: string; adminPassword: string }) {
  const existingAdmin = await UserModel.findOne({ email: options.adminEmail.toLowerCase() });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(options.adminPassword, 10);
    await UserModel.create({
      name: options.adminName,
      email: options.adminEmail,
      passwordHash,
      role: 'admin',
      active: true,
    });
  }

  for (const specialty of specialties) {
    await SpecialtyModel.updateOne({ code: specialty.code }, { $setOnInsert: specialty }, { upsert: true });
  }

  for (const product of products) {
    await ProductModel.updateOne({ name: product.name }, { $setOnInsert: product }, { upsert: true });
  }

  for (let number = 1; number <= 10; number += 1) {
    await CycleModel.updateOne(
      { number },
      {
        $setOnInsert: {
          name: `Ciclo ${number}`,
          number,
          startsAt: new Date(Date.UTC(2026, 0, 1 + (number - 1) * 35)),
          endsAt: new Date(Date.UTC(2026, 0, 35 + (number - 1) * 35)),
          active: number === 1,
        },
      },
      { upsert: true },
    );
  }
}
