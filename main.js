const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let mainWindow;
let currentDb = null;
let recentFiles = [];
const recentFilesPath = path.join(__dirname, 'recent-files.json');

function loadRecentFiles() {
    try {
        if (fs.existsSync(recentFilesPath)) {
            recentFiles = JSON.parse(fs.readFileSync(recentFilesPath, 'utf-8'));
        }
    } catch (e) {
        recentFiles = [];
    }
}

function saveRecentFiles() {
    try {
        fs.writeFileSync(recentFilesPath, JSON.stringify(recentFiles, null, 2));
    } catch (e) {
        console.error('Failed to save recent files:', e);
    }
}

function addRecentFile(filePath) {
    recentFiles = recentFiles.filter(f => f !== filePath);
    recentFiles.unshift(filePath);
    if (recentFiles.length > 10) {
        recentFiles = recentFiles.slice(0, 10);
    }
    saveRecentFiles();
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        titleBarStyle: 'default',
        backgroundColor: '#1e1e1e'
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        if (currentDb) {
            currentDb.close();
            currentDb = null;
        }
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    loadRecentFiles();
    createWindow();
    createMenu();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (currentDb) {
        currentDb.close();
        currentDb = null;
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function createMenu() {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '打开数据库',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => openDatabaseDialog()
                },
                {
                    label: '新建数据库',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => createDatabaseDialog()
                },
                {
                    label: '关闭数据库',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => closeDatabase(),
                    enabled: currentDb !== null
                },
                { type: 'separator' },
                {
                    label: '最近打开',
                    submenu: recentFiles.length > 0 ? 
                        recentFiles.map(f => ({
                            label: path.basename(f),
                            click: () => openDatabase(f)
                        })) : 
                        [{ label: '无', enabled: false }]
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: '重做', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
                { type: 'separator' },
                { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: '删除', accelerator: 'Delete', role: 'delete' },
                { type: 'separator' },
                { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
            ]
        },
        {
            label: '视图',
            submenu: [
                { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
                { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
                { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
                { type: 'separator' },
                { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
                { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
                { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
                { type: 'separator' },
                { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于 SQLite Viewer',
                            message: 'SQLite Viewer',
                            detail: '版本: 1.0.0\n一个功能强大的 SQLite 数据库查看器'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function openDatabaseDialog() {
    dialog.showOpenDialog(mainWindow, {
        title: '选择 SQLite 数据库文件',
        filters: [
            { name: 'SQLite 数据库', extensions: ['db', 'sqlite', 'sqlite3', 'db3'] },
            { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            openDatabase(result.filePaths[0]);
        }
    });
}

function createDatabaseDialog() {
    dialog.showSaveDialog(mainWindow, {
        title: '新建 SQLite 数据库',
        filters: [
            { name: 'SQLite 数据库', extensions: ['db', 'sqlite'] }
        ],
        defaultPath: 'new_database.db'
    }).then(result => {
        if (!result.canceled && result.filePath) {
            try {
                if (currentDb) {
                    currentDb.close();
                }
                currentDb = new Database(result.filePath);
                addRecentFile(result.filePath);
                createMenu();
                mainWindow.webContents.send('database-opened', {
                    path: result.filePath,
                    name: path.basename(result.filePath)
                });
            } catch (error) {
                dialog.showErrorBox('创建失败', error.message);
            }
        }
    });
}

function openDatabase(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            dialog.showErrorBox('文件不存在', `文件 ${filePath} 不存在`);
            return;
        }
        
        if (currentDb) {
            currentDb.close();
        }
        
        currentDb = new Database(filePath);
        addRecentFile(filePath);
        createMenu();
        mainWindow.webContents.send('database-opened', {
            path: filePath,
            name: path.basename(filePath)
        });
    } catch (error) {
        dialog.showErrorBox('打开失败', error.message);
    }
}

function closeDatabase() {
    if (currentDb) {
        currentDb.close();
        currentDb = null;
        createMenu();
        mainWindow.webContents.send('database-closed');
    }
}

ipcMain.handle('open-database', () => {
    openDatabaseDialog();
});

ipcMain.handle('close-database', () => {
    closeDatabase();
});

ipcMain.handle('get-database-info', () => {
    if (!currentDb) return null;
    
    try {
        const tables = currentDb.prepare(`
            SELECT name, type, sql 
            FROM sqlite_master 
            WHERE type IN ('table', 'view') 
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `).all();
        
        const indexes = currentDb.prepare(`
            SELECT name, tbl_name, sql 
            FROM sqlite_master 
            WHERE type = 'index' 
            AND name NOT LIKE 'sqlite_%'
            ORDER BY tbl_name, name
        `).all();
        
        const triggers = currentDb.prepare(`
            SELECT name, tbl_name, sql 
            FROM sqlite_master 
            WHERE type = 'trigger'
            ORDER BY tbl_name, name
        `).all();
        
        const fileStats = fs.statSync(currentDb.name);
        
        return {
            path: currentDb.name,
            name: path.basename(currentDb.name),
            size: fileStats.size,
            sizeFormatted: formatFileSize(fileStats.size),
            tables: tables,
            indexes: indexes,
            triggers: triggers
        };
    } catch (error) {
        console.error('Failed to get database info:', error);
        return null;
    }
});

ipcMain.handle('get-table-data', (event, tableName, options = {}) => {
    if (!currentDb) return { error: 'No database open' };
    
    try {
        const { page = 1, pageSize = 100, where = '', orderBy = '' } = options;
        
        const countSql = `SELECT COUNT(*) as count FROM "${tableName}"${where ? ` WHERE ${where}` : ''}`;
        const totalResult = currentDb.prepare(countSql).get();
        const total = totalResult ? totalResult.count : 0;
        
        let sql = `SELECT * FROM "${tableName}"`;
        if (where) sql += ` WHERE ${where}`;
        if (orderBy) sql += ` ORDER BY ${orderBy}`;
        sql += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
        
        const rows = currentDb.prepare(sql).all();
        
        const pragmaInfo = currentDb.prepare(`PRAGMA table_info("${tableName}")`).all();
        const columns = pragmaInfo.map(col => ({
            name: col.name,
            type: col.type,
            notNull: col.notnull === 1,
            defaultValue: col.dflt_value,
            isPrimaryKey: col.pk > 0
        }));
        
        return {
            columns,
            rows,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    } catch (error) {
        console.error('Failed to get table data:', error);
        return { error: error.message };
    }
});

ipcMain.handle('execute-sql', (event, sql) => {
    if (!currentDb) return { error: 'No database open' };
    
    try {
        const trimmedSql = sql.trim();
        
        if (trimmedSql.toUpperCase().startsWith('SELECT') || 
            trimmedSql.toUpperCase().startsWith('PRAGMA')) {
            const rows = currentDb.prepare(sql).all();
            return {
                success: true,
                type: 'query',
                data: rows,
                rowCount: rows.length
            };
        } else {
            const result = currentDb.exec(sql);
            return {
                success: true,
                type: 'exec',
                changes: currentDb.changes,
                lastInsertRowid: currentDb.lastInsertRowid
            };
        }
    } catch (error) {
        console.error('SQL execution error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-table-schema', (event, tableName) => {
    if (!currentDb) return { error: 'No database open' };
    
    try {
        const pragmaInfo = currentDb.prepare(`PRAGMA table_info("${tableName}")`).all();
        const createSql = currentDb.prepare(`
            SELECT sql FROM sqlite_master 
            WHERE type = 'table' AND name = ?
        `).get(tableName);
        
        const indexes = currentDb.prepare(`
            SELECT name, sql FROM sqlite_master 
            WHERE type = 'index' AND tbl_name = ?
            AND name NOT LIKE 'sqlite_%'
        `).all(tableName);
        
        const foreignKeys = currentDb.prepare(`PRAGMA foreign_key_list("${tableName}")`).all();
        
        return {
            columns: pragmaInfo.map(col => ({
                cid: col.cid,
                name: col.name,
                type: col.type,
                notNull: col.notnull === 1,
                defaultValue: col.dflt_value,
                isPrimaryKey: col.pk > 0
            })),
            createSql: createSql ? createSql.sql : null,
            indexes: indexes,
            foreignKeys: foreignKeys
        };
    } catch (error) {
        console.error('Failed to get table schema:', error);
        return { error: error.message };
    }
});

ipcMain.handle('export-to-csv', (event, tableName, filePath) => {
    if (!currentDb) return { error: 'No database open' };
    
    try {
        const result = currentDb.prepare(`SELECT * FROM "${tableName}"`).all();
        
        if (result.length === 0) {
            return { success: true, message: 'Table is empty' };
        }
        
        const headers = Object.keys(result[0]);
        let csvContent = headers.join(',') + '\n';
        
        for (const row of result) {
            const values = headers.map(h => {
                const val = row[h];
                if (val === null) return '';
                if (typeof val === 'string') {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            });
            csvContent += values.join(',') + '\n';
        }
        
        fs.writeFileSync(filePath, csvContent, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Export failed:', error);
        return { error: error.message };
    }
});

ipcMain.handle('show-save-dialog', (event, options) => {
    return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('get-recent-files', () => {
    return recentFiles;
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
