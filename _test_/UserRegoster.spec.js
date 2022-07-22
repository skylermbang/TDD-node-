//test()  you can use it
const request = require("supertest");

const app = require("../app");

it("return 200 OK when singup request is vaild", () => {
    request(app)
        .post("/api/v1.0/users")
        .send({
            username: "user1",
            email: "user1@mail.com",
            password: "Password4",
        })
        .expect(200);
});
