// Keeping this file just for the demonstration purposes
// Modify it according to your socket notification type
import * as ChatActions from './../redux/actions/chat.actions'
import { storeDispatcher } from './../utility/socketio'

export const handleNewMessage = (payload) => {
  if (payload.type === 'text') { handleTextMessage(payload) }
  if (payload.type === 'image') { handleImageMessage(payload) }
  if (payload.type === 'location') { handleLocationMessage(payload) }
  if (payload.type === 'audio') { handleAudioMessage(payload) }
  if (payload.type === 'video') { handleVideoMessage(payload) }
  if (payload.type === 'document') { handleDocumentMessage(payload) }
  if (payload.type === 'voice') { handleVoiceMessage(payload) }
}

const handleTextMessage = (payload) => {
  console.log('New Text Message Received', payload)
  ChatActions.addNewTextMessage(storeDispatcher(), payload)
}

const handleImageMessage = (payload) => {
  console.log('New Image Message Received', payload)
  ChatActions.addNewImageMessage(storeDispatcher(), payload)
}

const handleLocationMessage = (payload) => {
  console.log('New Location Message Received', payload)
  ChatActions.addNewLocationMessage(storeDispatcher(), payload)
}

const handleAudioMessage = (payload) => {
  console.log('New Audio Message Received', payload)
  ChatActions.addNewAudioMessage(storeDispatcher(), payload)
}

const handleVideoMessage = (payload) => {
  console.log('New Video Message Received', payload)
  ChatActions.addNewVideoMessage(storeDispatcher(), payload)
}

const handleDocumentMessage = (payload) => {
  console.log('New Document Message Received', payload)
  ChatActions.addNewDocumentMessage(storeDispatcher(), payload)
}

const handleVoiceMessage = (payload) => {
  console.log('New Voice Message Received', payload)
  ChatActions.addNewVoiceMessage(storeDispatcher(), payload)
}
