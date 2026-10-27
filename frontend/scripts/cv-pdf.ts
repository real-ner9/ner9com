/**
 * Prints the resume from `src/content` (the LinkedIn profile) to PDF in the owner's CV layout (one column, Inter, bold
 * numbers): public/downloads/Savva_Kashin_CV.pdf, Kashin_Savva_CV_RU.pdf and Kashin_Savva_CV_UA.pdf,
 * the files behind the "Download PDF" button on /cv (not public/cv, which nginx would serve
 * instead of the page).
 * Run `npm run cv` after editing the resume or profile and commit the PDFs. Uses the Chromium
 * that Playwright keeps in its browser cache.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import type { Locale } from '@/i18n'
import { profile } from '@/content/profile'
import { resumeEn } from '@/content/resume.en'
import { resumeRu } from '@/content/resume.ru'
import { resumeUk } from '@/content/resume.uk'
import type { Resume } from '@/types/content'

const root = resolve(import.meta.dirname, '..')
const fonts = join(root, 'node_modules/@fontsource-variable/inter/files')

const CV_FILES: Record<Locale, string> = {
  en: 'Savva_Kashin_CV.pdf',
  ru: 'Kashin_Savva_CV_RU.pdf',
  uk: 'Kashin_Savva_CV_UA.pdf',
}

// The CVs' own headline and section names (the site's role line is shorter).
const LABELS = {
  en: {
    headline:
      'AI-First Senior Fullstack Engineer · React / Vue 3 / TypeScript · Node.js / NestJS · Python / FastAPI',
    summary: 'Summary',
    skills: 'Skills',
    experience: 'Experience',
    education: 'Education & languages',
  },
  ru: {
    headline:
      'AI-First Senior Fullstack-разработчик · React / Vue 3 / TypeScript · Node.js / NestJS · Python / FastAPI',
    summary: 'О себе',
    skills: 'Навыки',
    experience: 'Опыт работы',
    education: 'Образование и языки',
  },
  uk: {
    headline:
      'AI-First Senior Fullstack-розробник · React / Vue 3 / TypeScript · Node.js / NestJS · Python / FastAPI',
    summary: 'Про себе',
    skills: 'Навички',
    experience: 'Досвід роботи',
    education: 'Освіта та мови',
  },
}

// Bold in the summary, as in the CVs.
const SUMMARY_BOLD = ['AI-First', '7+', 'LegalTech', 'iGaming', 'FinTech', 'EPAM']

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const boldTerms = (html: string) =>
  html.replace(
    new RegExp(`(?<![\\p{L}#.])(${SUMMARY_BOLD.map(escapeRegExp).join('|')})(?![\\p{L}#])`, 'gu'),
    '<b>$1</b>',
  )

// Figures in the bullet points ("~8.5x", "2–4", "&lt;300 ms", "1–3k"), not names like C4 or p75.
const UNITS = 'x|%|\\+|ms|s|MB|KB|min|k|мс|с|МБ|КБ|минут|тыс\\.|тис\\.'
const boldFigures = (html: string) =>
  html.replace(
    new RegExp(
      `(?<![\\p{L}\\d])((?:~|&lt;|−)?\\d[\\d.,]*(?:[–-]\\d[\\d.,]*)?(?:\\s?(?:${UNITS}))?)(?![\\p{L}\\d])`,
      'gu',
    ),
    '<b>$1</b>',
  )

const link = (href: string, text: string) => `<a href="${escape(href)}">${escape(text)}</a>`

function render(locale: Locale, resume: Resume) {
  const me = profile[locale]
  const labels = LABELS[locale]
  const contact = (label: string) => me.contacts.find((c) => c.label === label)
  // The CVs list location, phone and email in grey, then the links.
  const phone = me.contacts.find((c) => c.href.startsWith('tel:'))
  const plain = [me.location, phone?.value, contact('Email')?.value].filter(Boolean)
  const links = ['LinkedIn', 'GitHub', 'Telegram']
    .map(contact)
    .filter((c) => c !== undefined)
    .map((c) => link(c.href, c.href.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')))

  const experience = resume.experience
    .map((job) => {
      const head = job.roles
        ? `<b>${escape(job.organization)}</b>`
        : `<b>${escape(job.organization)}</b> · ${escape(job.title)}`
      const roles = (job.roles ?? [])
        .map(
          (role) =>
            `<div class="row role"><span>${escape(role.title)}</span><span class="date">${escape(role.period)}</span></div>`,
        )
        .join('')
      return `
        <div class="job">
          <div class="row"><span>${head}${job.context ? ` <span class="muted">· ${escape(job.context)}</span>` : ''}</span><span class="date">${escape(job.period)}</span></div>
          ${roles}
          ${job.about ? `<p class="about">${escape(job.about).replace(/\n/g, '<br>')}</p>` : ''}
          <ul>${job.points.map((point) => `<li>${boldFigures(escape(point))}</li>`).join('')}</ul>
          ${job.stack ? `<div class="stack">${job.stack.map(escape).join(' · ')}</div>` : ''}
        </div>`
    })
    .join('')

  const education = [
    ...resume.education.map((e) => [e.title, e.organization, e.period].join(', ')),
    ...resume.languages,
  ]

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: Inter;
    font-weight: 100 900;
    src: url('${pathToFileURL(join(fonts, 'inter-latin-wght-normal.woff2'))}') format('woff2');
  }
  @font-face {
    font-family: Inter;
    font-weight: 100 900;
    src: url('${pathToFileURL(join(fonts, 'inter-cyrillic-wght-normal.woff2'))}') format('woff2');
    unicode-range: U+0400-04FF;
  }
  @page { size: A4; margin: 11mm 13mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 9.3pt/1.32 Inter, sans-serif; color: #111; }
  a { color: inherit; text-decoration: none; }
  h1 { font-size: 21pt; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
  .headline { font-size: 10.5pt; color: #444; margin-top: 2px; }
  .contacts { font-size: 8.6pt; color: #888; margin-top: 2px; }
  .contacts a { color: #333; }
  h2 {
    margin: 9px 0 4px; padding-bottom: 2px; border-bottom: 1px solid #ddd;
    font-size: 7.6pt; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #888;
  }
  header + h2 { margin-top: 7px; border-top: 1px solid #ddd; padding-top: 7px; }
  .skills b { font-weight: 700; }
  .job { margin-top: 5px; }
  .row, li { break-inside: avoid; }
  .row { break-after: avoid; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .role { font-weight: 600; }
  .date { color: #888; white-space: nowrap; }
  .muted { color: #888; }
  .about { color: #444; margin: 1px 0 2px; }
  ul { list-style: none; }
  li { position: relative; padding-left: 9px; }
  li::before { content: '•'; position: absolute; left: 0; }
  .stack { font-size: 8.3pt; color: #888; }
</style>
</head>
<body>
  <header>
    <h1>${escape(me.fullName)}</h1>
    <div class="headline">${escape(labels.headline)}</div>
    <div class="contacts">${plain.map((v) => escape(v!)).join(' · ')} · ${links.join(' · ')}</div>
  </header>
  <h2>${labels.summary}</h2>
  <p>${boldTerms(escape(resume.summary))}</p>
  <h2>${labels.skills}</h2>
  <div class="skills">${resume.skills.map((g) => `<div><b>${escape(g.name)}:</b> ${g.items.map(escape).join(', ')}</div>`).join('')}</div>
  <h2>${labels.experience}</h2>
  ${experience}
  <h2>${labels.education}</h2>
  <p>${education.map(escape).join(' · ')}</p>
</body>
</html>`
}

const out = join(root, 'public/downloads')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const [locale, resume] of [
    ['en', resumeEn],
    ['ru', resumeRu],
    ['uk', resumeUk],
  ] as const) {
    const html = join(tmpdir(), `ner9-cv-${locale}.html`)
    writeFileSync(html, render(locale, resume))
    await page.goto(pathToFileURL(html).href)
    await page.evaluate(() => document.fonts.ready)
    const file = join(out, CV_FILES[locale])
    await page.pdf({ path: file, format: 'A4', preferCSSPageSize: true, printBackground: true })
    console.log(`wrote ${file}`)
  }
} finally {
  await browser.close()
}
