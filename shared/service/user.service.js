const db = require('./db.service');
const { USER_COLLECTION } = require('../constants/constants');


const getAll = async () => {
    return await db.getMainDB().then(conn => {
        console.log(USER_COLLECTION)
        return conn.collection(USER_COLLECTION).find().toArray();
    })
}

module.exports = { getAll }