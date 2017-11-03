"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const dotenv = require("dotenv");
const https = require("https");
const mysql = require("promise-mysql");
const debug = Debug('index');
dotenv.config();
debug('Starting request');
// perform a GET request for the currency data
const url = 'https://api.fixer.io/latest?base=USD';
https.get(url, (res) => {
    const { statusCode } = res;
    let contentType = res.headers['content-type'];
    if (typeof contentType !== 'string')
        contentType = contentType[0];
    let error;
    if (statusCode !== 200)
        error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
    else if (!/^application\/json/.test(contentType))
        error = new Error(`Invalid content-type.\nExpected application/json but received ${contentType}`);
    if (error) {
        debug(error.message);
        res.resume(); // consume response data to free up memory
        return;
    }
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        debug('Got response');
        try {
            const jsonData = JSON.parse(rawData);
            updateDatabase(jsonData);
        }
        catch (err) {
            debug('JSON parse error: ' + err.message);
        }
    });
}).on('error', (err) => {
    debug('Request error: ' + err.message);
});
function updateDatabase(jsonData) {
    // see if the data makes sense
    let error;
    if (typeof jsonData.rates === 'undefined')
        error = new Error('No rates supplied');
    else if (typeof jsonData.date !== 'string')
        error = new Error('No date supplied');
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(jsonData.date))
        error = new Error('Unrecognized date format');
    if (error) {
        debug(error.message);
        return;
    }
    // set up the database configuration options
    const options = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    };
    if (typeof process.env.DB_SOCKET_PATH !== 'undefined')
        options.socketPath = process.env.DB_SOCKET_PATH;
    else if (typeof process.env.DB_HOST !== 'undefined')
        options.host = process.env.DB_HOST;
    let connection;
    mysql.createConnection(options)
        .then((con) => {
        connection = con; // store for later
        // find out which currencies need updating
        const sqlSelect = "SELECT code FROM currencies WHERE NOT code = 'USD'";
        return connection.query(sqlSelect);
    }).then((currencies) => {
        const sqlUpdate = 'UPDATE currencies SET exchange_rate = ?, modified = NOW() WHERE code = ?';
        const promises = [];
        // update the currencies in parallel
        for (const currency of currencies) {
            if (typeof jsonData.rates[currency.code] !== 'number') {
                debug(`${currency.code} not found`);
                continue;
            }
            const rate = jsonData.rates[currency.code];
            debug(`Updating ${currency.code}: ${rate}`);
            if (typeof process.env.TESTING === 'undefined')
                promises.push(connection.query(sqlUpdate, [rate, currency.code]));
        }
        // wait for all of the updates
        return Promise.all(promises);
    }).catch((err) => {
        debug('Database error: ' + err.message);
    }).then(() => {
        if (connection && connection.end)
            connection.end();
    });
}
