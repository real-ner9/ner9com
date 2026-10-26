export interface ReviewImage {
  id: string
  width: number
  height: number
  /** Up to 1600 px, webp. */
  url: string
  /** Up to 480 px, for grids. */
  thumbUrl: string
}

/** Who posted: signed in with Telegram (name, @username, avatar) or anonymous. */
export interface ReviewAuthor {
  telegram: boolean
  username: string | null
  photoUrl: string | null
  /** Posted by the visitor looking at the page: they may delete it. */
  mine: boolean
}

export interface ReviewReply {
  id: number
  name: string
  text: string
  /** Written by the site's owner (signed in with their Telegram). */
  isOwner: boolean
  author: ReviewAuthor
  createdAt: string
  images: ReviewImage[]
}

export interface Review {
  id: number
  name: string
  text: string
  /** 1–5 Chief Keefs. */
  rating: number
  isOwner: boolean
  author: ReviewAuthor
  createdAt: string
  images: ReviewImage[]
  replies: ReviewReply[]
  likes: number
  dislikes: number
  /** This visitor's vote: 1 like, -1 dislike, 0 none. */
  myVote: number
}

export interface ReviewList {
  reviews: Review[]
  /** Null while there are no reviews. */
  average: number | null
  count: number
  /** False when the server has no S3: image upload is hidden. */
  uploads: boolean
  /** Signed in as the site's owner: delete buttons everywhere. */
  owner: boolean
}

export interface NewReply {
  /** Ignored when signed in: the Telegram name is used. */
  name?: string
  text: string
  imageIds: string[]
}

/** Which of the owner's projects a comment is about: `ShowcaseProject.id`. */
export type ReviewProject = string

export interface NewReview extends NewReply {
  project: ReviewProject
  rating: number
}
