//#region
/************************************************/
// STARTWS_UI()

// function STARTWS_UI() {
//     connection_to_client.on('open', () => {
//         console.log('Server [bot] started, connected to WebSocket 127.0.0.1:1338')
//     })
//     connection_to_client.setMaxListeners(15)

//     connection_to_client.on('connection', function(w, req) {
//         clientWS = w;
//         isClientDead = false;
//     })
//     connection_to_client.on('close', () => {
//         isClientDead = true;
//         console.log('Server [bot] to UI connection closed, reopening')
//     })
// }
//#endregion
