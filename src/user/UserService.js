

// user schema
const User = require("./User");

// helper
const bcrypt = require("bcrypt");
const crypto = require('crypto');

//email service
const EmailService = require('../email/emailService')
const EmailExceptrion = require('../email/emailExceptrion')

//sequelize
const sequelize = require('../config/database')

const generateToken = (length) => {
    return crypto.randomBytes(length).toString('hex').substring(0, length)
}


const save = async (body) => {
    const { username, email, password } = body
    let hash = await bcrypt.hash(password, 10);
    const user = { username, email, password: hash, activationToken: generateToken(16) };
    const transaction = await sequelize.transaction();
    await User.create(user, { transaction });
    try {
        await EmailService.sendAccountActivation(email, user.activationToken);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw new Error(error);
    }
};

const findByEmail = async (email) => {
    return await User.findOne({ where: { email } })
}

const activate = async (token) => {

    const user = await User.findOne({ where: { activationToken: token } });
    if (!user) {
        console.log(" cant find ")
    }
    user.inactive = false;
    await user.save()
}

module.exports = { save, findByEmail, activate };
