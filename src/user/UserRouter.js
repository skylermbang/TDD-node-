
//express
const express = require("express");
const router = express.Router();

// user schema

// helper
const { check, validationResult } = require('express-validator')
//service logic
const UserService = require("./UserService");



// user API post
router.post("/",
    check('username')
        .notEmpty()
        .withMessage("Username cannot be null")
        .bail()
        .isLength({ min: 4, max: 32 })
        .withMessage('Must have min 4 and max 32 characters'),

    check('email')
        .notEmpty()
        .withMessage("E-mail cannot be null")
        .bail()
        .isEmail().withMessage('E-mail is not valid')
        .bail()
        .custom(async (email) => {
            const user = await UserService.findByEmail(email)
            if (user) {
                throw new Error('E-mail in use')
            }
        }),

    check('password')
        .notEmpty()
        .withMessage("password cannot be null")
        .bail()
        .isLength({ min: 6, })
        .withMessage('password must be at least 6 characters')
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/).withMessage('password must be at least 1 uppercase , 1 lowercase , 1 number')
    , async (req, res) => {
        // 3ways to make user object

        //const user = Object.assign({}, req.body, {password: hash})

        // const user = {
        //     username: req.body.username,
        //     email: req.body.email,
        //     password: hash,
        // };

        // let hash = await bcrypt.hash(req.body.password, 10);
        // const user = { ...req.body, password: hash };
        // await User.create(user);

        // const errors = validationResult(req)
        // if (!errors.isEmpty()) {
        //     const validationErrors = {}
        //     errors.array().forEach((element) => (validationErrors[element.param] = element.msg));
        //     return res.status(400).json({ validationErrors });
        // }
        // try {
        //     await UserService.save(req.body);
        //     return res.status(200).json({ message: "User Created" });
        // } catch (error) {
        //     return res.status(502).send({ validationErrors: { email: 'E-mail in use' } })
        // }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const validationErrors = {}
            errors.array().forEach((element) => (validationErrors[element.param] = element.msg));
            return res.status(400).json({ validationErrors });
        }
        try {
            await UserService.save(req.body);
            return res.send({ message: 'user_create_success' });
        }
        catch (error) {
            return res.status(502).send({ validationErrors: { email: 'E-mail in use' } })
        }
    });

router.post('/api/1.0/users/token/:token', async (req, res) => {
    console.log(" this is activate api")
    const { token } = req.params;
    await UserService.activate(token);
    res.send()
})
module.exports = router;
