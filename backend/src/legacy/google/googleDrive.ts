import { google } from 'googleapis'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env
const ENV_REFRESH_TOKEN = process.env.REFRESH_TOKEN

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  throw new Error('Missing OAuth2 env vars: CLIENT_ID, CLIENT_SECRET, REDIRECT_URI')
}

const tokenStorePath = resolve(process.cwd(), 'config/google-oauth.json')

function readStoredRefreshToken(): string | undefined {
  if (!existsSync(tokenStorePath)) return undefined
  try {
    const raw = readFileSync(tokenStorePath, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed.refresh_token as string | undefined
  } catch {
    return undefined
  }
}

function persistRefreshToken(token: string) {
  try {
    const dir = resolve(process.cwd(), 'config')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(tokenStorePath, JSON.stringify({ refresh_token: token }, null, 2), 'utf8')
  } catch (error) {
    console.warn('Failed to persist refresh token', error)
  }
}

const initialRefreshToken = readStoredRefreshToken() ?? ENV_REFRESH_TOKEN

if (!initialRefreshToken) {
  throw new Error('No refresh token available. Run OAuth flow to obtain one.')
}

export const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

oAuth2Client.setCredentials({
  refresh_token: initialRefreshToken
})

export function setRefreshToken(token: string) {
  if (!token) return
  oAuth2Client.setCredentials({ refresh_token: token })
  persistRefreshToken(token)
}

export async function getAccessToken(): Promise<string> {
  const tokenRes = await oAuth2Client.getAccessToken()
  const token = tokenRes?.token
  if (!token) throw new Error('Could not obtain access token')
  return token
}

export const drive = google.drive({
  version: 'v3',
  auth: oAuth2Client
})
