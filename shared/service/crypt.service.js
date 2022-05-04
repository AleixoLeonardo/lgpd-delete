const crypto = require('crypto');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));

const encrypt = (text, secretKey) => {
    const algorithm = config.algorithm;
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, `${secretKey}`, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

const decrypt = async (hash, secretKey) => {
    const algorithm = config.algorithm;
    const decipher = await crypto.createDecipheriv(algorithm, `${secretKey}`, Buffer.from(hash.iv, config.type));

    const decrpyted = await Buffer.concat([decipher.update(Buffer.from(hash.content, config.type)), decipher.final()]);

    return decrpyted.toString();
};

module.exports = { encrypt, decrypt };