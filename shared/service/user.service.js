const db = require('./db.service');
const { USER_COLLECTION } = require('../constants/constants');
const { ObjectId } = require('mongodb');

USER_EXIST =  "Usuário já existe";


const getByEmail = async (email) => {
    return await db.getMainDB().then(conn => {
        return conn.collection(USER_COLLECTION).findOne({ "email": { $eq: email } });
    })
};

const getAll = async () => {
    return await db.getMainDB().then(conn => {
        return conn.collection(USER_COLLECTION).find().toArray();
    })
};

const getById = async (id) => {
    return await db.getMainDB().then(conn => {
        return conn.collection(USER_COLLECTION).findOne({ _id: ObjectId(id) }).then(user => {
            return user;
        })
    })
}

const create = async (user) => {
    const userDB = await getByEmail(user.email);
    if (userDB) {
        throw USER_EXIST;
    }
    await db.getMainDB().then(conn => {
        conn.collection(USER_COLLECTION).insertOne(user);
    })
};

const update = async (user) => {
    const userDB = await getByEmail(user.email);
    if (userDB && user._id != userDB._id) {
        throw USER_EXIST;
    }
    await db.getMainDB().then(conn => {
        conn.collection(USER_COLLECTION).updateOne(
            { _id: user._id },
            { $set: user }
        )
    })
};

module.exports = { getAll, create, update, getById }