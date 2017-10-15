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

var isDoneLoading = false;
var timestamps;

const closest = (arr, goal) => {
        return arr.reduce(function(prev, curr) {
        return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
    });
}


var renderChart = (ticker, that) => {
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
                    var count = 0;
                    this.showLoading();
                    setInterval(function () {

                        // while (that.data.length > 0) {
                            
                            // console.log(that.data);
                            // var currentPoint = that.data.shift();
                            // console.log([moment(that.data[0][0]).valueOf(), that.data[0][1]])
                            // series.addPoint([moment(currentPoint[0]).valueOf(), currentPoint[1]], true, false);
                            // console.log(series)
                        // }

                        $.ajax(
                            URL+'getLivePrices/' + that.props.ticker,
                            {
                                success: (data) => {
                                    if (data.length > 0) {
                                        this.hideLoading();
                                        _.forEach(data, (price) => {
                                            series.addPoint([moment(price.timestamp).valueOf(), price.price], false, false);
                                        })
                                        this.redraw();
                                    }
                                    else {
                                        if (that.timestamps.length === 0) {
                                            that.timestamps = series.data.map((item) => {
                                                return item.x;
                                            })
                                            console.log(that.timestamps);
                                        }
                                        $.ajax(
                                            URL+'getBotTrades/' + that.props.ticker,
                                            {
                                                success: (data) => {                                                    
                                                    if (data.length > 0) {
                                                        // this.hideLoading();
                                                        data.forEach((item)=> {
                                                            if (!_.contains(that.ids, item.id)) {
                                                                console.log('Adding bot trades to the graph...')
                                                                // that.trades.push(item)
                                                                var goal = item.timestamp;
                                                                console.log(`goal: ${goal} | existing: ${closest(that.timestamps, goal)}`);
                                                                signalSeries.addPoint({x: moment(item.itemstamp).valueOf(), title: item.side ? 'Buy': 'Sell', text: `${item.qty} [${item.ticker}] @ ${item.price}`}, true, false)
                                                                that.ids.push(item.id)
                                                                // this.redraw();
                                                            }
                                                        })
                                                    }
                                                }
                                            }
                                        ) // end getBotTrades API call
                                    }
                                },
                                fail: () => {
                                    console.log('Failed getting live prices')
                                }
                            }
                        )

                    }.bind(this), 1000);
                    
                    
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
            dataGrouping: {
                enabled: false
            },
            data: []
        },
        {
            type: 'flags',
            onSeries: 'Price',
            data: [],
            dataGrouping: {
                enabled: false
            }
        }]
    });
}


class PriceChart extends Component {
    data = []; // contains the latest prices for a given ticker
    trades = []; // contains the transactions the bot made
    ids = []; // contains the trade ids for detecting duplicates
    timestamps = [];

    componentWillReceiveProps(nextProps) {
        // if (nextProps != this.props) {
        //     var filteredData = _.filter(nextProps.data, (item) => {
        //         return item.ticker == nextProps.ticker;
        //     })

        //     // console.log(filteredData)

        //     if (filteredData.length > 0) {
        //         this.data = filteredData.map((item) => {
        //             return [item.time, item.price, item.signal]
        //         })
        //     }
        // }
    }

    componentDidMount() {
        $.ajax(
            URL+'resetLivePriceFlag',
            {
                success: (data) => {
                    renderChart(this.props.ticker, this);
                }
            }
        )
    }



    render() {


        return (
            <div id={this.props.ticker} key={this.props.ticker} />
        )
    }

}

export default PriceChart;