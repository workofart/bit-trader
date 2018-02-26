import React, { Component } from 'react';
import {Header, Item, Icon, Container, Divider} from 'semantic-ui-react';
const $ = require('jquery');
const _ = require('underscore');
const moment = require('moment');



const URL = 'http://127.0.0.1:3001/api/';

class SidePanel extends Component {

	state = {
		sideItems: []
	}

    componentDidMount() {
		var that = this;
        $.ajax(
            URL + 'getWalletState',
            {
				success: (data) => {
					if (data.length > 0) {
						data = _.filter(data, (i) => i.balance !== null);
						console.log(data);
						let basicItems = [
							{
								header: 'Initial Investment',
								description: data[0].balance.toFixed(8) + ' BTC'
							},
							{
								header: 'Balance',
								description: data[data.length - 1].balance.toFixed(8) + ' BTC'
							},
							{
								header: 'Profit',
								description: (data[data.length - 1].balance - data[0].balance).toFixed(8) + ' BTC',
								extra: ((data[data.length - 1].balance - data[0].balance) / data[0].balance * 100).toFixed(2) + '%'
							},
							{
								header: '# Trades',
								description: data.length,
							},
							{
								header: 'Trading Duration',
								description: moment().local().diff(moment(data[0].timestamp), 'hours', true).toFixed(2) + ' Hours'
							}
						]
						let bestItems = [
							{
								header: 'Balance',
								description: _.max(data, (a) => a.balance).balance.toFixed(8) + ' BTC'
							},
							{
								header: 'Profit',
								description: (_.max(data, (a) => a.balance).balance - data[0].balance).toFixed(8) + ' BTC',
								extra: ((_.max(data, (a) => a.balance).balance - data[0].balance) / data[0].balance * 100).toFixed(2) + '%'
							}
						]

						let worstItems = [
							{
								header: 'Balance',
								description: _.min(data, (a) => a.balance).balance < data[0].balance ? _.min(data, (a) => a.balance).balance.toFixed(8) + ' BTC' : <Icon size='large' name='smile' />
							},
							{
								header: 'Profit',
								description: (_.min(data, (a) => a.balance).balance - data[0].balance).toFixed(8) + ' BTC',
								extra: ((_.min(data, (a) => a.balance).balance - data[0].balance) / data[0].balance * 100).toFixed(2) + '%'
							}
						]

						that.setState({basicItems: basicItems, bestItems: bestItems, worstItems: worstItems});

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
			<Container>
				<Header as='h2'>Overall</Header>
				<Item.Group items={this.state.basicItems} />
				<Divider />
				<Header as='h2'>Best</Header>
				<Item.Group items={this.state.bestItems} />
				<Divider />
				<Header as='h2'>Worst</Header>
				<Item.Group items={this.state.worstItems} />
			</Container>
        )
    }
}

export default SidePanel;