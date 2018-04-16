import React, { Component } from 'react';
import {Statistic} from 'semantic-ui-react';
const Utils = require('../../lib/utils');

class PerformanceStats extends Component {
    render() {
        var profit = Utils.calculateProfit(this.props.data);
        var bhProfit = Utils.calculateBHProfit(this.props.prices);

        return (
            <Statistic.Group>
                {profit >= 0 ?
                        <Statistic color='green'>
                            <Statistic.Value>{profit.toFixed(8)}BTC</Statistic.Value>
                            <Statistic.Label>Profitability</Statistic.Label>
                        </Statistic>
                        :
                        <Statistic color='red'>
                            <Statistic.Value>${profit.toFixed(8)}</Statistic.Value>
                            <Statistic.Label>Profitability</Statistic.Label>
                        </Statistic>
                }
				<Statistic color='grey'>
					<Statistic.Value>{(bhProfit * 100).toFixed(4)}%</Statistic.Value>
					<Statistic.Label>Buy and Hold Profitability</Statistic.Label>
				</Statistic>
            </Statistic.Group>
        )
    }
}

export default PerformanceStats;