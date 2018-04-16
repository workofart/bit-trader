const calculateProfit = (data) => {
	let netPosition = 0,
		netQty = 0;
	for (var i in data) {
		if (data[i].side) {
			netPosition -= data[i].qty * data[i].price;
			netQty += data[i].qty;
		}
		else {
			netPosition += data[i].qty * data[i].price;
			netQty -= data[i].qty;
		}
	}
	if (netQty > 0) {
		netPosition += netQty * data[data.length - 1].price;
	}
	return netPosition;
}

const calculateBHProfit = (data) => {
	if (data.length > 0) {
		return (data[data.length - 1].price - data[0].price) / data[0].price
	}
	else
		return 0
}

module.exports = {
	calculateProfit: calculateProfit,
	calculateBHProfit: calculateBHProfit
}