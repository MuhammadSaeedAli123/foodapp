import { api } from './client'

export const reviewsApi = {
  getByRestaurant:     (restaurantId)       => api.get(`/reviews/restaurant/${restaurantId}`),
  getMyReview:         (orderId)            => api.get(`/reviews/my-review/${orderId}`),
  getMyReviewedOrders: ()                   => api.get('/reviews/my-reviewed-orders'),
  create:              (data)               => api.post('/reviews', data),
  reply:               (reviewId, replyText) => api.post(`/reviews/${reviewId}/reply`, { reply: replyText }),
}
