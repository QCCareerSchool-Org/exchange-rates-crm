import * as Debug from 'debug';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as mysql from 'promise-mysql';

const debug = Debug('index');

dotenv.config();

// set up the database configuration options
const options: mysql.ConnectionConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

if (typeof process.env.DB_SOCKET_PATH !== 'undefined') // prefer a socketPath
    options.socketPath = process.env.DB_SOCKET_PATH;
else if (typeof process.env.DB_HOST !== 'undefined') // but use a host otherwise
    options.host = process.env.DB_HOST;

mysql.createConnection(options)
.then((connection) => {

    // get a GET request for the currency data
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

            try {

                // find out which currencies need updating
                const sqlSelect = "SELECT code FROM currencies WHERE NOT code = 'USD'";
                const currencies = await connection.query(sqlSelect);

                const sqlUpdate = 'UPDATE currencies SET exchange_rate = ?, modified = NOW() WHERE code = ?';

                const promises: Array<Promise<any>> = [];

                // update the currencies in parallel
                for (const currency of currencies)
                    if (typeof jsonData.rates[currency.code] === 'number') {
                        const rate = jsonData.rates[currency.code];
                        if (typeof process.env.TESTING !== 'undefined')
                            debug(`Not really updating ${currency.code}`);
                        else {
                            promises.push(connection.query(sqlUpdate, [ rate, currency.code ]));
                            debug(`Updated ${currency.code}: ${rate}`);
                        }
                    } else
                        debug(`${currency.code} not found`);

                // wait for all of the updates
                await Promise.all(promises);

                // close the connection
                connection.end();

            } catch (err) {
                debug(err);
            }

        });

    }).on('error', (err) => {
        debug(err);
    });

});
