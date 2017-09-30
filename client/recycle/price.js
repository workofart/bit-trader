import React, { Component } from 'react';
import { ComposedChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Scatter, Tooltip, Dot } from 'recharts';
const moment = require('moment')
// const ws = new WebSocket('ws://127.0.0.1:1338')
const _ = require('underscore');

var msgQ = [];
const queueThreshold = 30;

const CustomLabel = (props) => {
    const {cx, cy, fill} = props;
    const {refVal, signal} = props.payload;

    if (refVal != undefined && signal != undefined) {
        return (
            <g>
                <Dot cx={cx} cy={cy} r={5} fill={fill} />
                <g transform={`translate(${cx},${cy})`}>
                    <text x={10} y={0} dy={4} textAnchor="left">{signal ? 'buy' : 'sell'}</text>
                </g>
            </g>
        )
    }
    else {
        return (
            <g><Dot cx={cx} cy={refVal} r={5} fill={fill} /></g>
        )
    }
}

const CustomXTick = (props) => {
    const {x, y, stroke, payload} = props;
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" fill="#666" fontSize={12} transform="rotate(-35)">{payload.value}</text>
        </g>
    )
}

class PriceChart extends Component {

    state = {
        data : [],
        maxPrice: -1,
        minPrice: 1,
        count: 0,
        batchCount: 0,
        skip: 0,
        done: true
    }


    // resets counter to 0
    refreshData() {

    }
    
    componentWillReceiveProps(nextProps) {
        if (nextProps != this.props) {
            var filteredData = _.filter(nextProps.data, (item) => {
                return item.ticker == nextProps.ticker;
            })

            // console.log(filteredData)
            
            if (filteredData.length > 0) {
                var data = filteredData.map((item) => {
                    return {time: item.time, ticker: item.ticker, signal: 0, val: item.price}
                })
                
                // console.log(data);
                // var lastDataPoint = this.state.data[this.state.data.length - 1];
                // if (lastDataPoint.time != d)
                // var temp = this.state.data.concat(data);
                // msgQ = msgQ.concat(data)
                // msgQ = [...msgQ, data];
                while (data.length > queueThreshold) {
                    data.shift();
                }
                var prices = data.map((item) => {
                    return item.val
                })
                this.setState({data: data, maxPrice: _.max(prices), minPrice: _.min(prices)});
            }
            
        }
    }
    // componentDidMount() {
    //     ws.onopen = () => {
    //         console.log('Connected to local [Bot] websocket server');
    //     }

    //     ws.onmessage = (data) => {
    //         var parsedData = JSON.parse(data.data);
    //         if (parsedData.ticker === this.props.ticker) {
    //             msgQ = [...msgQ, {time: parsedData.time, ticker: parsedData.ticker, signal: 0, val: parsedData.price}];
    //             if (msgQ.length > queueThreshold) {
    //                 msgQ.shift();
    //             }
    //             this.setState({data: msgQ});
    //         }
    //     }

    // }
    
    render() {

        
        return (
        <ComposedChart
            width={1500}
            height={300}
            data={this.state.data}
            margin={{ top: 20, right: 10, left: 15, bottom: 50}}>
            <Line name="Price" isAnimatedActive={false} type="monotone" dataKey="val" stroke="#8884d8" />
            <CartesianGrid stroke="#cccc" strokeDasharray="5 5" />
            <Legend margin={{top: 55, right: 15, left: 15, bottom: 15}} />
            <Scatter data={this.state.data} name="Signal" shape={<CustomLabel />} fill='red' dataKey='signal' isAnimatedActive={false} />
            <XAxis dataKey='time' tick={<CustomXTick />} />
            {/* <YAxis type='number' domain={['dataMin', parseFloat((this.state.maxPrice * 1.01).toFixed(2))]}/> */}
            <YAxis interval={0} type='number' domain={[3600, 'auto']}/>
            <Tooltip cursor={{ strokeDasharray: '3 3'}} />
        </ComposedChart>
        )
    }

}

export default PriceChart;