import React, { Component } from 'react';
import {Header, Item, Icon, Container, Divider} from 'semantic-ui-react';
const _ = require('underscore');
const moment = require('moment');

class SidePanel extends Component {

	state = {
		sideItems: []
	}

    componentDidUpdate(prevProps) {
		if (prevProps.data.length != this.props.data.length) {
			let data = this.props.data;
			if (data.length > 0) {
				// data = _.filter(data, (i) => i.balance !== null);
				// console.log(data);
				let basicItems = [
					{
						header: 'Balance',
						description: data[data.length - 1].balance.toFixed(8) + ' BTC'
					},
					{
						header: 'Profit',
						extra: (data[data.length - 1].balance - data[0].balance).toFixed(8) + ' BTC',
						description: ((data[data.length - 1].balance - data[0].balance) / data[0].balance * 100).toFixed(2) + '%'
					}
				]
				let bestItems = [
					{
						header: 'Balance',
						description: _.max(data, (a) => a.balance).balance.toFixed(8) + ' BTC'
			},
				{
					header: 'Profit',
						extra: (_.max(data, (a) => a.balance).balance - data[0].balance).toFixed(8) + ' BTC',
					description: ((_.max(data, (a) => a.balance).balance - data[0].balance) / data[0].balance * 100).toFixed(2) + '%'
				}
			]

				let worstItems = [
					{
						header: 'Balance',
						description: _.min(data, (a) => a.balance).balance < data[0].balance ? _.min(data, (a) => a.balance).balance.toFixed(8) + ' BTC' : <Icon size='large' name='smile' />
			},
				{
					header: 'Profit',
						extra: (_.min(data, (a) => a.balance).balance - data[0].balance).toFixed(8) + ' BTC',
					description: ((_.min(data, (a) => a.balance).balance - data[0].balance) / data[0].balance * 100).toFixed(2) + '%'
				}
			]

				let otherItems = [
					{
						header: 'Initial Investment',
						description: data[0].balance.toFixed(8) + ' BTC'
					},
					{
						header: '# Trades',
						description: data.length,
					},
					{
						header: 'Trading Duration',
						description: moment(data[data.length - 1].timestamp).local().diff(moment(data[0].timestamp), 'hours', true).toFixed(2) + ' Hours'
					}
				]
				this.setState({basicItems: basicItems, bestItems: bestItems, worstItems: worstItems, otherItems: otherItems});
			}
		}
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
				<Divider />
				<Header as='h2'>Other</Header>
				<Item.Group items={this.state.otherItems} />
			</Container>
        )
    }
}

export default SidePanel;