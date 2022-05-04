
const db = require('./db.service');
const { SALE_COLLECTION } = require('../constants/constants');
const { ObjectId } = require('mongodb');
const queue = require("../rabbitmq/queue");
const { RABBITMQ_INSERT } = require('../constants/rabbitmq.queue');



const createSale = (sale) => {
    simulateInsert();
    return createOnDefault(sale);
};


const createOnDefault = async (sale) => {
    return db.getMainDB().then(conn => {
        return createOne(conn, sale).then(saleInserted => {
            sale._id = ObjectId(saleInserted.insertedId);
            sendToRabbit(sale, RABBITMQ_INSERT);
            return saleInserted;
        });
    }).catch(e => {
        console.log(e)
    })
};

const sendToRabbit = (sale, queue_to_send) => {
    queue.sendToQueue(queue_to_send, sale);
};

const createOne = (conn, sale) => {
    return conn.collection(SALE_COLLECTION).insertOne(sale);
};

const createOnPrimary = async (sale) => {
    await db.getPrimaryBackup().then(conn => {
        createOne(conn, sale);
    })
};

const createOnSecondary = async (sale) => {
    await db.getSecondaryBackup().then(conn => {        
        createOne(conn, sale);
    })
};

const getById = (id) => {
    return db.getMainDB().then(conn => {
        return conn.collection(SALE_COLLECTION).findOne({ _id: ObjectId(id) }).then(sale => {
            return sale;
        })
    })
};

const getAllByUser = (userId) => {
    return db.getMainDB().then(conn => {
        return conn.collection(SALE_COLLECTION).find({ user: { $qe: userId } }).toArray();
    });
};

const simulateInsert = () => {
    queue.consume(RABBITMQ_INSERT, (message) => {
        createOnPrimary(remapSale(message.content.toString()));
        createOnSecondary(remapSale(message.content.toString()));
    });
};

const remapSale = (saleJson) => {
    const sale = JSON.parse(saleJson);
    return  {
     name: sale.name,
     price: sale.price,
     user: sale.user
    };
 };


module.exports = { createSale, getById, getAllByUser };