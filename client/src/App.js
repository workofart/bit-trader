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
const mapping = require('./mapping_binance');

const URL = 'http://127.0.0.1:3001/api/';
var msgQ = [];
const queueThreshold = 300;
const tickers = _.map(require('./mapping_binance'), (i) => i + 'BTC');


class App extends Component {
  state = {
    trades: [],
    prices: {},
    ticker: ''
  }

  ids = [];



  componentDidMount() {
    mapping.forEach((ticker) => {
		this.getTradesByTicker(ticker);
    })
  }

  setPrices(prices) {
    this.setState({prices : prices});
  }

  getTradesByTicker(ticker) {
    // console.log(ticker);
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
		<Header size='huge' textAlign='center'>
		  <Icon name='user secret' circular />
          Back-testing Visualization
        </Header>
        <Container fluid style={{ marginLeft: 60, marginRight: 60 }}>
        {
          tickers.map((item) => {
            return (
              <Button style={{margin: 4}} key={item} onClick={(event, data) => { this.getTradesByTicker(data.children) }}>{item}</Button>
            )
          })
        }
        </Container>
	    <Grid celled>
			<Grid.Column width={1}>
				<SidePanel/>
			</Grid.Column>
			<Grid.Column width={15}>
        {/*<Container fluid style={{ marginLeft: 60, marginTop: 80, marginRight: 60 }}>*/}

          <PriceChart ticker={this.state.ticker} data={this.state.trades} setPricesFunc={this.setPrices.bind(this)}/>
          <CustomStats data={this.state.trades} prices={this.state.prices}/>
          <Divider />
          <CustomTable ticker={this.state.ticker} data={this.state.trades} />
        {/*</Container>*/}
			</Grid.Column>
		</Grid>
      </div>
    );
  }
}
export default App;
