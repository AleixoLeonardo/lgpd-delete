const db = require('./db.service');
const { USER_COLLECTION } = require('../constants/constants');
const { ObjectId } = require('mongodb');
const queue = require("../rabbitmq/queue");
const { RABBITMQ_INSERT, RABBITMQ_UPDATE } = require('../constants/rabbitmq.queue');

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

// CREATE
const create = async (user) => {
    const userDB = await getByEmail(user.email);
    if (userDB) {
        throw USER_EXIST;
    }
    createOnDefault(user);
};


const createOne = (conn, user) => {
    conn.collection(USER_COLLECTION).insertOne(user);
};

const createOnPrimary = async (user) => {
    await db.getPrimaryBackup().then(conn => {
        createOne(conn, user);
    })
};

const createOnSecondary = async (user) => {
    await db.getSecondaryBackup().then(conn => {        
        createOne(conn, user);
    })
};

const createOnDefault = async (user) => {
    await db.getMainDB().then(conn => {
        createOne(conn, user);
        sendToRabbit(user, RABBITMQ_INSERT);
    })
};

// UPDATES BD

const update = async (user, db) => {
    const userDB = await getByEmail(user.email);
    if (userDB && user._id != userDB._id) {
        throw USER_EXIST;
    }
    updateDefault(user);
};

const updateOne = (conn, user) => {
    conn.collection(USER_COLLECTION).updateOne(
        { _id: user._id },
        { $set: user }
    );
}

const updateOnPrimary = async (user) => {
    await db.getPrimaryBackup().then(conn => {
        updateOne(conn, user);
    });
};

const updateOnSecondary = async (user) => {
    await db.getSecondaryBackup().then(conn => {
        updateOne(conn, user);
    });
};

const updateDefault = async (user) => {
    await db.getPrimaryBackup().then(conn => {
        updateOne(conn, user);
        sendToRabbit(user, RABBITMQ_UPDATE);
    });
}

// SEND RABBIT
const sendToRabbit = (user, queue_to_send) => {
    queue.sendToQueue(queue_to_send, user);
};

// SIMULATE 
const simulateInsert = () => {
    queue.consume(RABBITMQ_INSERT, (message) => {
        createOnPrimary(remapUser(message.content.toString()));
        createOnSecondary(remapUser(message.content.toString()));
    });
};

const remapUser = (userJson) => {
   const user = JSON.parse(userJson);
   return  {
    email: user.email,
    name: user.name,
    lastName: user.lastName,
    birthDate: user.birthDate,
    cpf: user.cpf,
    rg: user.rg,
    father: user.pai,
    mother: "Maria"
   };
};

module.exports = { getAll, create, update, getById, simulateInsert };