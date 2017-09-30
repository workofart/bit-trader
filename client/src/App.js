import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import PriceChart from './components/charts/price';
// import ReconnectingWebSocket from './reconnecting-websocket.min';
// const ws = new ReconnectingWebSocket('ws://127.0.0.1:1338', null, {
//   debug: true,
//   reconnectInterval: 3000
// })

// const ws = new WebSocket('ws://127.0.0.1:1338')
const $ = require('jquery');
var msgQ = [];
const queueThreshold = 300;
const tickers = ['BTCUSD', 'OMGUSD', 'IOTUSD', 'DSHUSD'];
// const tickers = ['BTCUSD'];


class App extends Component {
  state = {
    data: []
  }


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

  render() {
    
    return (
      <div>
        {
          tickers.map((item) => {
              return (
                <PriceChart ticker={item} data={this.state.data} key={item}/>
            )
          })
        }
      </div>
    );
  }
}

export default App;
