// const Sequelize = require("sequelize");
// const sequelize = require("../config/database");
// const Model = Sequelize.Model;
// eslint-disable-next-line prettier/prettier

const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");
class User extends Model { }

User.init(
    {
        //attributes
        username: { type: DataTypes.STRING },
        email: {
            type: DataTypes.STRING,
            unique: true
        },
        password: { type: DataTypes.STRING },
        inactive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        activationToken: {
            type: Sequelize.STRING,
        },
    },
    {
        //options
        sequelize,
        modelName: "user",
    }
);

module.exports = User;
