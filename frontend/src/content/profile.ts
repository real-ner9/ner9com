import type { Locale } from '@/i18n'
import type { Profile } from '@/types/content'

// Language-independent part; the per-language fields are filled in at the bottom. All copy comes
// from the owner's Fullstack CV; Telegram, the channel and Instagram were given by the owner.
const base = {
  name: 'NER9',
  role: 'Senior Fullstack Engineer',
  // The Fullstack CV's headline and summary stack.
  stack: [
    'TypeScript',
    'Node.js',
    'React',
    'NestJS',
    'PHP (Laravel)',
    'C#',
    'Vue',
    'PostgreSQL',
    'Redis',
    'RabbitMQ',
    'Next.js',
    'Docker',
    'Claude Code',
  ],
  // The beat drops at 29.2 s; start a few seconds before it.
  introTrack: { album: 'Chief Keef - Finally Rich', title: "Hate Bein' Sober", startAt: 24 },
  contacts: (labels: { phone: string; channel: string }) => [
    {
      label: 'Email',
      href: 'mailto:yakikbutovski353@gmail.com',
      value: 'yakikbutovski353@gmail.com',
    },
    { label: labels.phone, href: 'tel:+66910395394', value: '+66 91 039 5394' },
    { label: 'Telegram', href: 'https://t.me/real_ner9', value: '@real_ner9' },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/savva-kashin/',
      value: 'in/savva-kashin',
    },
    { label: 'GitHub', href: 'https://github.com/real-ner9', value: 'real-ner9' },
    { label: 'Instagram', href: 'https://www.instagram.com/real_ner9/', value: '@real_ner9' },
    { label: labels.channel, href: 'https://t.me/ner9s', value: '@ner9s' },
  ],
}

export const profile: Record<Locale, Profile> = {
  ru: {
    ...base,
    fullName: 'Савва Кашин',
    summary:
      'Fullstack-инженер, 8 лет делаю веб-продукты целиком: сервисы на Node.js, NestJS, PHP (Laravel) и C# поверх PostgreSQL, Redis и RabbitMQ, на фронтенде React, Vue и TypeScript. Вырос из фронтенд-разработчика в тимлида fullstack-команды, затем работал архитектором на контрактах.',
    location: 'Бангкок, Таиланд',
    contacts: base.contacts({ phone: 'Телефон', channel: 'Telegram-канал' }),
  },
  uk: {
    ...base,
    fullName: 'Савва Кашин',
    summary:
      'Fullstack-інженер, 8 років роблю вебпродукти повністю: сервіси на Node.js, NestJS, PHP (Laravel) і C# поверх PostgreSQL, Redis і RabbitMQ, на фронтенді React, Vue і TypeScript. Виріс із фронтенд-розробника до тімліда fullstack-команди, потім працював архітектором на контрактах.',
    location: 'Бангкок, Таїланд',
    contacts: base.contacts({ phone: 'Телефон', channel: 'Telegram-канал' }),
  },
  en: {
    ...base,
    fullName: 'Savva Kashin',
    summary:
      'Fullstack engineer with 8 years building web products end to end: Node.js, NestJS, PHP (Laravel) and C# services on PostgreSQL, Redis and RabbitMQ, with React, Vue and TypeScript on the frontend. Grew from frontend developer to fullstack team lead, then took on contract architecture work.',
    location: 'Bangkok, Thailand',
    contacts: base.contacts({ phone: 'Phone', channel: 'Telegram channel' }),
  },
}
