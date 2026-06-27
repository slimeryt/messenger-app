const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

exports.onMessageCreated = onDocumentCreated('chats/{chatId}/messages/{messageId}', async (event) => {
  const message = event.data?.data()
  if (!message?.senderId) return

  const chatId = event.params.chatId
  const db = getFirestore()
  const chatSnap = await db.doc(`chats/${chatId}`).get()
  if (!chatSnap.exists) return

  const chat = chatSnap.data()
  const recipients = (chat.memberIds || []).filter((id) => id !== message.senderId)
  if (recipients.length === 0) return

  const senderSnap = await db.doc(`users/${message.senderId}`).get()
  const senderName = senderSnap.exists ? (senderSnap.data().username || 'Someone') : 'Someone'

  let body = message.content || ''
  if (!body && message.type && message.type !== 'text') body = `[${message.type}]`
  if (!body) body = 'New message'

  const tokens = new Set()
  for (const uid of recipients) {
    const userSnap = await db.doc(`users/${uid}`).get()
    if (!userSnap.exists) continue
    const data = userSnap.data()
    for (const t of data.fcmTokens || []) {
      if (t) tokens.add(t)
    }
    if (data.fcmToken) tokens.add(data.fcmToken)
  }

  if (tokens.size === 0) return

  const preview = body.slice(0, 240)

  await getMessaging().sendEachForMulticast({
    tokens: [...tokens],
    notification: {
      title: senderName,
      body: preview,
    },
    data: {
      chatId,
      type: 'message',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'messages',
      },
    },
  })

  await db.doc(`chats/${chatId}`).update({
    lastMessageSenderId: message.senderId,
  }).catch(() => {})
})
