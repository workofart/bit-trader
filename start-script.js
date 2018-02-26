const moment = require('moment');
const child = require('child_process');
const fs = require('fs');
const currentTime = moment().local().format('YYYY-MM-DD_HHmmss').toString();

/*******************************************/
var logfile = `./logs/bot_${currentTime}.log`;
console.log(logfile);
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

// Create symbolic link for easy log scanning
fs.symlinkSync(`bot_${currentTime}.log`, './logs/stdout_bk');
fs.renameSync('./logs/stdout_bk', './logs/stdout');
