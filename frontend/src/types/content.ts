/** Shapes of the hand-written site content in `src/content`. Projects come from GitHub instead. */

export interface ContactLink {
  label: string
  href: string
  /** Shown next to the label on the resume, e.g. the phone number itself. */
  value?: string
}

export interface Profile {
  /** Nickname used as the site logo. */
  name: string
  fullName: string
  role: string
  /** One or two sentences for the home page hero. */
  summary: string
  location?: string
  /** Technologies scrolling across the home page. */
  stack: string[]
  contacts: ContactLink[]
  /** Track that starts when the site opens; matched by album folder name and track title. */
  introTrack?: IntroTrack
}

export interface IntroTrack {
  /** Part of the album folder name. */
  album: string
  title: string
  /** Second to start from, e.g. where the beat drops. */
  startAt: number
}

/** First and last month of a job, "YYYY-MM", both included. */
export interface MonthRange {
  from: string
  to: string
}

export interface ResumeEntry {
  title: string
  organization: string
  /** What the company does and where, e.g. "CRM-платформа · Москва". */
  context?: string
  /** Free-form period, e.g. "2023 — сейчас". */
  period: string
  /** Exact months, for the duration next to the period and the total experience. */
  dates?: MonthRange
  /** Positions held inside one company, newest first. */
  roles?: { title: string; period: string; dates?: MonthRange }[]
  points: string[]
  stack?: string[]
}

export interface SkillGroup {
  name: string
  items: string[]
}

export interface Resume {
  /** A few sentences at the top of the resume page. */
  summary: string
  experience: ResumeEntry[]
  education: ResumeEntry[]
  skills: SkillGroup[]
  languages: string[]
}

/** A hand-picked project shown above everything else (unlike the GitHub list, written by hand). */
export interface ShowcaseProject {
  name: string
  /** One line under the name. */
  tagline: string
  description: string
  url: string
  /** Button text for `url`. */
  linkLabel: string
  promoCode?: string
  stack: string[]
  status: string
}
