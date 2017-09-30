const args = [ 'start' ];
const opts = { stdio: 'inherit', cwd: 'client', shell: true };
require('child_process').spawn('npm', args, opts);

console.log('Find the client at: http://127.0.0.1:3000');