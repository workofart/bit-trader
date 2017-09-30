const server = require('http').createServer();
const io = require('socket.io')

const socket = io(server, {
    'pingInterval': 1000,
    'pingTimeout': 5000
})
server.listen(1337)

// const WebSocket = require('ws');
const util = require('util')

/**************** WebSocket Server *****************/
var sockets = new Object();
/***************************************************/

util.log('Websocket server stared at port 1337')
socket.on('connect', (client) => {
    util.log(`New client [${client.id} connected`)
    client.on('message', (data) => {
        util.log(`Message: ${data}`)
        sockets[JSON.parse(data).to].send(data);
    })
    client.on('disconnect' , (reason) => {
        util.log(`Websocket server disconnected from client: ${reason}`)
    })

    sockets[client.id] = client;

    if (Object.keys(sockets).length === 2) {
        var id1= {};
        var id2 = {};
        id1.id = Object.keys(sockets)[0];
        id2.id = Object.keys(sockets)[1];

        sockets[Object.keys(sockets)[0]].send(JSON.stringify(id2))
        sockets[Object.keys(sockets)[1]].send(JSON.stringify(id1))
    }

})
