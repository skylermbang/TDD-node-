const Sequelize = require("sequelize");
const config = require("config");
const dbConfig = config.get("database");
//  1. db name , 2. user name , 3.db password
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    dialect: dbConfig.dialect,
    storage: dbConfig.storage,
    logging: dbConfig.logging,
});

module.exports = sequelize;
