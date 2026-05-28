const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

const onlineAnalysts = new Map()

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)

  socket.on('register-analyst', (analystInfo) => {
    onlineAnalysts.set(socket.id, {
      socketId: socket.id,
      ...analystInfo,
    })
    console.log('Online analysts:', Array.from(onlineAnalysts.values()))
  })
    
  socket.on('disconnect', () => {
    onlineAnalysts.delete(socket.id)
    console.log(`User disconnected: ${socket.id}`)
    console.log('Online analysts:', Array.from(onlineAnalysts.values()))
  })
})

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})