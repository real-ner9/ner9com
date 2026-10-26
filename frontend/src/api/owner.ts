import { apiGet } from '@/api/http'

/** The owner's deployed projects (backend services/ownerProjects.ts), served only to the owner. */
export interface OwnerProjectLink {
  label: string
  url: string
}

export interface OwnerProject {
  name: string
  summary: string
  status: 'live' | 'dev'
  deploy: string
  links: OwnerProjectLink[]
}

/** Throws ApiError 404 for anyone but the signed-in owner. */
export const fetchOwnerProjects = () =>
  apiGet<{ projects: OwnerProject[] }>('/owner/projects').then((data) => data.projects)
