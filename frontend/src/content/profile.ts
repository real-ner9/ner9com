import type { Locale } from '@/i18n'
import type { Profile } from '@/types/content'

// Language-independent part; the per-language fields are filled in at the bottom. All copy comes
// from the owner's LinkedIn profile (headline and About); the phone, the channel and Instagram were
// given by the owner.
const base = {
  name: 'NER9',
  role: 'AI-First Senior Fullstack Engineer',
  // The LinkedIn headline's stack.
  stack: [
    'React',
    'Vue 3',
    'TypeScript',
    'Node.js',
    'NestJS',
    'Python',
    'FastAPI',
    'AI Agents',
    'RAG',
    'MCP',
    'Claude Code',
    'PostgreSQL',
    'Kafka',
    'Redis',
    'Docker',
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
      href: 'https://www.linkedin.com/in/savva-ai-fullstack/',
      value: 'in/savva-ai-fullstack',
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
      'AI-First Senior Full-Stack инженер, 7+ лет делаю веб-продукты целиком в LegalTech, iGaming, FinTech и платформах для разработчиков. Работал в EPAM над open-source продуктами и вырос до тимлида full-stack команды в продуктовых командах.',
    location: 'Бангкок, Таиланд',
    contacts: base.contacts({ phone: 'Телефон', channel: 'Telegram-канал' }),
  },
  uk: {
    ...base,
    fullName: 'Савва Кашин',
    summary:
      'AI-First Senior Full-Stack інженер, 7+ років роблю вебпродукти повністю в LegalTech, iGaming, FinTech і платформах для розробників. Працював в EPAM над open-source продуктами і виріс до тімліда full-stack команди в продуктових командах.',
    location: 'Бангкок, Таїланд',
    contacts: base.contacts({ phone: 'Телефон', channel: 'Telegram-канал' }),
  },
  en: {
    ...base,
    fullName: 'Savva Kashin',
    summary:
      'AI-First Senior Full-Stack Engineer with 7+ years of experience building web products end to end across LegalTech, iGaming, FinTech and developer platforms. Worked at EPAM on open-source products and grew to full-stack team lead in product teams.',
    location: 'Bangkok, Thailand',
    contacts: base.contacts({ phone: 'Phone', channel: 'Telegram channel' }),
  },
}
