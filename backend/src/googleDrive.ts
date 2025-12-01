import { google } from 'googleapis'
import { resolve } from 'node:path'

const serviceAccountKeyPath = resolve(process.cwd(), 'config/google-sa.json')

const auth = new google.auth.GoogleAuth({
  keyFile: serviceAccountKeyPath,
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
})

export const drive = google.drive({
  version: 'v3',
  auth
})

