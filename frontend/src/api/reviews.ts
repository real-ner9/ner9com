import { apiGet, apiSend, apiUrl } from '@/api/http'
import type {
  NewReply,
  NewReview,
  ReviewAuthor,
  ReviewImage,
  ReviewList,
  ReviewProject,
} from '@/types/review'

const withImageUrls = (image: ReviewImage): ReviewImage => ({
  ...image,
  url: apiUrl(image.url),
  thumbUrl: apiUrl(image.thumbUrl),
})

// Avatars of Telegram sign-ins are stored by the backend (`/media/...`).
const withPhoto = (author: ReviewAuthor): ReviewAuthor => ({
  ...author,
  photoUrl: author.photoUrl && apiUrl(author.photoUrl),
})

export type ReviewSort = 'top' | 'new'

export async function fetchReviews(
  project: ReviewProject,
  sort: ReviewSort = 'top',
): Promise<ReviewList> {
  const list = await apiGet<ReviewList>(`/reviews?project=${project}&sort=${sort}`)
  return {
    ...list,
    reviews: list.reviews.map((review) => ({
      ...review,
      author: withPhoto(review.author),
      images: review.images.map(withImageUrls),
      replies: review.replies.map((reply) => ({
        ...reply,
        author: withPhoto(reply.author),
        images: reply.images.map(withImageUrls),
      })),
    })),
  }
}

export async function uploadImage(file: File): Promise<ReviewImage> {
  const form = new FormData()
  form.append('file', file)
  const { image } = await apiSend<{ image: ReviewImage }>('POST', '/reviews/images', form)
  return withImageUrls(image)
}

/** An SQL injection attempt never resolves: the backend bans the IP and http.ts redirects. */
export const postReview = (review: NewReview) =>
  apiSend<{ id: number }>('POST', '/reviews', review)

export const postReply = (reviewId: number, reply: NewReply) =>
  apiSend<{ id: number }>('POST', `/reviews/${reviewId}/replies`, reply)

export const vote = (reviewId: number, value: -1 | 0 | 1) =>
  apiSend<{ likes: number; dislikes: number; myVote: number }>(
    'POST',
    `/reviews/${reviewId}/vote`,
    { value },
  )

export const likeProject = (project: ReviewProject, liked: boolean) =>
  apiSend<{ likes: number; liked: boolean }>('POST', '/reviews/likes', { project, liked })

export const deleteReview = (reviewId: number) =>
  apiSend<void>('DELETE', `/reviews/${reviewId}`)

export const deleteReply = (replyId: number) =>
  apiSend<void>('DELETE', `/reviews/replies/${replyId}`)
