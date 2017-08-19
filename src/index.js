import defaultsDeep from 'lodash/defaultsDeep';

import {ACK, NACK, REJECT, RETRY} from './constants';
import _createConnection from './create-connection';
import _closeConnection from './close-connection';
import _createChannel from './create-channel';
import _pushTask from './push-task';
import _addWorker from './add-worker';
import _publishMessage from './publish-message';
import _addSubscriber from './add-subscriber';
import _getChannelName from './get-channel-name';

const DEFAULTS = {
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
  doneQueue: false
};

const STATE = {
  _defaultConnection: null,
  _openConnections: {},
  _openChannels: {}
};

const setGlobals = globals => {
  globals.state = STATE;
  globals.options = defaultsDeep({}, globals.options, DEFAULTS);
};

/* Exports */

export const state = STATE;
export const constants = {ACK, NACK, REJECT, RETRY};

export const createConnection = async function (options, globals = {}) {
  setGlobals(globals);
  const settings = defaultsDeep({}, options, globals.options, DEFAULTS);
  return _createConnection(settings, globals);
};

export const closeConnection = async function (options, globals = {}) {
  setGlobals(globals);
  return _closeConnection(options, globals);
};

export const createChannel = async function (options, globals = {}) {
  setGlobals(globals);
  const settings = defaultsDeep({}, options, globals.options, DEFAULTS);
  return _createChannel(settings, globals);
};

export const pushTask = async function (args, globals = {}) {
  setGlobals(globals);
  return _pushTask(args, globals);
};

export const addWorker = async function (args, globals = {}) {
  setGlobals(globals);
  return _addWorker(args, globals);
};

export const publishMessage = async function (args, globals = {}) {
  setGlobals(globals);
  return _publishMessage(args, globals);
};

export const addSubscriber = async function (args, globals = {}) {
  setGlobals(globals);
  return _addSubscriber(args, globals);
};

export const getChannelName = async function (args, globals = {}) {
  setGlobals(globals);
  return _getChannelName(args, globals);
};
