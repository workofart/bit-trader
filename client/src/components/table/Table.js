import React, { Component } from 'react';
import { Table, Label, Icon, Menu, Header } from 'semantic-ui-react';
const $ = require('jquery');
const moment = require('moment')
const _ = require('underscore');
const util = require('util');


const CustomRow = (data) => {
    // console.log(data);
    data = _.sortBy(data, (item) => {
        return moment(item.timestamp).local().format()
    })
    let rows = data.map((item) => {
        return (
        <Table.Row key={item.ticker + item.timestamp}>
            <Table.Cell>{item.price}</Table.Cell>
            <Table.Cell>{item.qty}</Table.Cell>
            <Table.Cell><Label color={item.side ? 'green' : 'red'} size='small'>{item.side ? 'Buy' : 'Sell'}</Label></Table.Cell>
            <Table.Cell>{moment(item.timestamp).local().format("YYYY/MM/DD | HH:mm:ss")}</Table.Cell>
        </Table.Row>
        )
    })
    return rows;
}

class PerformanceTable extends Component {
    
    render() {
        return (
            <div>
                <Header as='h3'>
                    {this.props.ticker}
                </Header>
                <Table celled compact selectable>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>Price</Table.HeaderCell>
                            <Table.HeaderCell>Qty</Table.HeaderCell>
                            <Table.HeaderCell>Side</Table.HeaderCell>
                            <Table.HeaderCell>DateTime</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {CustomRow(this.props.data)}
                        {/* {console.log(CustomRow(this.state.trades))} */}
                    </Table.Body>
                </Table >
            </div>
                )
    }
}

export default PerformanceTable;