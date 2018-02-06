const { Pool } = require('pg')

const client = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'portfolio-manager',
    password: 'henrypan',
    port: 5432
})
// Adjust this based on the environment
// mac user: 'Henry'
// windows user: 'postgres'

module.exports.pool = client;