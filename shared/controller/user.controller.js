const express = require('express');
const userService = require('../service/user.service');

const router = express.Router();

router.post('', (req, res) => create(req, res));
router.get('', (req, res) => getAll(req, res));

const create = (req, res) => {

}

const getAll = async (req, res) => {
    const userList = await userService.getAll();
    res.send(userList);
}

module.exports = router;