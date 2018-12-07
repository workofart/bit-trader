import React, { Component } from 'react';
import { Container, Button, Divider, Grid, Header, Icon} from 'semantic-ui-react';
import './App.css';
import PriceChart from './components/charts/price';
import CustomStats from './components/stats/Stats';
import CustomTable from './components/table/Table';
import SidePanel from './components/sidepanel/SidePanel';

const $ = require('jquery');
const _ = require('underscore');
const Utils = require('./lib/utils');

const URL = 'http://127.0.0.1:3001/api/';

class App extends Component {
  state = {
    trades: [],
    prices: {},
    ticker: '',
    allTickers: []
  }

  ids = [];

  componentDidMount() {
    this.getTradedTickers().then((mapping) => {
        this.setState({allTickers: mapping})
    })
  }

  setPrices(prices) {
    this.setState({prices : prices});
  }

  getTradedTickers() {
    return new Promise((resolve, reject) => {
      $.ajax(
        URL + 'getTradedTickers',
        {
          success: (data) => {
            if (data.length > 0) {
              resolve(data)
            }
            else {
              reject('No Trades Available');
            }
          },
          error: (data, status, err) => {
            console.log(err);
          }
        }
      )
    })
  }
  

  getTradesByTicker(ticker) {
    // console.log(ticker);
    var that = this;
      $.ajax(
        URL + 'getBotTradesByTicker/' + ticker,
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
        <Header size='huge' textAlign='center'>
          <Icon name='user secret' circular />
              Back-testing Visualization
            </Header>
            <Container fluid style={{ marginLeft: 60, marginRight: 60 }}>
            {
              this.state.allTickers.map((item) => {
                return (
                  <Button style={{margin: 4}} key={item.ticker} onClick={(event, data) => { this.getTradesByTicker(data.children) }}>{item.ticker}</Button>
                )
              })
            }
            </Container>
          <Grid celled>
          <Grid.Column width={1}>
            <SidePanel/>
          </Grid.Column>
          <Grid.Column width={15}>
              <PriceChart ticker={this.state.ticker} data={this.state.trades} setPricesFunc={this.setPrices.bind(this)}/>
              <CustomStats data={this.state.trades} prices={this.state.prices}/>
              <Divider />
              <CustomTable ticker={this.state.ticker} data={this.state.trades} />
          </Grid.Column>
        </Grid>
      </div>
    );
  }
}
export default App;
