import React, { Component } from 'react';
import { Statistic } from 'semantic-ui-react';

const Utils = require('../../lib/utils');

class PerformanceStats extends Component {
    render() {
        const profit = Utils.calculatePercentageProfit(this.props.data);
        const bhProfit = Utils.calculatePercentageProfit(this.props.prices);

        return (
          <Statistic.Group>
            <Statistic color={profit >= 0 ? 'green' : 'red'}>
                    <Statistic.Value>{profit.toFixed(4)}%</Statistic.Value>
                    <Statistic.Label>Bot Profitability %</Statistic.Label>
            </Statistic>
            <Statistic color="grey">
                    <Statistic.Value>{(bhProfit * 100).toFixed(4)}%</Statistic.Value>
                    <Statistic.Label>Buy and Hold Profitability</Statistic.Label>
            </Statistic>
            <Statistic color="grey">
                    <Statistic.Value>{this.props.data.length}</Statistic.Value>
                    <Statistic.Label>Trades</Statistic.Label>
            </Statistic>
            </Statistic.Group>
        );
    }
}

export default PerformanceStats;
