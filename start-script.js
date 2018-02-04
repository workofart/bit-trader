const args = [ 'SocketServer.js', 'public.js', 'bot.js' ];
const cwds = ['websockets', 'websockets', 'algo'];
const stdios = ['inherit', 'inherit', 'pipe']
const logStream = [ 'SocketServer', 'public', 'bot' ];

const moment = require('moment');
const child = require('child_process');
const fs = require('fs');
const path = require('path');
const currentTime = moment().local().format('YYYY-MM-DD_HHmmss').toString();

// child.spawn('node', ['SocketServer.js'], {cwd: 'websockets', shell: true});

// child.spawn('node', ['public.js'], {cwd: 'websockets', shell: true});


/*******************************************/
var logfile = `./logs/bot_${currentTime}.log`;
console.log(logfile);
const out = fs.openFileSync(logfile, 'a');

var process = child.spawn('node', ['bot.js'], {cwd: 'algo', detached: true, stdio: ['ignore', out, out]});

/*******************************************/

// Create symbolic link for easy log scanning
fs.symlinkSync(`bot_${currentTime}.log`, './logs/stdout_bk');
fs.renameSync('./logs/stdout_bk', './logs/stdout');