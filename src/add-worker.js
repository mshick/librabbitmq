import { defaultsDeep } from 'lodash/fp';
import assertQueue from './assert-queue';
import workerConsumerFactory from './worker-consumer-factory';

const defaultWorkerOptions = {
  noAck: false
};

const addWorker = async function(args, plugin) {
  const { worker, options } = args;
  const { workerOptions } = options || {};

  try {
    const { channel, queue, ...assertedQueue } = await assertQueue(
      args,
      plugin
    );

    const consumer = workerConsumerFactory({
      ...assertedQueue,
      channel,
      queue,
      worker
    });

    const consumerOptions = defaultsDeep(defaultWorkerOptions, workerOptions);
    const consumed = channel.consume(queue.queue, consumer, consumerOptions);

    return {
      channel,
      queue,
      consumed
    };
  } catch (error) {
    throw error;
  }
};

export default addWorker;
