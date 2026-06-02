import webpush from 'web-push'

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string }
) {
  webpush.setVapidDetails(
    'mailto:contact@isaly.fr',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return true
  } catch (err) {
    console.error('Push error:', err)
    return false
  }
}

export { webpush }
