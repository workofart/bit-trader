const { Pool } = require('pg')

const client = new Pool({
    user: 'Henry',
    host: 'localhost',
    database: 'portfolio-manager',
    password: 'henrypan',
    port: 5432
})
// Adjust this based on the environment

module.exports.pool = client;