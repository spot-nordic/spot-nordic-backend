import { db } from '../../configs/db.config';
import { contactRequests } from '../../db/schema';

export const seedContacts = async () => {
  await db.insert(contactRequests).values([
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      subject: 'Bulk Order Inquiry',
      message: 'Interested in purchasing 50 units of the Nordic Vase for our upcoming corporate event. Do you offer wholesale pricing?',
    },
    {
      name: 'Lars Jensen',
      email: 'lars.jensen@nordicdesignco.dk',
      subject: 'Brand Color Inconsistency across Print',
      message: 'Hello, we are experiencing major shifts in our corporate blue when printing on uncoated letterheads versus our glossy brochures. We read about the Spot Matching System on your blog. Can we schedule a consultation to stabilize our brand guidelines?',
    },
    {
      name: 'Emma Ovelar',
      email: 'emma.o@textile-heritage.se',
      subject: 'Textile to Print Translation Services',
      message: 'We manufacture heritage flags and need to ensure our digital and print marketing materials perfectly match the physical dyed fabrics we produce. Standard Pantone and CMYK conversions are failing us. We urgently need your color translation expertise.',
    },
    {
      name: 'David Chen',
      email: 'david@creative-agency.com',
      subject: 'SMS Implementation for Agency',
      message: 'I run a branding agency and we want to adopt the Spot Matching System framework for all our clients\' future brand guidelines. Do you offer licensing, training, or B2B workshops for design teams?',
    },
    {
      name: 'Maria Rossi',
      email: 'm.rossi@packaging-solutions.it',
      subject: 'Corrugated Box Color Issues',
      message: 'Our client\'s vibrant orange logo looks muddy when printed on recycled corrugated cardboard, but fine on their coated labels. Is there a specific Spot Matching formulation we can use to correct the ink absorption issue on the cardboard?',
    }
  ]);
  console.log('✅ Contacts seeded');
};