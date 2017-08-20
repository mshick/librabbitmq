import test from 'ava';
import {
  constants,
  createConnection,
  closeConnection,
  addSubscriber,
  publishMessage,
  addWorker,
  pushTask
} from '../src/index';

const {RABBITMQ_USER, RABBITMQ_PASSWORD} = process.env;
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@localhost/`;

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const getRandomInt = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
};

const CONFIG = {
  url: RABBITMQ_URL
};

test.before('create connection', async t => {
  try {
    return createConnection(CONFIG);
  } catch (err) {
    t.fail(err);
  }
});

test.always.after('close connection', async () => {
  return closeConnection();
});

test('pubsub', async t => {
  let message;

  const subscriber = function ({payload}) {
    return new Promise(resolve => {
      resolve(constants.ACK);
      t.is(payload, message);
      t.pass();
    });
  };

  try {
    await addSubscriber({
      exchange: 'pubsub',
      subscriber
    });

    message = getRandomInt(500, 5000);

    await publishMessage({
      exchange: 'pubsub',
      topic: 'request',
      payload: message
    });

    await sleep(500);
  } catch (err) {
    t.fail(err);
  }
});

test('task queue', async t => {
  const queue = 'work';
  const type = 'test';

  let correlationId;
  let payload;

  const worker = function (task) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(constants.ACK);
        t.is(task.properties.correlationId, correlationId);
        t.is(task.payload, payload);
        t.pass();
      }, 500);
    });
  };

  try {
    await addWorker({
      queue,
      worker
    });

    correlationId = String(getRandomInt(500, 5000));
    payload = getRandomInt(500, 5000);

    await pushTask({
      queue,
      type,
      correlationId,
      payload
    });

    await sleep(1000);
  } catch (err) {
    t.fail(err);
  }
});
