const express = require('express');
const userService = require('../service/user.service');

const router = express.Router();

router.post('', (req, res) => create(req, res));
router.get('', (req, res) => getAll(req, res));
router.put('', (req, res) => update(req, res));
router.get('/:id', (req, res) => getById(req, res));
router.get('/delete/email/:email', (req, res) => deleteByEmail(req, res));
router.get('/simulate/insert', (req, res) => simulateInsert(req, res));

//POST
const create = (req, res) => {
    userService.create(req.body).then(_ => {
        res.status(201).send("ok");
    }).catch(error => {
        res.status(500).send(error);
    })
};

//PUT
const update = async (req, res) => {
    userService.update(req.body).then(_ => {
        res.status(201).send("ok");
    }).catch(error => {
        res.status(500).send(error);
    })
};

//DELETE
const deleteByEmail = async (req, res) => {
    const result = await userService.deleteByEmail(req.params["email"]);
    res.status(201).send(result);
};

//GET

const getAll = async (req, res) => {
    res.send(await userService.getAll());
};

const getById = async (req, res) => {
    res.send(await userService.getById(req.params["id"]));
};

const simulateInsert = async (erq, res) => {
    userService.simulateInsert();
};

module.exports = router;