import io from 'socket.io-client'
const controller = require('../socketControllers/controller')

const socket = io('')
let store

var joined = false
var myId = ''

export function initiateSocket (storeObj) {
  store = storeObj
  socket.connect()
}

socket.on('connect', () => {
  console.log('Setting Socket Status to true')
})

socket.on('disconnect', () => {
  console.log('Disconnect called')
})

socket.on('message', (data) => {
  // Emitted event
  console.log(data)
  // This is socket controller on client side to easily dispatch notification to redux
  controller.init(data)
})

export function log (tag, data) {
  console.log(`${tag}: ${data}`)
  socket.emit('logClient', {
    tag,
    data
  })
}

export function storeDispatcher () {
  return store.dispatch
}
