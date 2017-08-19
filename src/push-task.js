import defaultsDeep from 'lodash/defaultsDeep';
import createChannel from './create-channel';
import getChannelName from './get-channel-name';

const defaultQueueOptions = {
  durable: true,
  maxPriority: 0
};

const pushTask = async function (args, plugin) {
  const {connection, queue, payload, type, correlationId, options} = args;
  const {options: pluginOptions, state: pluginState} = plugin;
  const {preserveChannels, retry: retryOptions} = pluginOptions;
  const {_openChannels} = pluginState;

  const {
    channelName: userChannelName,
    channelOptions,
    queueOptions,
    taskOptions
  } = options || {};

  const channelName = userChannelName || getChannelName({method: 'pushTask', queue});

  const defaultTaskOptions = {
    persistent: true,
    priority: 0,
    contentType: 'application/json',
    contentEncoding: 'utf-8',
    headers: {
      'x-retry-count': retryOptions === false ? -1 : 0
    }
  };

  const mergedTaskOptions = defaultsDeep({}, taskOptions, defaultTaskOptions);

  if (type) {
    mergedTaskOptions.type = type;
  }

  if (correlationId) {
    mergedTaskOptions.correlationId = String(correlationId);
  }

  let activeChannel;

  if (_openChannels[channelName]) {
    activeChannel = _openChannels[channelName].channel;
  } else {
    activeChannel = await createChannel({
      name: channelName,
      options: channelOptions,
      connection
    }, plugin);
  }

  const activeQueue = await activeChannel.assertQueue(
    queue,
    defaultsDeep({}, queueOptions, defaultQueueOptions)
  );

  const queued = await activeChannel.sendToQueue(
    activeQueue.queue,
    new Buffer(JSON.stringify(payload), mergedTaskOptions.contentEncoding),
    mergedTaskOptions
  );

  if (!preserveChannels) {
    await activeChannel.close();
  }

  return {
    channel: activeChannel,
    queue: activeQueue,
    queued
  };
};

export default pushTask;
