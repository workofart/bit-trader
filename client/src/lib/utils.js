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

module.exports = {
	calculateProfit: calculateProfit
}