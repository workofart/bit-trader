const express = require('express');
// const httpProxy = require('http-proxy')
const fs = require('fs');
const routes = require('./controller/routes');
const util = require('util')
const api_routes = require('./api/routes');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))


// const targetUrl = `http://$localhost:3001`;

// const proxy = httpProxy.createProxyServer({
    // target: targetUrl,
    // ws: true,
// })
app.set('port', 3001);
// app.set('port', (process.env.PORT || 3001));


// Express only serves static assets in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));
}


// app.use('/', routes);

// app.use('/api', (req, res) =>{
//     proxy.web(req, res, {target: `${targetUrl}/api`});
// })

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

    next();
})
app.use('/api', api_routes);

app.listen(app.get('port'), () => {
    console.log(`Find the server at: http://127.0.0.1:${app.get('port')}`); // eslint-disable-line no-console
});

