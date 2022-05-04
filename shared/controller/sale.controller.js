const express = require('express');
const saleService = require('../service/sale.service');

const router = express.Router();

router.post('', (req, res) => create(req, res));

const create = (req, res) => {
    saleService.createSale(req.body).then(sale => {
        res.status(201).send(sale);
    }).catch(error => {
        res.status(500).send(error);
    })
};

module.exports = router;