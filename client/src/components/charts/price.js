import React, { Component } from 'react';
import Highcharts from 'highcharts/highcharts';
import HighStocks from 'highcharts/highstock';

const $ = require('jquery');
const moment = require('moment')
const util = require('util');
// const ws = new WebSocket('ws://127.0.0.1:1338')
const _ = require('underscore');
const MAX_ELEMENTS = 2000;
const URL = 'http://127.0.0.1:3001/api/';

var renderChart = (ticker, that, trades) => {
    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    HighStocks.stockChart(ticker, {
        chart: {
            marginLeft: 60,
            marginRight: 50,
            spacing: [20, 20, 30, 30],
            renderTo: ticker,
            animation: false,
            events: {
                load: function () {

                    // set up the updating of the chart each second
                    var series = this.series[0];
                    var signalSeries = this.series[1];
                    var walletSeries = this.series[2];
                    var count = 0;
                    this.showLoading();
                    $.ajax(
                        URL + 'getLivePrices/' + that.props.ticker,
                        {
                            success: (data) => {
                                if (data.length > 0) {
                                    this.hideLoading();
                                    _.forEach(data, (price) => {
                                        series.addPoint([moment(price.timestamp).local().valueOf(), price.price], false, false);
                                    })
                                    this.redraw();
                                }
                                else {
                                    console.log(data);

                                }
                            },
                            fail: () => {
                                console.log('Failed getting live prices')
                            }
                        }
                    )
                    // $.ajax(
                    //     URL + 'getLiveWallet',
                    //     {
                    //         success: (data) => {
                    //             if (data.length > 0) {
                    //                 this.hideLoading();
                    //                 _.forEach(data, (item) => {
                    //                     series.addPoint([moment(item.timestamp).local().valueOf(), item.balance], false, false);
                    //                 })
                    //                 this.redraw();
                    //             }
                    //             else {
                    //                 console.log(data);
                    //             }
                    //         },
                    //         fail: () => {
                    //             console.log('Failed getting live wallet')
                    //         }
                    //     }
                    // )
                    console.log('Render graph called.')
                    if (that.props.data != []) {
                        this.hideLoading();
                        that.props.data.forEach((item) => {
                            // if (!_.contains(that.ids, item.id)) {
                                // that.trades.push(item)
                                signalSeries.addPoint({ x: moment(item.timestamp).local().valueOf(), title: item.side ? 'Buy' : 'Sell', text: `${item.qty} [${item.ticker}] @ ${item.price}` }, true, false)
                                // that.ids.push(item.id)
                            // }
                        })
                    }
                }
            }
        },

        credits: {
            enabled: false
        },

        rangeSelector: {
            buttons: [{
                count: 1,
                type: 'minute',
                text: '1M'
            }, {
                count: 5,
                type: 'minute',
                text: '5M'
            }, {
                count: 15,
                type: 'minute',
                text: '15M'
            }, {
                count: 1,
                type: 'hour',
                text: '1H'
            }, {
                count: 4,
                type: 'hour',
                text: '4H'
            }, {    
                type: 'all',
                text: 'All'
            }],
            inputEnabled: false,
            selected: 5
        },

        yAxis: {
            title: {
                text: 'Price (USD)'
            },
            opposite: false
        },

        tooltip: {
            hideDelay: 0,
            shadow: false,
            animation: false,
            valueDecimals: 4,
            shared: true
        },

        title: {
            text: `${ticker} Prices`
        },

        series: [{
            type: 'line',
            marker: {
                enabled: false
            },
            name: 'Price',
            id: 'Price',
            data: [],
        },
        {
            type: 'flags',
            onSeries: 'Price',
            data: [],
            stackDistance: 20
        }]
        // {
        //     type: 'area',
        //     data: [],
        //     name: 'Wallet',
        //     id: 'Wallet'
        // }]
    });
}


class PriceChart extends Component {
    data = []; // contains the latest prices for a given ticker
    trades = []; // contains the transactions the bot made
    ids = []; // contains the trade ids for detecting duplicates
    timestamps = [];

    // Use this because the <div id={this.props.ticker}> contains the current ticker as the id
    // must wait until the render update is finished before initializing the HighStock charts
    componentDidUpdate(prevProps) {
        // check if the ticker has changed, if so, allow price reload
        if (prevProps.ticker != this.props.ticker) {
            console.log('prepare for next ticker: ' + this.props.ticker)
            // console.log('Trade data: ' + JSON.stringify(this.props.data))
            this.refreshChart(this.props.ticker, this.props.data)
        }
    }

    componentDidMount() {
        if (this.props.data !== [] && this.props.data.length > 0) {
            console.log(this.props.data)
            renderChart(this.props.ticker, this, this.props.data);

        }
    }

    refreshChart(ticker, data) {
        renderChart(ticker, this, data);
    }

    render() {
        return (
            <div id={this.props.ticker} key={this.props.ticker} />
        )
    }
}

export default PriceChart;