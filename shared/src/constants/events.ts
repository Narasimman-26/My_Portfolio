export const SOCKET_EVENTS = {
  // Client to Server
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  MESSAGE_SEND: 'message:send',
  MESSAGE_ACK: 'message:ack',
  TYPING_STATE: 'typing:state',
  PRESENCE_PING: 'presence:ping',

  // Server to Client
  MESSAGE_RECEIVE: 'message:receive',
  MESSAGE_RECEIPT: 'message:receipt',
  TYPING_UPDATE: 'typing:update',
  USER_STATUS: 'user:status',
  ERROR_SOCKET: 'error:socket',
} as const;
