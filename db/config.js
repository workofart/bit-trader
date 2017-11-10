const { Pool } = require('pg')

const client = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'portfolio-manager',
    password: 'henrypan',
    port: 5432
})
// Adjust this based on the environment
// mac user: 'Henry'
// windows user: 'postgres'

module.exports.pool = client;