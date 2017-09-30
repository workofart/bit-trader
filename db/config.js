const { Pool } = require('pg')

const client = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'portfolio-manager',
    password: 'henrypan',
    port: 5432
})

module.exports.pool = client;