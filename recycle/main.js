const Network = require('neataptic'),
	  testUtil = require('../test/lib/testUtil'),
	  _ = require('underscore');

const processor = async (dataFile) => {
	console.time(`-- [${dataFile}] --`);

	try {
		let data = await testUtil.parseCSV('../test/data/' + dataFile);
		data = _.sortBy(data, (a) => { return a.timestamp});
		// for (var i = 0, len = data.length; i < len; i++) {
		// 	// console.log(`${data[i].timestamp} | ${data[i].ticker}`);
		// 	data[i].last_price = parseFloat(data[i].price);
		// 	delete data[i].price;
		// 	delete data[i].rsi;
		// 	delete data[i].bb_lower;
		// 	delete data[i].bb_upper;
		// 	let { ticker, last_price, high, low, volume, timestamp } = data[i];
		// 	await subprocessor(ticker, data[i]);
		// }
		return data;
	}
	catch(e) {
		console.error('Problem with parsing the csv file: ' + e.stack);
	}

};


let myTrainingSet = [
	{ input: [0,0], output: [0] },
	{ input: [0,1], output: [1] },
	{ input: [1,0], output: [1] },
	{ input: [1,1], output: [0] }
];

// let myNetwork = net.architect.Perceptron(2,3,1);
//
// myNetwork.train(myTrainingSet, {
// 	log: 10,
// 	error: 0.03,
// 	iterations: 5000,
// 	rate: 0.3
// })


const evoNetwork = async (trainingData) => {
	let myNetwork = new Network.Network(trainingData[0].input.length, 1);

	await myNetwork.evolve(trainingData, {
		mutation: Network.methods.mutation.FFW,
		equal: true,
		popsize: 100,
		elitism: 10,
		log: 10,
		// error: 0.03,
		iterations: 1000,
		mutationRate: 0.5
	})

	return myNetwork;
}

const LSTMNetwork = (trainingData) => {
	let myNetwork = new Network.architect.LSTM(3, 4, 4, 4, 1);

	myNetwork.train(trainingData, {
		log: 100,
		iterations: 700,
		clear: true
	})

	return myNetwork;
}

const ticker = 'BCCBTC',
	  numSample = 1000,
	  stepSize = 20,
      sampleTarget = 500;

(async() => {

	let data = await processor('binance_sideway_2');
	let filteredData = _.filter(data, (item) => item.ticker === ticker);

	let inputData = filteredData.slice(0, numSample);
	let outputData = filteredData.slice(stepSize, numSample + stepSize);

	let trainingX = _.map(inputData, (data) => [parseFloat(data.price), parseFloat(data.high), parseFloat(data.low)]),
		trainingY = _.map(outputData, (data) => parseFloat(data.price));

	let trainingData = [];
	for (let i in trainingX) {
		let d = {input: trainingX[i], output: [trainingY[i]]};
		trainingData.push(d);
	}
	let lstmNetwork = LSTMNetwork(trainingData);
	let evolutionNetwork = await evoNetwork(trainingData);

	console.log(`Neural Evolution Network: ${evolutionNetwork .activate(trainingX[sampleTarget])}`);
	console.log(`LSTM Network: ${lstmNetwork.activate(trainingX[sampleTarget])}`);
	console.log(trainingY[sampleTarget - stepSize]);


	// await myNetwork.evolve(myTrainingSet, {
	// 	mutation: Network.methods.mutation.FFW,
	// 	equal: true,
	// 	popsize: 100,
	// 	elitism: 10,
	// 	log: 10,
	// 	error: 0.03,
	// 	iterations: 1000,
	// 	mutationRate: 0.5
	// })

	// console.log(myNetwork.activate([0,0]))
	// console.log(myNetwork.activate([0,1]))
	// console.log(myNetwork.activate([1,0]))
	// console.log(myNetwork.activate([1,1]))

})()