import {
  Menu,
  app,
  BrowserWindow,
  shell,
  type MenuItemConstructorOptions,
} from "electron";

export function setApplicationMenu(getWindow: () => BrowserWindow | null) {
  const isMac = process.platform === "darwin";

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Chat",
          accelerator: "CommandOrControl+N",
          click: () => {
            const win = getWindow();
            if (win) win.webContents.send("shortcut:new-chat");
          },
        },
        { type: "separator" },
        {
          label: "Export Data\u2026",
          accelerator: "CommandOrControl+E",
          click: () => {
            const win = getWindow();
            if (win) win.webContents.send("action:export-data");
          },
        },
        { type: "separator" },
        isMac
          ? ({ role: "close" } as const)
          : ({ role: "quit" } as const),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Find",
          accelerator: "CommandOrControl+F",
          click: () => {
            const win = getWindow();
            if (win) win.webContents.send("action:open-search");
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Sidebar",
          accelerator: "CommandOrControl+B",
          click: () => {
            const win = getWindow();
            if (win) win.webContents.send("shortcut:toggle-sidebar");
          },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? ([{ type: "separator" as const }, { role: "front" as const }] as const)
          : ([{ role: "close" as const }] as const)),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About llm Chatter",
          click: () => {
            const win = getWindow();
            if (win) win.webContents.send("action:open-about");
          },
        },
        {
          label: "Learn More",
          click: () => shell.openExternal("https://github.com/nethbotheju/llm-chatter"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
