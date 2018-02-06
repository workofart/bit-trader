import React, { Component } from 'react';
import { Container, Button, Divider } from 'semantic-ui-react';
import logo from './logo.svg';
import './App.css';
import PriceChart from './components/charts/price';
import CustomStats from './components/stats/Stats';
import CustomTable from './components/table/Table';
// import ReconnectingWebSocket from './reconnecting-websocket.min';
// const ws = new ReconnectingWebSocket('ws://127.0.0.1:1338', null, {
//   debug: true,
//   reconnectInterval: 3000
// })

// const ws = new WebSocket('ws://127.0.0.1:1338')
const $ = require('jquery');
const _ = require('underscore');

const URL = 'http://127.0.0.1:3001/api/';
var msgQ = [];
const queueThreshold = 300;
const tickers = [
	"ETHBTC",
	"DGDBTC",
	"TRXBTC",
	"ADABTC",
	"XRPBTC",
	"LTCBTC",
	"VENBTC",
	"ICXBTC",
	"EOSBTC",
	"NEOBTC",
	"HSRBTC",
	"XLMBTC",
	"BNBBTC",
	"VIBEBTC",
	"WTCBTC",
	"NANOBTC",
	"IOSTBTC",
	"XVGBTC",
	"IOTABTC"
];


class App extends Component {
  state = {
    trades: [],
    ticker: ''
  }

  ids = [];

  // componentDidMount() {

  // ws.onopen = () => {
  //     console.log('Connected to local [Bot] websocket server');
  // }

  // ws.onmessage = (data) => {
  //     var parsedData = JSON.parse(data.data);
  //     // check if the data is the same
  //       msgQ = [...msgQ, parsedData];
  //       if (msgQ.length > queueThreshold) {
  //           msgQ.shift();
  //       }
  //       // console.log(parsedData);
  //       this.setState({data: msgQ});
  // }

  // ws.onclose = () => {
  //   console.log('Client disconnected')
  // }


  // }

  componentDidMount() {

  }

  getTradesByTicker(ticker) {
    console.log(ticker);
    var that = this;
      // that.setState({ticker: ticker})
      $.ajax(
        URL + 'getBotTrades/' + ticker,
        {
          success: (data) => {
            if (data.length > 0) {
              var currentTrades = [];
              data.forEach((item) => {
                currentTrades.push(item);
              })
              that.setState({ trades: currentTrades, ticker: ticker })
            }
            else {
              that.setState({trades: [], ticker: ticker})
            }
          },
          error: (data, status, err) => {
            console.log(err);
          }
        }
      )
  }

  render() {

    return (
      <div>
        <Container fluid style={{ marginLeft: 60, marginRight: 60 }}>
        {
          tickers.map((item) => {
            return (
              <Button style={{margin: 4}} key={item} onClick={(event, data) => { this.getTradesByTicker(data.children) }}>{item}</Button>
            )
          })
        }
        </Container>
        <Container fluid style={{ marginLeft: 60, marginTop: 80, marginRight: 60 }}>
          <PriceChart ticker={this.state.ticker} data={this.state.trades}/>
          <CustomStats data={this.state.trades} />
          <Divider />
          <CustomTable ticker={this.state.ticker} data={this.state.trades} />
        </Container>
      </div>
    );
  }
}
export default App;
