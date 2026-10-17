import type { Locale } from '@/i18n'
import type { Profile } from '@/types/content'

// Language-independent part; the per-language fields are filled in at the bottom.
const base = {
  name: 'NER9',
  role: 'Senior Fullstack Engineer',
  stack: [
    'TypeScript',
    'Node.js',
    'NestJS',
    'Python',
    'FastAPI',
    'React',
    'Next.js',
    'Vue',
    'PostgreSQL',
    'Redis',
    'RabbitMQ',
    'Docker',
    'Laravel',
    'C#',
    'Lit',
    'Claude Code',
  ],
  // The beat drops at 29.2 s; start a few seconds before it.
  introTrack: { album: 'Chief Keef - Finally Rich', title: "Hate Bein' Sober", startAt: 24 },
  contacts: (phone: string) => [
    {
      label: 'Email',
      href: 'mailto:yakikbutovski353@gmail.com',
      value: 'yakikbutovski353@gmail.com',
    },
    { label: phone, href: 'tel:+66910395394', value: '+66 91 039 5394' },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/savva-kashin/',
      value: 'in/savva-kashin',
    },
    { label: 'GitHub', href: 'https://github.com/real-ner9', value: 'real-ner9' },
    // TODO: Telegram is not in the CVs; add the handle when the owner sends it.
    // { label: 'Telegram', href: 'https://t.me/...', value: '@...' },
  ],
}

export const profile: Record<Locale, Profile> = {
  ru: {
    ...base,
    fullName: 'Савва Кашин',
    summary:
      '8 лет делаю веб-продукты от базы до интерфейса: Node.js, Python, PHP и C# на бэке, React, Vue и TypeScript на фронте. Был тимлидом и архитектором, специализируюсь на миграциях легаси без даунтайма.',
    location: 'Бангкок, Таиланд',
    contacts: base.contacts('Телефон'),
  },
  en: {
    ...base,
    fullName: 'Savva Kashin',
    summary:
      '8 years building web products from the database to the interface: Node.js, Python, PHP and C# on the backend, React, Vue and TypeScript on the frontend. Former team lead and architect; I specialize in zero-downtime legacy migrations.',
    location: 'Bangkok, Thailand',
    contacts: base.contacts('Phone'),
  },
}
