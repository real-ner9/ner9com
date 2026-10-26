/**
 * Everything the owner has deployed, with its addresses: a cheat sheet behind the owner's
 * sign-in (routes/owner), so the admin URLs never reach the public bundle. All of it runs on the
 * one VPS (Dokploy). Edit by hand when a project moves or a new one goes up.
 */
export interface OwnerProjectLink {
  label: string
  url: string
}

export interface OwnerProject {
  name: string
  summary: string
  /** live: in production · dev: deployed, still in development · legacy: kept running, not worked on. */
  status: 'live' | 'dev' | 'legacy'
  /** How a change gets there. */
  deploy: string
  links: OwnerProjectLink[]
}

const repo = (name: string): OwnerProjectLink => ({
  label: 'GitHub',
  url: `https://github.com/real-ner9/${name}`
})

export const OWNER_PROJECTS: OwnerProject[] = [
  {
    name: 'Клешня (Claw)',
    summary: 'Настоящий автомат с клешнёй в Telegram: мини-приложение, бот, админка, камера.',
    status: 'live',
    deploy: 'Пуш в dev → dev-окружение, в main → прод (CI → деплой-шлюз)',
    links: [
      { label: 'Мини-приложение', url: 'https://app.claw-star.com' },
      { label: 'Бот', url: 'https://t.me/kleshnya_official_bot' },
      { label: 'Админка', url: 'https://admin.claw-star.com' },
      { label: 'Лендинг', url: 'https://claw-star.com' },
      { label: 'Dev', url: 'https://dev.claw-star.com' },
      { label: 'Dev-бот', url: 'https://t.me/kleshnya_dev_bot' },
      { label: 'Dev-админка', url: 'https://admin-dev.claw-star.com' },
      repo('Claw')
    ]
  },
  {
    name: 'ner9.com',
    summary: 'Этот сайт: портфолио, резюме, iPod-плеер, комментарии к проектам.',
    status: 'live',
    deploy: 'Пуш в main → прод (CI → деплой-шлюз)',
    links: [{ label: 'Сайт', url: 'https://ner9.com' }, repo('ner9com')]
  },
  {
    name: 'TG Hound',
    summary: 'Поиск клиентов в Telegram-чатах по ключевым словам с AI-фильтром.',
    status: 'dev',
    deploy: 'Пуш в main → прод (CI → деплой-шлюз)',
    links: [
      { label: 'Сайт', url: 'https://tg-hound.com' },
      { label: 'Бот', url: 'https://t.me/tghound_bot' },
      repo('tg-hound')
    ]
  },
  {
    name: 'Cadry Mini App',
    summary: 'Найм в Telegram: видеокружок и резюме, AI-поиск кандидатов, вакансии.',
    status: 'dev',
    deploy: 'Пуш в main → прод (CI → деплой-шлюз)',
    links: [
      { label: 'Мини-приложение', url: 'https://cadry.ner9.com' },
      { label: 'Бот', url: 'https://t.me/cadry_official_bot' },
      repo('cadry-miniapp')
    ]
  },
  {
    name: 'QuizLab (jquiz)',
    summary: 'Квизы. Деплой по старой схеме: CI заходит на сервер и собирает там.',
    status: 'legacy',
    deploy: 'Пуш в main → сборка на сервере',
    links: [{ label: 'Сайт', url: 'https://jquiz-207-180-218-99.sslip.io' }, repo('jquiz')]
  },
  {
    name: 'Cadry (старый)',
    summary: 'Прежняя веб-версия Cadry до мини-приложения. Автодеплой сломан.',
    status: 'legacy',
    deploy: 'Вручную',
    links: [
      { label: 'Сайт', url: 'https://cadry-207-180-218-99.sslip.io' },
      { label: 'Dev', url: 'https://dev-cadry-207-180-218-99.sslip.io' },
      repo('Cadry')
    ]
  },
  {
    name: 'AIDoll',
    summary: 'Платформа знакомств.',
    status: 'legacy',
    deploy: 'Вручную',
    links: [{ label: 'Сайт', url: 'https://aidoll-207-180-218-99.sslip.io' }, repo('AIDoll')]
  },
  {
    name: 'Shop',
    summary: 'Интернет-магазин на React.',
    status: 'legacy',
    deploy: 'Вручную',
    links: [
      { label: 'Сайт', url: 'https://shop-207-180-218-99.sslip.io' },
      repo('React-ecommerce-platform')
    ]
  },
  {
    name: 'Сервер',
    summary: 'VPS Contabo 207.180.218.99: все проекты выше крутятся в Dokploy.',
    status: 'live',
    deploy: '—',
    links: [{ label: 'Панель Dokploy', url: 'https://panel.ner9.com' }]
  }
]
