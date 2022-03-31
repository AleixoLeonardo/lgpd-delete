const { MongoClient, ServerApiVersion } = require('mongodb');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));

const connect = async () => {
    const uri = config.Cluster0.URL
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    return await client.connect();
}

const getMainDB = async () => {
    return await connect().then(client => {
        return client.db(config.Cluster0.name);
    })
}

const getPrimaryBackup = async () => {
    return await connect().then(client => {
        return client.db(config.Cluster1.name);
    })
}

const getSecondaryBackup = async () => {
    return await connect().then(client => {
        return client.db(config.Cluster2.name);
    })
}

module.exports = { getMainDB, getPrimaryBackup, getSecondaryBackup };