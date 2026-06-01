import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import type { AnalystInfo, ConsultRequest } from '../shared/types'
import { randomUUID } from 'crypto'

type OnlineAnalyst = AnalystInfo & {
  socketId: string;
}



const consultRequests = new Map<string, ConsultRequest>()

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

const onlineAnalysts: OnlineAnalyst[][] = [[], [], [], [], []]

function getPriorityTier(priority: number) {
  return priority >= 0 && priority <= 4 ? priority : 2
}

function removeAnalyst(socketId: string) {
  for (const priorityTier of onlineAnalysts) {
    const analystIndex = priorityTier.findIndex((analyst) => analyst.socketId === socketId)

    if (analystIndex !== -1) {
      return priorityTier.splice(analystIndex, 1)[0]
    }
  }

  return null
}

function addAnalyst(analyst: OnlineAnalyst) {
  const priorityTier = getPriorityTier(analyst.priority)

  onlineAnalysts[priorityTier].push({
    ...analyst,
    priority: priorityTier,
  })
}

// Consult Ping Functions

function selectNextAnalyst(request: ConsultRequest) {
  for (const tier of onlineAnalysts){
    const available = tier.filter((analyst) => {
      return analyst.socketId !== request.requesterSocketId && !request.attemptedSocketIds.has(analyst.socketId)
    })
      if(available.length > 0) {
        const index = Math.floor(Math.random() * available.length)
        return available[index]
      }
  }
  return null
}

function offerConsultRequest(request: ConsultRequest){
  const selected = selectNextAnalyst(request)

  if(!selected){
    io.to(request.requesterSocketId).emit('consult-request-status', {status: 'no-available'})
    consultRequests.delete(request.id)
    return
  }

  request.currentCandidateSocketId = selected.socketId
  request.attemptedSocketIds.add(selected.socketId)

  io.to(selected.socketId).emit('consult-requested', {
    requestId: request.id,
    requesterName: request.requesterName,
    requesterLocX: request.requesterLocX,
    requesterLocY: request.requesterLocY,
    topic:request.topic
  })

  request.timeout = setTimeout(() => {
    io.to(selected.socketId).emit('consult-request-expired', {
      requestId: request.id
    }) 
    offerConsultRequest(request)

  }, 2000)
}



io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)

  socket.on('register-analyst', (analystInfo: AnalystInfo) => {
    removeAnalyst(socket.id)
    addAnalyst({
      socketId: socket.id,
      ...analystInfo,
    })
    console.log('Online analysts:', onlineAnalysts)
  })

  socket.on('update-analyst-priority', ({ handle, priority }) => {
    const analyst = removeAnalyst(socket.id)

    if (analyst) {
      addAnalyst({
        ...analyst,
        handle,
        priority,
      })
    }

    console.log('Online analysts:', onlineAnalysts)
  })
    
  socket.on('disconnect', () => {
    removeAnalyst(socket.id)
    console.log(`User disconnected: ${socket.id}`)
    console.log('Online analysts:', onlineAnalysts)
  })

  socket.on('request-consult', ({requesterName, requesterLocX, requesterLocY, topic}) => {
    //When the client calls a consult request, create the consult object and begin searching for the consult giver.
    const request = {
      id: randomUUID(),
      requesterSocketId: socket.id,
      requesterName,
      requesterLocX,
      requesterLocY,
      topic,
      attemptedSocketIds: new Set<string>(),
      currentCandidateSocketId: null,
      timeout: null
    }
    consultRequests.set(request.id, request)
    offerConsultRequest(request)
  })

  socket.on('respond-to-consult-request', ({requestId, accepted}) => {
    const request = consultRequests.get(requestId)

    if(!request || request.currentCandidateSocketId !== socket.id){
      return
    }
    if (request.timeout){
      clearTimeout(request.timeout)
      request.timeout = null
    }
    if(!accepted){
      offerConsultRequest(request)
      return
    }
    io.to(request.requesterSocketId).emit('consult-request-status', {
      status: 'accepted'
    })
  })

})

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
