const WebSocket = require('ws');
const util = require('util')

/**************** WebSocket Server *****************/
var connection;
var sockets = new Object();
/***************************************************/

startWS_LOCAL();

function startWS_LOCAL() {
  connection = new WebSocket.Server({port: 1337});
  connection.on('open', () =>{
    util.log('WebSocket server started, listening at port [1337]')
  })

  connection.on('connection', function(w, req) {
      
      var id = req.headers['sec-websocket-key'];
      console.log('New Connection id :: ', id);
      // w.send(JSON.stringify(id));

      w.on('message', function(msg){
        // console.log(msg)

          var id = req.headers['sec-websocket-key'];
          var message = JSON.parse(msg);
          sockets[message.to].send(JSON.stringify(message.message));
    
        // console.log('Message on :: ', id);
        // console.log('On message :: ', msg);
      });
      
      w.on('close', function() {
        var id = req.headers['sec-websocket-key'];
        console.log('Closing :: ', id);
      });
    
      sockets[id] = w;
      // console.log(Object.keys(sockets))
      if (Object.keys(sockets).length === 2) {
          var id1= {};
          var id2 = {};
          id1.id = Object.keys(sockets)[0];
          id2.id = Object.keys(sockets)[1];

          sockets[Object.keys(sockets)[0]].send(JSON.stringify(id2))
          sockets[Object.keys(sockets)[1]].send(JSON.stringify(id1))
      }
  })
  connection.on('close', () => {
    util.log('Identified [SocketServer] connection closed, reopening')
    startWS_LOCAL()
  })
}


exports.connection = connection;