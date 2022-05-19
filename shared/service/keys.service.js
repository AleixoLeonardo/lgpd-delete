
const db = require('./db.service');
const { KEYS_COLLECTION } = require('../constants/constants');
const { ObjectId } = require('mongodb');

const createKey = (key, user) => {
    db.getMainDB().then(conn => {
        conn.collection(KEYS_COLLECTION).insertOne({
            key,
            user
        });
    })
};

const getKeyByUser = (user) => {
    return db.getMainDB().then(conn => {
        return conn.collection(KEYS_COLLECTION).findOne({ user: user }).then(key => {
            return key;
        });
    });
};


const deleteByUser = async (key) => {
    const conn = await db.getMainDB();
    await conn.collection(KEYS_COLLECTION).deleteOne({ user: { $eq: ObjectId(key)} });
};


const deleteByKey = async (key) => {
    const conn = await db.getMainDB();
    await conn.collection(KEYS_COLLECTION).deleteOne({ key: { $eq: key} });
};

module.exports = { createKey, getKeyByUser, deleteByKey, deleteByUser };