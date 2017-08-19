import defaultsDeep from 'lodash/defaultsDeep';
import createChannel from './create-channel';
import getChannelName from './get-channel-name';
import workerConsumerFactory from './worker-consumer-factory';

const defaultChannelOptions = {
  prefetch: 1
};

const defaultQueueOptions = {
  durable: true,
  maxPriority: 0
};

const defaultWorkerOptions = {
  noAck: false
};

const defaultRetryQueueOptions = {
  durable: true,
  maxPriority: 10,
  maxLength: 10000
};

const defaultDoneQueueOptions = {
  durable: true,
  maxLength: 10000
};

const addWorker = async function (args, plugin) {
  try {
    const {connection, queue: queueName, worker, options} = args;
    const {options: pluginOptions, state: pluginState} = plugin;
    const {
      retryQueue: pluginRetryOptions,
      doneQueue: pluginDoneOptions
    } = pluginOptions;

    const {_openChannels} = pluginState;

    const {
      channelName: userChannelName,
      channelOptions,
      queueOptions,
      retryQueueOptions: userRetryQueueOptions,
      retryOptions: userRetryOptions,
      doneQueueOptions: userDoneQueueOptions,
      doneOptions: userDoneOptions,
      workerOptions
    } = options || {};

    const channelName = userChannelName || getChannelName({method: 'addWorker', queue: queueName});

    const rQueueOptions = defaultsDeep({}, userRetryQueueOptions, defaultRetryQueueOptions);
    const doneQueueOptions = defaultsDeep({}, userDoneQueueOptions, defaultDoneQueueOptions);

    let retryQueueOptions;
    let retryOptions;
    let doneOptions;

    if (pluginRetryOptions) {
      retryOptions = defaultsDeep({}, userRetryOptions, pluginRetryOptions);
    }

    if (pluginDoneOptions) {
      doneOptions = defaultsDeep({}, userDoneOptions, pluginDoneOptions);
    }

    let channel;

    if (_openChannels[channelName]) {
      channel = _openChannels[channelName].channel;
    } else {
      channel = await createChannel({
        name: channelName,
        options: defaultsDeep({}, channelOptions, defaultChannelOptions),
        persist: true,
        connection
      }, plugin);
    }

    const queuesAsserted = [];

    // Work queue assertion
    const wQueueOptions = defaultsDeep({}, queueOptions, defaultQueueOptions);
    const workQueue = channel.assertQueue(queueName, wQueueOptions);

    queuesAsserted.push(workQueue);

    // Retry queue assertion
    if (retryOptions && retryOptions.suffix) {
      const {suffix, maxLength} = retryOptions;
      const rQueueName = `${queueName}${suffix}`;

      retryQueueOptions = defaultsDeep({}, rQueueOptions, {
        maxLength,
        deadLetterExchange: '',
        deadLetterRoutingKey: queueName
      });

      const retryQueue = channel.assertQueue(rQueueName, retryQueueOptions);
      queuesAsserted.push(retryQueue);
    } else {
      queuesAsserted.push(Promise.resolve(null));
    }

    // Done queue assertion
    if (doneOptions && doneOptions.suffix) {
      const {suffix, maxLength} = doneOptions;
      const dQueueName = `${queueName}${suffix}`;

      const dQueueOptions = defaultsDeep({}, doneQueueOptions, {
        maxLength
      });

      const doneQueue = channel.assertQueue(dQueueName, dQueueOptions);
      queuesAsserted.push(doneQueue);
    } else {
      queuesAsserted.push(Promise.resolve(null));
    }

    const [queue, retryQueue, doneQueue] = await Promise.all(queuesAsserted);

    const consumer = workerConsumerFactory({
      channel,
      queue,
      worker,
      retryQueue,
      retryQueueOptions,
      retryOptions,
      doneQueue,
      doneOptions
    });

    const consumerOptions = defaultsDeep({}, workerOptions, defaultWorkerOptions);

    const consumed = channel.consume(
      queue.queue,
      consumer,
      consumerOptions
    );

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
