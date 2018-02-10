import React, { Component } from 'react';
import {Item, Container} from 'semantic-ui-react';
const $ = require('jquery');
const _ = require('underscore');



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
						let item = [
							{
								header: 'Initial Investment',
								description: data[0].balance.toFixed(8) + ' BTC'
							},
							{
								header: 'Top Balance',
								description: _.max(data, (a) => a.balance).balance
							},
							{
								header: 'Best Return',
								description: ((_.max(data, (a) => a.balance).balance - data[0].balance) / data[0].balance * 100).toFixed(2) + '%'
							}
						]

						that.setState({sideItems: item});
						// console.log(data);
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
				<Item.Group items={this.state.sideItems} />
			</Container>
        )
    }
}

export default SidePanel;