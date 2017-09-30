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
var openFileStream = fs.createWriteStream(logfile, {flags: 'a'});
openFileStream.on('open', () => {
    var process = child.spawn('node', ['SocketServer.js'], {cwd: 'websockets', shell: true});
    process.stdout.pipe(openFileStream)
    process.stderr.pipe(openFileStream)
})

openFileStream.on('error', (err)=> {
    console.log(err)
})
/*******************************************/

/*******************************************/
var logfile = `./logs/public_${currentTime}.log`;
console.log(logfile)
var openFileStream = fs.createWriteStream(logfile, {flags: 'a'});
openFileStream.on('open', () => {
    var process = child.spawn('node', ['public.js'], {cwd: 'websockets', shell: true});
    process.stdout.pipe(openFileStream)
    process.stderr.pipe(openFileStream)
})

openFileStream.on('error', (err)=> {
    console.log(err)
})
/*******************************************/


/*******************************************/
var logfile = `./logs/bot_${currentTime}.log`;
console.log(logfile)
var openFileStream = fs.createWriteStream(logfile, {flags: 'a'});
openFileStream.on('open', () => {
    var process = child.spawn('node', ['bot.js'], {cwd: 'algo', shell: true});
    process.stdout.pipe(openFileStream)
    process.stderr.pipe(openFileStream)
})

openFileStream.on('error', (err)=> {
    console.log(err)
})
/*******************************************/