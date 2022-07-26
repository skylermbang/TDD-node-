/* eslint-disable prettier/prettier */
// you can use test()
const app = require("../src/app");

//helper
const request = require("supertest");
// const nodemailerStub = require('nodemailer-stub')
const SMTPServer = require('smtp-server').SMTPServer;


//db
const sequelize = require("../src/config/database")
const User = require("../src/user/User");



let lastMail, server
let simulateSmtpFailure = false;

// before the test initializing the database
beforeAll(async () => {
    server = new SMTPServer({
        authOptional: true,
        onData(stream, session, callback) {
            let mailBody;
            stream.on('data', (data) => {
                mailBody += data.toString();
            });
            stream.on('end', () => {
                if (simulateSmtpFailure) {
                    const err = new Error('Invalid mailbox');
                    err.responseCode = 553;
                    return callback(err);
                }
                lastMail = mailBody;
                callback();
            });
        },
    });
    await server.listen(8587, 'localhost');
    jest.setTimeout(20000);

    await sequelize.sync()
});

afterAll(async () => {
    await server.close()
    // jest.setTimeout(5000);
})

// before each of test
beforeEach(async () => {
    simulateSmtpFailure = false;
    await User.destroy({ truncate: true })
})

const validUser = {
    username: "user1",
    email: "user1@mail.com",
    password: "Password123!",
}

const postUser = (user = validUser) => {
    return request(app).post('/api/1.0/users').send(user)
}

describe("User Registration", () => {

    it("returns 200 OK when signup request is valid", async () => {
        let response = await postUser();
        expect(response.status).toBe(200);
    });

    it("returns sucess message when singUp request is valid", async () => {
        let response = await postUser();
        expect(response.body.message).toBe("User Created");
    });

    it("saves the user to database", async () => {
        await postUser();
        let userList = await User.findAll();
        expect(userList.length).toBe(1);

    });

    it("saves the username and email to database", async () => {
        await postUser();
        let userList = await User.findAll();
        const savedUser = userList[0];
        expect(savedUser.username).toBe("user1");
        expect(savedUser.email).toBe("user1@mail.com");

    });

    it("hashes the password in database", async () => {
        await postUser();
        let userList = await User.findAll();
        const saveUser = userList[0]
        expect(saveUser.password).not.toBe("Password123!")
    })


    it("returns 400 when username is null", async () => {
        let response = await postUser({
            username: null,
            email: "user1@mail.com",
            password: "Password123!",
        });
        expect(response.status).toBe(400)
    })

    it('returns validationErrors field in response body when validation error occurs', async () => {
        let response = await postUser({
            username: null,
            email: "user1@mail.com",
            password: "Password123!",
        });
        const body = response.body
        expect(body.validationErrors).not.toBeUndefined()
    })


    it('returns errors for both when username and email are null', async () => {
        let response = await postUser({
            username: null,
            email: null,
            password: "Password123!",
        });
        const body = response.body;
        expect(Object.keys(body.validationErrors)).toEqual([
            'username', 'email'
        ])
    })




    it.each`
    field         |    value                 |expectedMessage
    ${'username'} |  ${null}                 |${'Username cannot be null'}
    ${'username'} |  ${'use'}                |${'Must have min 4 and max 32 characters'}
    ${'username'} |  ${'a'.repeat(44)}       |${'Must have min 4 and max 32 characters'}
    ${'email'}    |  ${null}                 |${'E-mail cannot be null'}
    ${'email'}    |  ${'mail.com'}           |${'E-mail is not valid'}
    ${'email'}    |  ${'user.mail.com'}      |${'E-mail is not valid'}
    ${'email'}    |  ${'user@mail'}          |${'E-mail is not valid'}
    ${'password'} |  ${null}                 |${'password cannot be null'}
    ${'password'} |  ${'P4ssw'}              |${'password must be at least 6 characters'}
    ${'password'} |  ${'alllowercase'}       |${'password must be at least 1 uppercase , 1 lowercase , 1 number'}
    ${'password'} |  ${'ALLUPPERCASE'}       |${'password must be at least 1 uppercase , 1 lowercase , 1 number'}
    ${'password'} |  ${'123123123123'}       |${'password must be at least 1 uppercase , 1 lowercase , 1 number'}
    ${'password'} |  ${'123123aaa'}          |${'password must be at least 1 uppercase , 1 lowercase , 1 number'}
    ${'password'} |  ${'1231231AAAA23123'}   |${'password must be at least 1 uppercase , 1 lowercase , 1 number'}
    ${'password'} |  ${'AAAAaaaaa'}          |${'password must be at least 1 uppercase , 1 lowercase , 1 number'}
    `('returns $expectedMessage when $field is null', async ({ field, expectedMessage, value }) => {
        const user = {
            username: "user1",
            email: "user1@email.com",
            password: "Password123!"
        }
        user[field] = value
        const response = await postUser(user)
        const body = response.body
        expect(body.validationErrors[field]).toBe(expectedMessage)
    })


    it('returns E-mail in use when same email is already in use', async () => {
        await User.create({ ...validUser })
        const response = await postUser()
        expect(response.body.validationErrors.email).toBe("E-mail in use")
    })




    it('returns errors for both username is null and email is in use', async () => {
        await User.create({ ...validUser });
        const response = await postUser({
            username: null,
            email: validUser.email,
            password: 'P4ssword',
        });

        const body = response.body; // why we have to make this ?  
        expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
    });



    it('creates user in inactive mode', async () => {
        await postUser();
        const users = await User.findAll();
        const savedUser = users[0];
        expect(savedUser.inactive).toBe(true);
    })


    it('creates user in inactive mode even the requset body contains inactive ', async () => {

        const newUser = { ...validUser, inactive: false };
        await postUser(newUser);
        const users = await User.findAll();
        const savedUser = users[0];
        expect(savedUser.inactive).toBe(true);
    })



    it('creates an activation token for user', async () => {
        await postUser();
        const users = await User.findAll();
        const savedUser = users[0];
        expect(savedUser.activationToken).toBeTruthy();
    })

    // use fit to test to skip other test 
    it('sends and account activation email with activationtoken', async () => {
        await postUser();
        // const lastMail = nodemailerStub.interactsWithMail.lastMail()
        // expect(lastMail.to[0]).toContain("user1@mail.com")
        const users = await User.findAll();
        const savedUser = users[0];
        // expect(lastMail.content).toContain(savedUser.activationToken)
        expect(lastMail).toContain("user1@mail.com")
        expect(lastMail).toContain(savedUser.activationToken)
    })

    it('return 502 bad gateway when sending email fails', async () => {
        // const mockSendAccountActivation = jest.spyOn(EmailService, "sendAccountActivation").mockRejectedValue({ message: 'Failed to deliver email' })
        simulateSmtpFailure = true;
        const response = await postUser();
        expect(response.status).toBe(502)
        // mockSendAccountActivation.mockRestore()
    })

    it('returns email failure msg when sending email fails', async () => {

        simulateSmtpFailure = true;
        // const mockSendAccountActivation = jest.spyOn(EmailService, "sendAccountActivation").mockRejectedValue({ message: 'Failed to deliver email' })
        const response = await postUser();
        // mockSendAccountActivation.mockRestore()
        expect(response.body.validationErrors.email).toBe("E-mail in use")

    })

    it('it dose not save use to database if  activation email fails', async () => {
        // const mockSendAccountActivation = jest.spyOn(EmailService, "sendAccountActivation").mockRejectedValue({ message: 'Failed to deliver email' })
        simulateSmtpFailure = true;
        await postUser();
        // mockSendAccountActivation.mockRestore()
        const users = await User.findAll()

        expect(users.length).toBe(0)

    })

})



describe('Account activation', () => {
    it('activates the account when correct token is sent', async () => {
        await postUser();
        let users = await User.findAll();
        const token = users[0].activationToken;
        // console.log(token)
        await request(app)
            .post('/api/1.0/users/token/' + token)
            .send();
        users = await User.findAll();
        expect(users[0].inactive).toBe(false);
    });

})

   // it('returns size validation error when username is less than 4 characters error when username is less than 4 characters ', async () => {
    //     const user = {
    //         username: "us",
    //         email: "user1@email.com",
    //         password: "Password123!"
    //     }
    //     const response = await postUser(user)

    //     const body = response.body
    //     expect(body.validationErrors.username).toBe('Must have min 4 and max 32 characters')
    // })
    // it.each([
    //     ['username', 'Username cannot be null'],
    //     ['email', 'E-mail cannot be null'],
    //     ['password', 'password cannot be null']
    // ]

    // )('when %s is null %s is recived', async (field, expectedMessage) => {

    //     const user = {
    //         user: "user1",
    //         email: "user1@email.com",
    //         password: "Password123!"
    //     }
    //     user[field] = null;
    //     const response = await postUser(user)
    //     const body = response.body
    //     expect(body.validationErrors[field]).toBe(expectedMessage)

    // })




    // this part change to dynamic teset
    // it('returns Username cannot be null when username is null', async () => {
    //     let response = await postUser({
    //         username: null,
    //         email: "user1@mail.com",
    //         password: "Password123!",
    //     });
    //     const body = response.body;
    //     expect(body.validationErrors.username).toBe("Username cannot be null")
    // })

    // it('returns E-mail cant no be null when email is null', async () => {
    //     let response = await postUser({
    //         username: "user1",
    //         email: null,
    //         password: "Password123!",
    //     });
    //     const body = response.body;
    //     expect(body.validationErrors.email).toBe("E-mail cannot be null")
    // })

    // it('returns password can not be null when password is null', async () => {
    //     let response = await postUser({
    //         username: 'user1',
    //         email: 'user1@emial.com',
    //         password: null,
    //     });
    //     const body = response.body;
    //     expect(body.validationErrors.password).toBe("password cannot be null")
    // })

    // using then
    // it("hashes the password in database by promise", (done) => {
    //     postUser().then(() => {
    //         User.findAll().then((userList) => {
    //             const saveUser = userList[0]
    //             expect(saveUser.password).not.toBe("Password123!")
    //             done()
    //         })
    //     })
    // })






