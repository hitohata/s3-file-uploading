import { Hono } from 'hono';
import { handle } from "hono/aws-lambda";

const app = new Hono();

app.get('/', (c) => {
    const domainName = process.env.DOMAIN_NAME!;
    console.log(domainName);
    const url = `https://${domainName}/images/sample/sample.jpg`
    return c.text(url)
})

app.post("/upload/:id", async (c) => {
    const body = await c.req.parseBody();
    return c.json({ message: "Hello Hono!" });
})

export const handler = handle(app)