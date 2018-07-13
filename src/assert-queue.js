import { defaultsDeep } from 'lodash/fp';
import createChannel from './create-channel';
import getChannelName from './get-channel-name';

const defaultChannelOptions = {
  prefetch: 1
};

const defaultQueueOptions = {
  durable: true,
  maxPriority: 0
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

const assertQueue = async (args, plugin) => {
  const { connection, queue: queueName, options } = args;
  const { options: pluginOptions, state: pluginState } = plugin;
  const {
    retryQueue: pluginRetryOptions,
    doneQueue: pluginDoneOptions
  } = pluginOptions;

  const { _openChannels } = pluginState;

  const {
    channelName: userChannelName,
    channelOptions,
    queueOptions,
    retryQueueOptions: userRetryQueueOptions,
    retryOptions: userRetryOptions,
    doneQueueOptions: userDoneQueueOptions,
    doneOptions: userDoneOptions
  } =
    options || {};

  let channel;

  const channelName =
    userChannelName || getChannelName({ method: 'worker', queue: queueName });

  const rQueueOptions = defaultsDeep(
    defaultRetryQueueOptions,
    userRetryQueueOptions
  );
  const doneQueueOptions = defaultsDeep(
    defaultDoneQueueOptions,
    userDoneQueueOptions
  );

  let retryQueueOptions;
  let retryOptions;
  let doneOptions;

  if (pluginRetryOptions) {
    retryOptions = defaultsDeep(pluginRetryOptions, userRetryOptions);
  }

  if (pluginDoneOptions) {
    doneOptions = defaultsDeep(pluginDoneOptions, userDoneOptions);
  }

  if (_openChannels[channelName]) {
    channel = _openChannels[channelName].channel;
  } else {
    channel = await createChannel(
      {
        name: channelName,
        options: defaultsDeep(defaultChannelOptions, channelOptions),
        persist: true,
        connection
      },
      plugin
    );
  }

  const queuesAsserted = [];

  // Work queue assertion
  const wQueueOptions = defaultsDeep(defaultQueueOptions, queueOptions);
  const workQueue = channel.assertQueue(queueName, wQueueOptions);

  queuesAsserted.push(workQueue);

  // Retry queue assertion
  if (retryOptions && retryOptions.suffix) {
    const { suffix, maxLength } = retryOptions;
    const rQueueName = `${queueName}${suffix}`;

    retryQueueOptions = defaultsDeep(
      { maxLength, deadLetterExchange: '', deadLetterRoutingKey: queueName },
      rQueueOptions
    );

    const retryQueue = channel.assertQueue(rQueueName, retryQueueOptions);
    queuesAsserted.push(retryQueue);
  } else {
    queuesAsserted.push(Promise.resolve(null));
  }

  // Done queue assertion
  if (doneOptions && doneOptions.suffix) {
    const { suffix, maxLength } = doneOptions;
    const dQueueName = `${queueName}${suffix}`;

    const dQueueOptions = defaultsDeep({ maxLength }, doneQueueOptions);

    const doneQueue = channel.assertQueue(dQueueName, dQueueOptions);
    queuesAsserted.push(doneQueue);
  } else {
    queuesAsserted.push(Promise.resolve(null));
  }

  const [queue, retryQueue, doneQueue] = await Promise.all(queuesAsserted);

  return {
    channel,
    queue,
    retryQueue,
    retryQueueOptions,
    retryOptions,
    doneQueue,
    doneQueueOptions
  };
};

export default assertQueue;
