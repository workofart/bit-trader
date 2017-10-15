const args = [ 'SocketServer.js', 'public.js', 'bot.js' ];
const cwds = ['websockets', 'websockets', 'algo'];
const stdios = ['inherit', 'inherit', 'pipe']
const logStream = [ 'SocketServer', 'public', 'bot' ];

const moment = require('moment');
const child = require('child_process');
const fs = require('fs');

const currentTime = moment().local().format('YYYY-MM-DD_HHmmss').toString();

/*******************************************/
var logfile = `./logs/SocketServer_${currentTime}.log`;
console.log(logfile)
var openFileStream_socket = fs.createWriteStream(logfile, {flags: 'a'});
openFileStream_socket.on('open', () => {
    var process = child.spawn('node', ['SocketServer.js'], {cwd: 'websockets', shell: true});
    process.stdout.pipe(openFileStream_socket)
    process.stderr.pipe(openFileStream_socket)
})

openFileStream_socket.on('error', (err)=> {
    console.log(err)
})
/*******************************************/

/*******************************************/
var logfile = `./logs/public_${currentTime}.log`;
console.log(logfile)
var openFileStream_public = fs.createWriteStream(logfile, {flags: 'a'});
openFileStream_public.on('open', () => {
    var process = child.spawn('node', ['public.js'], {cwd: 'websockets', shell: true});
    process.stdout.pipe(openFileStream_public)
    process.stderr.pipe(openFileStream_public)
})

openFileStream_public.on('error', (err)=> {
    console.log(err)
})
/*******************************************/


/*******************************************/
var logfile = `./logs/bot_${currentTime}.log`;
console.log(logfile)
var openFileStream_bot = fs.createWriteStream(logfile, {flags: 'a'});
openFileStream_bot.on('open', () => {
    var process = child.spawn('node', ['bot.js'], {cwd: 'algo', shell: true});
    process.stdout.pipe(openFileStream_bot)
    process.stderr.pipe(openFileStream_bot)
})

openFileStream_bot.on('error', (err)=> {
    console.log(err)
})
/*******************************************/