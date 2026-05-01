const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sqliteAPI', {
    openDatabase: () => ipcRenderer.invoke('open-database'),
    closeDatabase: () => ipcRenderer.invoke('close-database'),
    getDatabaseInfo: () => ipcRenderer.invoke('get-database-info'),
    getTableData: (tableName, options) => ipcRenderer.invoke('get-table-data', tableName, options),
    executeSql: (sql) => ipcRenderer.invoke('execute-sql', sql),
    getTableSchema: (tableName) => ipcRenderer.invoke('get-table-schema', tableName),
    exportToCsv: (tableName, filePath) => ipcRenderer.invoke('export-to-csv', tableName, filePath),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
    
    onDatabaseOpened: (callback) => {
        ipcRenderer.on('database-opened', (event, ...args) => callback(...args));
    },
    onDatabaseClosed: (callback) => {
        ipcRenderer.on('database-closed', (event, ...args) => callback(...args));
    }
});
