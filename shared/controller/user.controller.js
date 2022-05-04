const express = require('express');
const userService = require('../service/user.service');

const router = express.Router();

router.post('', (req, res) => create(req, res));
router.get('', (req, res) => getAll(req, res));
router.put('', (req, res) => update(req, res));
router.get('/:id', (req, res) => getById(req, res));
router.get('/delete/email/:cpf/:rg', (req, res) => deleteByEmail(req, res));
router.get('/simulate/insert', (req, res) => simulateInsert(req, res));

//POST
const create = (req, res) => {
    userService.create(req.body).then(user => {
        res.status(201).send(user);
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
    try {
        await userService.deleteByCpfRg(req.params["cpf"], req.params["rg"]);
        res.status(201).send("DELETADO COM SUCESSO!");
    } catch (e) {
        res.status(500).send("FALHA AO DELETAR");
    }
    
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