const db = require('./db.service');
const { USER_COLLECTION } = require('../constants/constants');
const { ObjectId } = require('mongodb');
const queue = require("../rabbitmq/queue");
const { RABBITMQ_INSERT, RABBITMQ_UPDATE } = require('../constants/rabbitmq.queue');
const { PRIMARY, SECONDARY, DEFAULT } = require('../constants/cluster');

USER_EXIST =  "Usuário já existe";

const getByEmail = async (email, cluster) => {
    if (cluster == PRIMARY) {
        return await db.getPrimaryBackup().then(conn => {
            return conn.collection(USER_COLLECTION).findOne({ "email": { $eq: email } });
        })
    } else if (cluster == SECONDARY) {
        return await db.getSecondaryBackup().then(conn => {
            return conn.collection(USER_COLLECTION).findOne({ "email": { $eq: email } });
        })
    } else {
        return await db.getMainDB().then(conn => {
            const user = conn.collection(USER_COLLECTION).findOne({ "email": { $eq: email } });
            return user;
        })
    }
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
    const userDB = await getByEmail(user.email, DEFAULT);
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

const update = async (user) => {
    const userDB = await getByEmail(user.email, DEFAULT);
    if (userDB && user._id != userDB._id) {
        throw USER_EXIST;
    }
    updateDefault(user, false);
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

const updateDefault = async (user, isGhost) => {
    await db.getMainDB().then(conn => {
        updateOne(conn, user);
        if (!isGhost) {
            sendToRabbit(user, RABBITMQ_UPDATE);
        }
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



const deleteByEmail = async (email) => {
    let userSecondaryBackup = await getByEmail(email, SECONDARY);
    let userPrimaryBackup = await getByEmail(email, PRIMARY);
    let userDefault = await getByEmail(email, DEFAULT);
    updateOnSecondary(rebuildUser(userSecondaryBackup));
    updateOnPrimary(rebuildUser(userPrimaryBackup));
    updateDefault(rebuildUser(userDefault), true);
    return [userSecondaryBackup, userPrimaryBackup, userDefault];
};

const rebuildUser = (user) => {
    return {
        _id: new ObjectId(user._id),
        email: "system.ghost@g.com",
        name: "ghost",
        lastName: "system",
        birthDate: user.birthDate,
        cpf: "000.000.000-00",
        rg: "00.000.000-2",
        father: "Ghost Fateher",
        mother: "Ghost Mother",
        purchase: user.purchase
    };
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
    father: user.father,
    mother: user.mother,
    purchase: user.purchase
   };
};

module.exports = { getAll, create, update, getById, simulateInsert, deleteByEmail };