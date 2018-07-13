import assert from 'assert';

const getChannelName = function({ method, exchange, queue }) {
  assert(method, 'method is required');
  assert(exchange || queue, 'exchange or queue is required');

  const p1 = method;
  const p2 = exchange || queue;

  return `${p1}.${p2}`;
};

export default getChannelName;
