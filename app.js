const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const userController = require('./shared/controller/user.controller');
const saleController = require('./shared/controller/sale.controller');

module.exports = () => {
    const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));
    const app = express();

    app.set('port', process.env.PORT || config.server.port);

    app.use(bodyParser.json());
    app.use("/user", userController);
    app.use("/sale", saleController);


    return app;
};
