//express
const express = require("express");
const app = express();
app.use(express.json());

//router
const userRouter = require("./user/UserRouter");

app.use("/api/1.0/users", userRouter);

console.log("env : " + process.env.NODE_ENV);
module.exports = app;
