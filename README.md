librabbitmq [![Build Status](https://travis-ci.org/mshick/librabbitmq.svg?branch=master)](https://travis-ci.org/mshick/librabbitmq) [![npm version](https://badge.fury.io/js/librabbitmq.svg)](https://badge.fury.io/js/librabbitmq)
============

Easy to use methods implementing for common PubSub and task queue patterns with RabbitMQ.

Configuration
-------------

The plugin supports the following configuration (defaults shown):

```js
const config = {
  url: 'amqp://localhost',
  preserveChannels: true,
  connection: {
    socket: {},
    tuning: {},
    retry: {
      retries: 0,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: Infinity,
      randomize: false
    },
    useExisting: false
  },
  retryQueue: {
    suffix: '_retry',
    maxCount: 10,
    factor: 2,
    minTimeout: 1 * 1000,
    maxTimeout: 60 * 1000,
    maxLength: 10000
  },
  doneQueue: {
    suffix: '_done',
    maxLength: 10000
  }
};
```

*   `connection.socket` options will be passed through to the underlying `amqp.connect`
*   `connection.tuning` is an object that constructs the various RabbitMQ tuning query string params
*   `connection.retry` affects the connection retry attempts using the underlying [retry](https://github.com/tim-kos/node-retry) module
*   `connection.useExisting` will return an existing default connection upon invocation of `createConnection`, useful if you have many plugins but want to just use a single connection. Defaults to `false`.
*   `preserveChannels` will keep around publish and push channels, minimizing request overhead, but potentially causing [issues](https://github.com/squaremo/amqp.node/issues/144), though none I've been able to replicate
*   `retryQueue` settings for the retry queue, supporting limits and exponential backoff
*   `doneQueue` can write finished tasks to a final queue. Defaults to `false`, because it seems like an odd pattern. You're probably better off writing to your own db.

Additionally, all of the exposed methods take options that get passed to the underlying `amqplib` calls.

Usage
-----

Generally speaking, you only need to create a connection once, and that will be reused for all of your channel creation. You do have the option of creating multiple connections and passing those to the methods that create channels, if you need greater control.

Below are the easiest examples.

### PubSub

```js
import * as rmq from 'librabbitmq';

const subscriber = function (message) {
  return new Promise(() => {
    console.log(' [x] Received \'%s\'', message.payload);
  });
};

const testIt = async function () {
  await rmq.createConnection({
    url: 'amqp://localhost'
  });

  await rmq.addSubscriber({
    exchange: 'pubsub',
    subscriber
  });

  return rmq.publishMessage({
    exchange: 'pubsub',
    topic: 'request',
    payload: 'a message!'
  });
}

testIt();
```

### Task queue

```js
import * as rmq from 'librabbitmq';
const {ACK} = rmq.constants;

const worker = function (task) {
  const secs = 10;
  console.log(' [x] Received payload id: %s', task.properties.correlationId);
  console.log(' [x] Task takes %d seconds', secs);
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(' [x] Done');
      console.log(task.payload);
      resolve({code: ACK});
    }, secs * 1000);
  });
};

const testIt = async function () {
  await rmq.createConnection({
    url: 'amqp://localhost'
  });

  await rmq.addWorker({
    queue: 'work',
    worker
  });

  return rmq.pushTask({
    queue: 'work',
    type: 'foo',
    correlationId: '123'
    payload: request.payload
  });
}

testIt();
```

Retry
-----

This module implements a [retry queue with exponential backoff](https://felipeelias.github.io/rabbitmq/2016/02/22/rabbitmq-exponential-backoff.html) and is enabled by default for work queues. I've found this to be very useful in my projects, and is perhaps the best justification for using this library over amqplib directly.

Implementations
---------------

* [hapi-rabbitmq](https://github.com/mshick/hapi-rabbitmq)

Requirements
------------

*   node.js >= 6.0
*   RabbitMQ 3.6.11 (only version tested)

TODO
----

*   Handle queue assertion failures
*   Add real tests
*   Add fanout pattern
*   Add RPC pattern
