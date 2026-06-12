if (!global.__IPC_HANDLERS__) {
  global.__IPC_HANDLERS__ = new Map();
}

const mockIpcMain = {
  handle: (channel, handler) => {
    global.__IPC_HANDLERS__.set(channel, handler);
  },
};

module.exports = {
  ipcMain: mockIpcMain,
  app: {
    getPath: (name) => {
      if (!global.__TEST_USER_DATA__) {
        throw new Error("__TEST_USER_DATA__ not set");
      }
      return global.__TEST_USER_DATA__;
    },
  },
  BrowserWindow: class {},
  shell: {},
};
