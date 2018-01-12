import React, { Component } from 'react';
import {Statistic} from 'semantic-ui-react';
const $ = require('jquery');
const moment = require('moment')
const util = require('util');

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

class PerformanceStats extends Component {
    render() {
        var profit = calculateProfit(this.props.data);

        return (
            <Statistic.Group>
                {profit >= 0 ? 
                        <Statistic color='green'>
                            <Statistic.Value>${profit.toFixed(2)}</Statistic.Value>
                            <Statistic.Label>Profitability</Statistic.Label>
                        </Statistic>
                        :
                        <Statistic color='red'>
                            <Statistic.Value>${profit.toFixed(2)}</Statistic.Value>
                            <Statistic.Label>Profitability</Statistic.Label>
                        </Statistic>
                }
            </Statistic.Group>
        )
    }
}

export default PerformanceStats;