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
  {
    name: 'Nolasma',
    aliases: [],
    line: 'Dermatologia',
    presentation: 'Tubo de 15 gramos',
    composition: 'Crema de tetrinoina 0.025% + hidrocortisona 1% + hidroquinona 2%',
    dosage: 'Aplicar cada noche ligeramente sobre el area afectada 30 minutos antes de acostarse.',
    details: 'Reduce significativamente el melasma en 4 semanas con menos irritacion. Muestra una eficacia superior y mayor cumplimiento.',
    imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Zoterb Crema',
    aliases: [],
    line: 'Antifungicos',
    presentation: 'Tubo de 20 gramos',
    composition: 'Terbinafina 1%',
    dosage: 'Aplicar una o dos veces al dia en el area afectada.',
    details: 'Muy eficaz en infecciones superficiales de la piel como tina inguinal y pie de atleta. Menores tasas de recaida por efecto fungicida.',
    imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Zoterb Tabletas',
    aliases: ['Zoterb Tabs'],
    line: 'Antifungicos',
    presentation: 'Caja x 14 tabletas',
    composition: 'Terbinafina 250 mg',
    dosage: 'Una vez al dia por 6 semanas (unas manos) o 12 semanas (unas pies) segun gravedad.',
    details: 'Tasas de curacion micologicas y clinicas a largo plazo significativamente mas altas en onicomicosis.',
    imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Epivate',
    aliases: ['Épivate'],
    line: 'Dermatologia',
    presentation: 'Tubo de 30 gramos',
    composition: 'Crema de clobetasol 0.05%',
    dosage: 'Aplicar una o dos veces al dia hasta 2 semanas en las areas afectadas.',
    details: 'Corticoide super potente con base emoliente. Propiedades antiinflamatorias, antipruriginosas y vasoconstrictoras.',
    imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Pioday M',
    aliases: ['Pioday'],
    line: 'Diabetes',
    presentation: 'Caja x 30 tabletas',
    composition: 'Pioglitazona 15 mg + metformina 500 mg',
    dosage: '1 a 3 tabletas al dia dependiendo del caso especifico del paciente.',
    details: 'Control glucemico integral y beneficios sobre factores de riesgo cardiovascular y parametros lipidicos.',
    imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Alcet 5',
    aliases: [],
    line: 'Alergias',
    presentation: 'Caja x 10 tabletas',
    composition: 'Levocetiricina 5 mg',
    dosage: 'Adultos: 1 tableta al dia por la tarde. Ninos > 12: 1 tableta. < 12: media tableta.',
    details: 'Antihistaminico de tercera generacion sin somnolencia. Efecto de larga duracion y dosis conveniente.',
    imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Odcan',
    aliases: [],
    line: 'Antifungicos',
    presentation: 'Dispensador x 50 tabletas',
    composition: 'Fluconazol 200 mg',
    dosage: '2 tabletas el primer dia, luego 1 o 2 hasta el dia 7. Dosis unica en candidiasis vaginal.',
    details: 'Antimicotico de amplio espectro, 100% efectivo en pitiriasis versicolor y alta tasa en candidiasis vaginal.',
    imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80',
  },
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
    const { aliases, ...productData } = product;
    const existingProduct = await ProductModel.findOne({ name: { $in: [product.name, ...aliases] } });

    if (existingProduct) {
      await ProductModel.updateOne({ _id: existingProduct._id }, { $set: productData, $setOnInsert: { active: true } });
    } else {
      await ProductModel.create({ ...productData, active: true });
    }
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
