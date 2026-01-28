import { app, Menu, shell, dialog, BrowserWindow } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'

const isMac = process.platform === 'darwin'

/**
 * Create and set the application menu
 *
 * Menu structure:
 * - macOS App Menu (Ancestree) - only on darwin
 * - File: New, Open, Save, Save As, Export, Quit/Close
 * - Edit: Undo, Redo, Cut, Copy, Paste, Select All
 * - View: Reload, Zoom controls, Fullscreen
 * - Help: About, Documentation, Website, Report Issue
 *
 * @param mainWindow - The main browser window for sending IPC events
 */
export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const template: MenuItemConstructorOptions[] = [
    // macOS App Menu (first item must be app name on darwin)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CommandOrControl+N',
          click: () => mainWindow.webContents.send('menu:new')
        },
        {
          label: 'Open...',
          accelerator: 'CommandOrControl+O',
          click: () => mainWindow.webContents.send('menu:open')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CommandOrControl+S',
          click: () => mainWindow.webContents.send('menu:save')
        },
        {
          label: 'Save As...',
          accelerator: 'CommandOrControl+Shift+S',
          click: () => mainWindow.webContents.send('menu:saveAs')
        },
        { type: 'separator' },
        {
          label: 'Export...',
          click: () => mainWindow.webContents.send('menu:export')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit Menu (use built-in roles for standard behavior)
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Help Menu
    {
      label: 'Help',
      submenu: [
        // About item for Windows/Linux (macOS uses app menu About)
        ...(!isMac
          ? [
              {
                label: 'About Ancestree',
                click: () => {
                  dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'About Ancestree',
                    message: 'Ancestree',
                    detail:
                      'A family tree visualization tool.\n\nVersion: 1.0.0\n\nVisualize and explore your family history through an interactive 3D experience.'
                  })
                }
              },
              { type: 'separator' as const }
            ]
          : []),
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://ancestree.app/docs')
        },
        {
          label: 'Visit Website',
          click: () => shell.openExternal('https://ancestree.app')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/ancestree/issues')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
