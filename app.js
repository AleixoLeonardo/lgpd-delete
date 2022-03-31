const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const userController = require('./shared/controller/user.controller');

module.exports = () => {
    const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));
    const app = express();

    // SETANDO VARIÁVEIS DA APLICAÇÃO
    app.set('port', process.env.PORT || config.server.port);

    // MIDDLEWARES
    app.use(bodyParser.json());
    app.use("/user", userController);

    return app;
};