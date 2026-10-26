/**
 * The owner's projects that take reviews: the ids of frontend/src/content/projects.ts. Add a
 * project there and here together.
 */
export const REVIEW_PROJECTS = ['kleshnya', 'cadry', 'tghound'] as const
export type ReviewProject = (typeof REVIEW_PROJECTS)[number]
