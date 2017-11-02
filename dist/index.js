"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const dotenv = require("dotenv");
const https = require("https");
const mysql = require("promise-mysql");
const debug = Debug('index');
dotenv.config();
const options = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};
if (typeof process.env.DB_SOCKET_PATH !== 'undefined')
    options.socketPath = process.env.DB_SOCKET_PATH;
else if (typeof process.env.DB_HOST !== 'undefined')
    options.host = process.env.DB_HOST;
mysql.createConnection(options)
    .then((connection) => {
    const url = 'https://api.fixer.io/latest?base=USD';
    https.get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });
        resp.on('end', async () => {
            const jsonData = JSON.parse(data);
            if (typeof jsonData.rates === 'undefined')
                throw new Error('No rates supplied');
            const sqlSelect = "SELECT code FROM currencies WHERE NOT code = 'USD'";
            try {
                const currencies = await connection.query(sqlSelect);
                const sqlUpdate = 'UPDATE currencies SET exchange_rate = ?, modified = NOW() WHERE code = ?';
                const promises = [];
                for (const currency of currencies)
                    if (typeof jsonData.rates[currency.code] === 'number') {
                        const rate = jsonData.rates[currency.code];
                        if (typeof process.env.TESTING !== 'undefined')
                            debug(`Not really updating ${currency.code}`);
                        else {
                            promises.push(connection.query(sqlUpdate, [rate, currency.code]));
                            debug(`Updated ${currency.code}: ${rate}`);
                        }
                    }
                    else
                        debug(`${currency.code} not found`);
                await Promise.all(promises);
                connection.end();
            }
            catch (err) {
                debug(err);
            }
        });
    }).on('error', (err) => {
        debug(err);
    });
});
