const { Pool } = require('pg')

const client = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'portfolio-manager',
    password: 'Pt2%PB.c,FY}g#UQb6tOfjNM',
    port: 5432
})
// Adjust this based on the environment
// mac user: 'Henry'
// windows user: 'postgres'

module.exports.pool = client;
