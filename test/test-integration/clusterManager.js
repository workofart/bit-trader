let cluster = require('cluster');

const initCluster = async (callback) => {
	if (cluster.isMaster) {
		let numWorkers = require('os').cpus().length;

		console.log('Master cluster setting up ' + numWorkers + ' workers...');

		for(let i = 0; i < numWorkers; i++) {
			cluster.fork();
		}

		cluster.on('online', function(worker) {
			console.log('Worker ' + worker.process.pid + ' is online');
		});

		cluster.on('exit', function(worker, code, signal) {
			console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
			console.log('Starting a new worker');
			cluster.fork();
		});
	} else {
		console.log(`---------- Worker [${process.pid}] backtesting ------------`);
		await callback();
	}
};

module.exports = {
	initCluster: initCluster
}
