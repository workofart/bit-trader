const csv = require('csv');
const fs = require('fs');

const storeTransactionToDB = (ticker, price, qty, side, timestamp) => { 
    var params = [ticker, price, qty, side, timestamp];
    var query = `INSERT INTO BITFINEX_TRANSACTIONS (ticker, price, qty, side, timestamp) VALUES ($1, $2, $3, $4, $5);`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code != 23505) {
                    console.log(err)
                    console.err('There was a error when inserting into transactions table')
                }
                else {
                    util.log('Insert into transaction table success: ' + params)
                }
            })
    })
}

csv().from.stream(fs.createReadStream('transactions.txt')).to.path('out.txt')