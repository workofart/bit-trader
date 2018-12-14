const { Pool } = require('pg')

const client = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'portfolio-manager',
    password: 'CHANGE_ME',
    port: 5432
})

module.exports.pool = client;