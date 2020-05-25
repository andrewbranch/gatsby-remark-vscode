// @ts-check
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const createClient = require('./client');
const createServer = require('./server');
const query = fs.readFileSync(path.join(__dirname, 'query.graphql'), 'utf8');

describe('GraphQL resolvers', () => {
  let server;
  beforeAll(async () => {
    server = await createServer();
  }, 20e3);

  afterAll(() => {
    server && server.kill();
  });

  const client = createClient();
  const cases = glob.sync('cases/**/test.md', { cwd: path.resolve(__dirname, '..') }).map(name => {
    return name.slice('cases/'.length, name.length - '/test.md'.length);
  });

  it.each(cases)('%s', async name => {
    const fileAbsolutePath = path.resolve(__dirname, `../cases/${name}/test.md`);
    const response = await client.request(query, { fileAbsolutePath });
    expect(response).toMatchSnapshot();
  });
});
