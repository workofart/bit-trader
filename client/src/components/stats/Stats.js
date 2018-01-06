import React, { Component } from 'react';
import {Statistic} from 'semantic-ui-react';
const $ = require('jquery');
const moment = require('moment')
const util = require('util');

const calculateProfit = (data) => {
    var netPosition = 0;
    for (var i in data) {
        if (data[i].side) {
            netPosition -= data[i].qty * data[i].price;
        }
        else {
            netPosition += data[i].qty * data[i].price;
        }
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
                        <Statistic color='grey'>
                            <Statistic.Value>N/A</Statistic.Value>
                            <Statistic.Label>Profitability</Statistic.Label>
                        </Statistic>
                }
            </Statistic.Group>
        )
    }
}

export default PerformanceStats;