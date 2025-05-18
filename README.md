# Easy Express Endpoints
A simple and fast way to create API-endpoints for express, where each endpoint is it's own class.

## Example

`ExampleEndpoint.ts`
```typescript
import { ValidationChain, body } from "express-validator";
import { GetEndpoint, RequestData } from "easy-express-endpoints";

type BodyData {
  id: number;
}

export class ExampleEndpoint extends GetEndpoint {
  constructor() {
    super('/example/endpoint/path');
    this.setAuthRequired(false);
  }

  protected getValidator(): ValidationChain[] {
    return [
      body('id').isInt({ min: 0 }).toInt()
    ]
  }

  protected async execute(data: RequestData<BodyData>): Promise<void> {
    // Handle request here
    return "Hello world!";
  }
}
```

`index.ts`
```typescript
import express, { Router } from 'express';
import http from 'http';

const PORT = 3000;
const app = express();
const server = http.createServer(app);

const apiRouter = Router();
const endpoint = new ExampleEndpoint();
endpoint.setupEndpoint(apiRouter);

app.use('/api', apiRouter);
server.listen(PORT);
```
