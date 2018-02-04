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
            marginLeft: 80,
            marginRight: 50,
            height: 700,
            spacing: [20, 20, 30, 30],
            renderTo: ticker,
            animation: false,
            events: {
                load: function () {

                    // set up the updating of the chart each second
                    var series = this.series[0];
                    var signalSeries = this.series[1];
                    var rsiSeries = this.series[2];
                    var lowerBBSeries = this.series[3];
                    var upperBBSeries = this.series[4];
                    this.showLoading();
                    $.ajax(
                        URL + 'getLivePrices/' + that.props.ticker,
                        {
                            success: (data) => {
                                if (data.length > 0) {
                                    this.hideLoading();
                                    _.forEach(data, (price) => {
                                        series.addPoint([moment(price.timestamp).local().valueOf(), price.price], false, false);
                                        if (price.rsi && price.bb_lower && price.bb_upper) {
                                            rsiSeries.addPoint([moment(price.timestamp).local().valueOf(), price.rsi], false, false);
                                            upperBBSeries.addPoint([moment(price.timestamp).local().valueOf(), price.bb_upper], false, false);
                                            lowerBBSeries.addPoint([moment(price.timestamp).local().valueOf(), price.bb_lower], false, false);
                                        }
                                    });
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

        yAxis: [
            {
                title: {
                    text: 'Price (USD)'
                },
                opposite: false,
                height: '60%',
                lineWidth: 2,
                resize: {
                    enabled: true
                }
            },
            {
                title: {
                    text: 'RSI'
                },
                opposite: false,
                top: '65%',
                height: '35%',
                offset: 0,
                lineWidth: 2,
                min: 0,
                max: 100
            }
        ],

        tooltip: {
            hideDelay: 0,
            shadow: false,
            animation: false,
            valueDecimals: 8,
            // shared: true,
            split: true
        },

        title: {
            text: `${ticker} Prices`
        },

        series: [
            {
                type: 'line',
                marker: {
                    enabled: false
                },
                labels: {
                    align: 'right',
                    x: -3
                },
                name: 'Price',
                id: 'Price',
                yAxis: 0,
                data: [],
            },
            {
                type: 'flags',
                marker: {
                    enabled: false
                },
                onSeries: 'Price',
                data: [],
                stackDistance: 40,
                yAxis: 0
            },
            {
                type: 'line',
                name: 'RSI',
                marker: {
                    enabled: false
                },
                labels: {
                    align: 'right',
                    x: -3
                },
                data: [],
                yAxis: 1
            },
            {
                type: 'line',
                name: 'Lower BB',
                marker: {
                    enabled: false
                },
                dashStyle: 'shortdot',
                color: '#646608',
                data: [],
                yAxis: 0
            },
            {
                type: 'line',
                name: 'Upper BB',
                marker: {
                    enabled: false
                },
                dashStyle: 'shortdot',
                color: '#ff1c31',
                data: [],
                yAxis: 0
            }
        ]
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