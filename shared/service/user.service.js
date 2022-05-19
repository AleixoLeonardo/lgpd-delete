const db = require('./db.service');
const { USER_COLLECTION } = require('../constants/constants');
const { ObjectId } = require('mongodb');
const queue = require("../rabbitmq/queue");
const { RABBITMQ_INSERT, RABBITMQ_UPDATE } = require('../constants/rabbitmq.queue');
const { PRIMARY, SECONDARY, DEFAULT } = require('../constants/cluster');
const cryptService = require('./crypt.service');
const keysService = require('./keys.service');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));

USER_EXIST =  "Usuário já existe";
const baseKey = '00000000000';

const getByEmail = async (email, cluster) => {
    const hashed = await cryptService.encrypt(email, config.keyEmail);
    let conn = null;
    if (cluster == PRIMARY) {
        conn = await db.getPrimaryBackup();
        
    } else if (cluster == SECONDARY) {
        conn = await db.getSecondaryBackup();
    } else {
        conn = await db.getMainDB();
    }
    return await conn.collection(USER_COLLECTION).findOne({ "email": { "iv": hashed.content } });
};

const getAll = async () => {
    const conn = await db.getMainDB();
    const users = await conn.collection(USER_COLLECTION).find().toArray();
    var results = await Promise.all(users.map(async (user) => {
        await translateUser(user)
        return user;
    }));
    return results;
};

const getById = async (id) => {
    return await db.getMainDB().then(conn => {
        return conn.collection(USER_COLLECTION).findOne({ _id: ObjectId(id) }).then(user => {
            return translateUser(user);
        })
    });
}

// CREATE
const create = async (user) => {
    const userDB = await getByEmail(user.email, DEFAULT);
    if (userDB) {
        throw USER_EXIST;
    }
    simulateInsert();
    const pass = `${user.cpf}@${user.rg}${baseKey}`;
    user = encryptSensibleData(user, pass);
    return await createOnDefault(user, pass);
};

const encryptSensibleData = (user, pass) => {
    try {
        user.email = cryptService.encrypt(user.email, config.keyEmail);
        user.name = cryptService.encrypt(user.name, pass);
        user.lastName = cryptService.encrypt(user.lastName, pass);
        user.cpf = cryptService.encrypt(user.cpf, pass);
        user.rg = cryptService.encrypt(user.rg, pass);
        user.father = cryptService.encrypt(user.father, pass);
        user.mother = cryptService.encrypt(user.mother, pass);
        return user;
    } catch (e) {
        console.log(e)
    }
    
};


const createOne = async (conn, user) => {
    return await conn.collection(USER_COLLECTION).insertOne(user);
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

const createOnDefault = async (user, pass) => {
    return await db.getMainDB().then(conn => {
        return createOne(conn, user).then(userInserted => {
            user._id = ObjectId(userInserted.insertedId);
            keysService.createKey(pass, user._id);
            sendToRabbit(user, RABBITMQ_INSERT);
            return userInserted;
        });
    });
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

const updateDefault = async (user, isGhost) => {
    await db.getMainDB().then(conn => {
        updateOne(conn, user);
        if (!isGhost) {
            sendToRabbit(user, RABBITMQ_UPDATE);
        }
    });
}

const translateUser = async (user) => {
    const keyObj = await keysService.getKeyByUser(user._id);
    if (keyObj) {
        const { key } = keyObj;
        user.email = await cryptService.decrypt(user.email, config.keyEmail);
        user.name = await cryptService.decrypt(user.name, key);
        user.lastName = await cryptService.decrypt(user.lastName, key);
        user.cpf = await cryptService.decrypt(user.cpf, key);
        user.rg = await cryptService.decrypt(user.rg, key);
        user.father = await cryptService.decrypt(user.father, key);
        user.mother = await cryptService.decrypt(user.mother, key);
    }
    return { ...user };
};

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



const deleteById = async (id) => {
    keysService.deleteByUser(id);
};

const remapUser = (userJson) => {
   const user = JSON.parse(userJson);
   return  {
    _id: user._id,       
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

module.exports = { getAll, create, update, getById, simulateInsert, deleteByCpfRg: deleteById };